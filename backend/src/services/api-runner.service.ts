import https from 'https';
import http from 'http';
import { URL } from 'url';
import type { ApiRequest, ApiEnvironment, ApiResponse, ApiRequestTest } from '../db/models';

function substituteVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function executeRequest(
  request: ApiRequest,
  env?: ApiEnvironment,
): Promise<ApiResponse> {
  const vars = env?.variables ?? {};
  const rawUrl = substituteVars(request.url, vars);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  const headers: Record<string, string> = {};
  for (const h of request.headers) {
    if (h.enabled && h.key) {
      headers[substituteVars(h.key, vars)] = substituteVars(h.value, vars);
    }
  }

  let bodyStr: string | undefined;
  if (request.bodyType !== 'none' && request.body) {
    bodyStr = substituteVars(request.body, vars);
    if (request.bodyType === 'json' && !headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = Date.now();

  const responseData = await new Promise<{ status: number; statusText: string; headers: Record<string, string>; body: string }>(
    (resolve, reject) => {
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: request.method,
        headers,
        timeout: 30000,
      };

      const req = lib.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const respHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            respHeaders[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            headers: respHeaders,
            body: data,
          });
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    },
  );

  const duration = Date.now() - startTime;
  const size = Buffer.byteLength(responseData.body, 'utf8');

  // Run inline test assertions
  const testResults = runTests(request.tests, responseData.status, responseData.headers, responseData.body);

  return {
    ...responseData,
    duration,
    size,
    testResults,
  };
}

function runTests(
  tests: ApiRequestTest[],
  status: number,
  headers: Record<string, string>,
  body: string,
): ApiResponse['testResults'] {
  return tests.map(t => {
    try {
      switch (t.type) {
        case 'assertStatus':
          return { id: t.id, name: t.name, passed: String(status) === String(t.value), message: `Expected status ${t.value}, got ${status}` };
        case 'assertBodyContains':
          return { id: t.id, name: t.name, passed: body.includes(t.value), message: `Body does not contain "${t.value}"` };
        case 'assertBodyField': {
          let parsed: any;
          try { parsed = JSON.parse(body); } catch { return { id: t.id, name: t.name, passed: false, message: 'Body is not valid JSON' }; }
          const actual = getNestedValue(parsed, t.field ?? '');
          return { id: t.id, name: t.name, passed: String(actual) === String(t.value), message: `Expected "${t.field}" = "${t.value}", got "${actual}"` };
        }
        case 'assertHeader': {
          const val = headers[t.field?.toLowerCase() ?? ''] ?? headers[t.field ?? ''];
          return { id: t.id, name: t.name, passed: val?.includes(t.value) ?? false, message: `Header "${t.field}" does not contain "${t.value}"` };
        }
        default:
          return { id: t.id, name: t.name, passed: false, message: 'Unknown test type' };
      }
    } catch (err: any) {
      return { id: t.id, name: t.name, passed: false, message: err.message };
    }
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

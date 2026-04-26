"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../db/database");
const codegen_service_1 = require("../services/codegen.service");
const router = (0, express_1.Router)();
const sessions = new Map();
const RECORDINGS_DIR = path_1.default.join(database_1.DATA_DIR, 'recordings');
// Resolve the playwright CLI binary from node_modules – avoids shell: true entirely.
const BACKEND_DIR = path_1.default.resolve(__dirname, '../..');
function findPlaywrightBin() {
    const candidates = [
        path_1.default.join(BACKEND_DIR, 'node_modules', '.bin', 'playwright'),
        path_1.default.join(BACKEND_DIR, '..', 'node_modules', '.bin', 'playwright'),
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(c))
            return c;
    }
    console.warn('[recorder] playwright bin not found in node_modules, falling back to PATH');
    return 'playwright';
}
const PLAYWRIGHT_BIN = findPlaywrightBin();
console.log(`[recorder] Using playwright binary: ${PLAYWRIGHT_BIN}`);
// POST /api/recorder/start
router.post('/start', (req, res) => {
    const { url } = req.body;
    if (!url)
        return res.status(400).json({ error: 'url is required' });
    if (!fs_1.default.existsSync(RECORDINGS_DIR)) {
        fs_1.default.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
    const id = (0, uuid_1.v4)();
    const outputPath = path_1.default.join(RECORDINGS_DIR, `${id}.js`);
    const session = {
        id,
        url,
        status: 'recording',
        outputPath,
        startedAt: new Date().toISOString(),
    };
    // Spawn playwright codegen with shell: false — no concatenation, no DEP0190
    const proc = (0, child_process_1.spawn)(PLAYWRIGHT_BIN, ['codegen', '--output', outputPath, url], {
        cwd: BACKEND_DIR,
        shell: false, // ← key fix: no shell, no DEP0190
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
    });
    const stderrLines = [];
    proc.stdout?.on('data', (data) => {
        console.log(`[recorder:${id}] stdout:`, data.toString().trim());
    });
    proc.stderr?.on('data', (data) => {
        const text = data.toString().trim();
        stderrLines.push(text);
        console.log(`[recorder:${id}] stderr:`, text);
    });
    // Fires if the binary can't be found or fails to start at all
    proc.on('error', (err) => {
        console.error(`[recorder:${id}] process error:`, err.message);
        const entry = sessions.get(id);
        if (entry) {
            entry.session.status = 'error';
            entry.session.errorMessage = err.message;
        }
    });
    proc.on('exit', (code, signal) => {
        console.log(`[recorder:${id}] process exited code=${code} signal=${signal}`);
        const entry = sessions.get(id);
        if (!entry)
            return;
        if (entry.session.status === 'recording') {
            // Exited on its own (user closed the browser window)
            entry.session.status = 'stopped';
            entry.session.stoppedAt = new Date().toISOString();
            // Try to parse whatever was written
            if (fs_1.default.existsSync(outputPath)) {
                try {
                    const code = fs_1.default.readFileSync(outputPath, 'utf-8');
                    entry.session.recordedSteps = (0, codegen_service_1.parseCodegenOutput)(code);
                }
                catch { /* ignore */ }
            }
        }
        if (code !== 0 && code !== null && entry.session.status !== 'stopped') {
            entry.session.status = 'error';
            entry.session.errorMessage = stderrLines.slice(-5).join('\n') || `Process exited with code ${code}`;
        }
    });
    sessions.set(id, { session, proc });
    return res.status(201).json(session);
});
// POST /api/recorder/:id/stop
router.post('/:id/stop', (req, res) => {
    const entry = sessions.get(req.params.id);
    if (!entry)
        return res.status(404).json({ error: 'Session not found' });
    const { session, proc } = entry;
    if (proc && !proc.killed) {
        try {
            proc.kill('SIGTERM');
            setTimeout(() => {
                try {
                    if (!proc.killed)
                        proc.kill('SIGKILL');
                }
                catch { /* ignore */ }
            }, 2000);
        }
        catch { /* ignore */ }
    }
    session.status = 'stopped';
    session.stoppedAt = new Date().toISOString();
    let recordedSteps = session.recordedSteps ?? [];
    if (fs_1.default.existsSync(session.outputPath)) {
        try {
            const code = fs_1.default.readFileSync(session.outputPath, 'utf-8');
            recordedSteps = (0, codegen_service_1.parseCodegenOutput)(code);
            session.recordedSteps = recordedSteps;
        }
        catch { /* parsing failed */ }
    }
    return res.json({ session, steps: recordedSteps });
});
// GET /api/recorder/:id — returns current session state including errors
router.get('/:id', (req, res) => {
    const entry = sessions.get(req.params.id);
    if (!entry)
        return res.status(404).json({ error: 'Session not found' });
    return res.json(entry.session);
});
// GET /api/recorder/:id/steps
router.get('/:id/steps', (req, res) => {
    const entry = sessions.get(req.params.id);
    if (!entry)
        return res.status(404).json({ error: 'Session not found' });
    // Always include current session status so the UI can detect errors
    if (!fs_1.default.existsSync(entry.session.outputPath)) {
        return res.json({ steps: [], status: entry.session.status, error: entry.session.errorMessage });
    }
    try {
        const code = fs_1.default.readFileSync(entry.session.outputPath, 'utf-8');
        return res.json({
            steps: (0, codegen_service_1.parseCodegenOutput)(code),
            rawCode: code,
            status: entry.session.status,
        });
    }
    catch {
        return res.json({ steps: [], status: entry.session.status });
    }
});
// DELETE /api/recorder/:id
router.delete('/:id', (req, res) => {
    const entry = sessions.get(req.params.id);
    if (!entry)
        return res.status(404).json({ error: 'Session not found' });
    const { proc, session } = entry;
    if (proc && !proc.killed) {
        try {
            proc.kill('SIGKILL');
        }
        catch { /* ignore */ }
    }
    try {
        if (fs_1.default.existsSync(session.outputPath))
            fs_1.default.unlinkSync(session.outputPath);
    }
    catch { /* ignore */ }
    sessions.delete(req.params.id);
    return res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=recorder.js.map
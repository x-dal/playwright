import type { TestSuite, TestRun } from '../db/models';
export declare function runSuite(suite: TestSuite, onProgress: (run: TestRun) => void, signal?: AbortSignal, runOptions?: {
    testId?: string;
    preview?: boolean;
}): Promise<TestRun>;
//# sourceMappingURL=playwright.service.d.ts.map
import type { Step, TestSuite, Test } from '../db/models';
export declare function generateSuiteCode(suite: TestSuite): string;
export declare function generateTestCode(test: Test, suite: TestSuite): string;
export declare function parseCodegenOutput(code: string): Step[];
//# sourceMappingURL=codegen.service.d.ts.map
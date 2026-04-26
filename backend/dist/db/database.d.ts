import Database from 'better-sqlite3';
import type { TestSuite, TestRun } from './models';
declare const DATA_DIR: string;
declare const ARTIFACTS_DIR: string;
export declare function ensureDirectories(): void;
export declare function getDb(): Database.Database;
export declare function getAllSuites(): TestSuite[];
export declare function getSuiteById(id: string): TestSuite | undefined;
export declare function upsertSuite(suite: TestSuite): void;
export declare function deleteSuite(id: string): void;
export declare function getAllRuns(suiteId?: string): TestRun[];
export declare function getRunById(id: string): TestRun | undefined;
export declare function upsertRun(run: TestRun): void;
export { ARTIFACTS_DIR, DATA_DIR };
//# sourceMappingURL=database.d.ts.map
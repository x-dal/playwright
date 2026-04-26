import type { Step } from '../db/models';
export interface RecorderHandle {
    getSteps(): Step[];
    stop(): Promise<Step[]>;
}
export declare function startCustomRecorder(url: string, onStep: (steps: Step[]) => void): Promise<RecorderHandle>;
//# sourceMappingURL=recorder-service.d.ts.map
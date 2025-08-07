
export interface INotificationInfo {
    name: string;
    started: boolean;
    completed: boolean;
    failed: boolean;
    skipped: boolean;
    minimized: boolean;
    error: any;
    size: number;
    index: number;
    estimate: number;
    progress: number;
    message: string;
    startDate: number;
    stopDate: number;
    steps: INotificationInfo[];
    timestamp?: number;
    action?: string;
}

import { INotificationInfo } from './notification-info.interface.js';

export interface INotificationStep {
    start(): INotificationStep;
    complete(): INotificationStep;
    fail(error: string | Error, code?: string | number): INotificationStep;
    skip(): INotificationStep;
    setEstimate(estimate: number): INotificationStep;
    addEstimate(estimate: number): INotificationStep;
    addStep(name: string, size?: number, minimized?: boolean): INotificationStep;
    getStep(name: string): INotificationStep;
    startStep(name: string): INotificationStep;
    completeStep(name: string): INotificationStep;
    skipStep(name: string): INotificationStep;
    failStep(name: string, error: string | Error, code?: string | number): INotificationStep;
    info(): INotificationInfo;
    setId(id: string): INotificationStep;
    getStepById(id: string): INotificationStep;
    minimize(value: boolean): INotificationStep;
}

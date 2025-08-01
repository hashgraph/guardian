import { INotificationInfo } from './notification-info.interface.js';
import { INotificationStep } from './notification-step.interface.js';

export class EmptyNotifier implements INotificationStep {
    public readonly name: string = 'empty';

    public minimize(value: boolean): INotificationStep {
        return this;
    }

    public setEstimate(estimate: number | string[]): EmptyNotifier {
        return this;
    }

    public addEstimate(estimate: number): EmptyNotifier {
        return this;
    }

    public start(): EmptyNotifier {
        return this;
    }

    public complete(): EmptyNotifier {
        return this;
    }

    public skip(): EmptyNotifier {
        return this;
    }

    public result(result: any): EmptyNotifier {
        return this;
    }

    public fail(
        error: string | Error,
        code?: string | number
    ): EmptyNotifier {
        return this;
    }

    public startStep(name: string): EmptyNotifier {
        return this;
    }

    public completeStep(name: string): EmptyNotifier {
        return this;
    }

    public skipStep(name: string): EmptyNotifier {
        return this;
    }

    public failStep(
        name: string,
        error: string | Error,
        code?: string | number
    ): EmptyNotifier {
        return this;
    }

    public addStep(name: string, size: number = 1): EmptyNotifier {
        return this;
    }

    public getStep(name: string): EmptyNotifier | null {
        return this;
    }

    public info(): INotificationInfo {
        return {
            name: this.name,
            started: false,
            completed: false,
            failed: false,
            skipped: false,
            error: null,
            size: -1,
            estimate: -1,
            steps: [],
            startDate: null,
            stopDate: null,
            minimized: false,
            index: -1,
            progress: 0,
            message: ''
        };
    }

    public sendStatus(): void {
        return;
    }

    public sendError(error: {
        code: string | number;
        message: string;
    }): void {
        return;
    }

    public sendResult(result: any): void {
        return;
    }

    public setId(id: string): INotificationStep {
        return this;
    }

    public getStepById(id: string): INotificationStep {
        return this;
    }

    public findStepById(id: string) {
        return this;
    }
}

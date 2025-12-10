import { INotificationInfo } from './notification-info.interface.js';
import { INotificationStep } from './notification-step.interface.js';
import { NewNotifier } from './notifier.js';

export class NotificationStep implements INotificationStep {
    public readonly name: string;
    public readonly size: number;

    public started: boolean = false;
    public completed: boolean = false;
    public failed: boolean = false;
    public skipped: boolean = false;
    public estimate: number = 0;
    public error: {
        code: string | number;
        message: string;
    };
    public startDate: number;
    public stopDate: number;
    public id: string;
    public minimized: boolean;

    private readonly steps: NotificationStep[];
    private notify: NewNotifier;

    constructor(name: string, size: number) {
        this.name = name;
        this.size = size;
        this.started = false;
        this.completed = false;
        this.failed = false;
        this.steps = [];
        this.estimate = 0;
        this.minimized = false;
    }

    public minimize(value: boolean): INotificationStep {
        this.minimized = value;
        return this;
    }

    public setEstimate(estimate: number): NotificationStep {
        this.estimate = estimate;
        return this;
    }

    public addEstimate(estimate: number): NotificationStep {
        this.estimate = this.steps.length + estimate;
        return this;
    }

    public setParent(notify: NewNotifier) {
        this.notify = notify;
    }

    public start(): NotificationStep {
        this.startDate = Date.now();
        this.started = true;
        this.notify?.sendStatus('Start: ' + this.name);
        return this;
    }

    public complete(): NotificationStep {
        this.stopDate = Date.now();
        this.completed = true;
        this.failed = false;
        this.notify?.sendStatus('Complete: ' + this.name);
        return this;
    }

    public skip(): NotificationStep {
        this.stopDate = Date.now();
        if (this.completed || this.failed) {
            this.completed = true;
            this.failed = this.failed;
            this.skipped = false;
        } else {
            this.completed = true;
            this.failed = false;
            this.skipped = true;
        }
        this.notify?.sendStatus('Skip: ' + this.name);
        return this;
    }

    public fail(
        error: string | Error,
        code?: string | number
    ): NotificationStep {
        this.error = {
            code: code || 500,
            message: null,
        };
        if (typeof error === 'string') {
            this.error.message = error;
        } else {
            if (error.message) {
                this.error.message = error.message;
            } else if (error.stack) {
                this.error.message = error.stack;
            } else {
                this.error.message = 'Unknown error';
            }
        }

        this.stopDate = Date.now();
        this.completed = true;
        this.failed = true;
        this.notify?.sendError(this.error);
        return this;
    }

    public startStep(name: string): NotificationStep {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.start();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return step;
    }

    public completeStep(name: string): NotificationStep {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.complete();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return step;
    }

    public skipStep(name: string): NotificationStep {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.skip();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return step;
    }

    public failStep(
        name: string,
        error: string | Error,
        code?: string | number
    ): NotificationStep {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.fail(error, code);
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return step;
    }

    public addStep(
        name: string,
        size: number = 1,
        minimized: boolean = false
    ): NotificationStep {
        const step = new NotificationStep(name, size);
        step.minimize(minimized);
        step.setParent(this.notify);
        this.steps.push(step);
        return step;
    }

    public getStep(name: string): NotificationStep | null {
        return this.steps.find((s) => s.name === name);
    }

    public info(): INotificationInfo {
        const steps = this.steps.map((s) => s.info());
        const info = {
            name: this.name,
            started: this.started,
            completed: this.completed,
            failed: this.failed,
            skipped: this.skipped,
            error: this.error,
            size: this.size,
            estimate: Math.max(steps.length, this.estimate),
            steps: this.minimized ? [] : steps,
            startDate: this.startDate,
            stopDate: this.stopDate,
            minimized: this.minimized,
            index: -1,
            progress: -1,
            message: ''
        };

        if (this.completed || this.skipped) {
            info.progress = 100;
            info.index = info.estimate;
            info.message = this.name;
        } else if (this.failed) {
            info.progress = 0;
            info.index = info.estimate;
            info.message = this.error?.message;
        } else if (this.started) {
            info.index = 0;
            info.message = this.name;

            let total: number = 0;
            let completed: number = 0;
            for (let index = 0; index < info.estimate; index++) {
                const step = steps[index];
                if (step) {
                    total = total + step.size;
                    if (step.started) {
                        info.message = step.name;
                    }
                    if (step.started) {
                        info.index = index;
                    }
                    completed = completed + ((step.size * step.progress) / 100);
                } else {
                    total = total + 1;
                }
            }
            if (total === 0) {
                info.progress = 0;
            } else {
                info.progress = Math.round((completed / total) * 100);
            }
        } else {
            info.progress = 0;
            info.index = 0;
            info.message = '';
        }
        return info;
    }

    public setId(id: string): INotificationStep {
        this.id = id;
        return this;
    }

    public getStepById(id: string): INotificationStep {
        return this.notify?.getStepById(id);
    }

    public findStepById(id: string) {
        if (this.id === id) {
            return this;
        }
        if (Array.isArray(this.steps)) {
            for (const step of this.steps) {
                const result = step.findStepById(id);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
}

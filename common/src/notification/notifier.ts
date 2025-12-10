import { TaskAction } from '@guardian/interfaces';
import { INotificationInfo } from './notification-info.interface.js';
import { INotificationStep } from './notification-step.interface.js';
import { NotificationStep } from './notification-step.js';
import { NotificationEvents } from './notification-events.js';
import { EmptyNotifier } from './empty-notifier.js';

export class NewNotifier implements INotificationStep {
    public readonly name: string;
    public started: boolean = false;
    public completed: boolean = false;
    public failed: boolean = false;
    public skipped: boolean = false;
    public minimized: boolean = false;
    public estimate: number = 0;
    public error: {
        code: string | number;
        message: string;
    };
    public startDate: number;
    public stopDate: number;
    public id: string;

    private readonly helper: NotificationEvents | null;
    private readonly steps: NotificationStep[];

    private constructor(name: string, helper: NotificationEvents | null) {
        this.name = name;
        this.helper = helper;
        this.steps = [];
    }

    public static async create(options: {
        taskId: string;
        userId: string;
        action: TaskAction;
    }): Promise<NewNotifier> {
        const helper = new NotificationEvents(options);
        await helper.init();
        return new NewNotifier(options.action, helper);
    }

    public static empty(): EmptyNotifier {
        return new EmptyNotifier();
    }

    public minimize(value: boolean): INotificationStep {
        this.minimized = value;
        return this;
    }

    public setEstimate(estimate: number | string[]): NewNotifier {
        if (Array.isArray(estimate)) {
            this.estimate = estimate.length;
        } else {
            this.estimate = estimate;
        }
        return this;
    }

    public addEstimate(estimate: number): NewNotifier {
        this.estimate = this.steps.length + estimate;
        return this;
    }

    public start(): NewNotifier {
        this.startDate = Date.now();
        this.started = true;
        this.sendStatus('Start');
        return this;
    }

    public complete(): NewNotifier {
        this.stopDate = Date.now();
        this.completed = true;
        this.failed = false;
        this.sendStatus('Complete');
        return this;
    }

    public skip(): NewNotifier {
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
        this.sendStatus('Skip');
        return this;
    }

    public result(result: any): NewNotifier {
        this.completed = true;
        this.failed = false;
        this.sendResult(result);
        return this;
    }

    public fail(
        error: string | Error,
        code?: string | number
    ): NewNotifier {
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
        this.sendError(this.error);
        return this;
    }

    public startStep(name: string): NewNotifier {
        const step = this.getStep(name);
        if (step) {
            step.start();
        } else {
            console.error(`Step ${name} not found`);
        }
        return this;
    }

    public completeStep(name: string): NewNotifier {
        const step = this.getStep(name);
        if (step) {
            step.complete();
        } else {
            console.error(`Step ${name} not found`);
        }
        return this;
    }

    public skipStep(name: string): NewNotifier {
        const step = this.getStep(name);
        if (step) {
            step.skip();
        } else {
            console.error(`Step ${name} not found`);
        }
        return this;
    }

    public failStep(
        name: string,
        error: string | Error,
        code?: string | number
    ): NewNotifier {
        const step = this.getStep(name);
        if (step) {
            step.fail(error, code);
        } else {
            console.error(`Step ${name} not found`);
        }
        return this;
    }

    public addStep(
        name: string,
        size: number = 1,
        minimized: boolean = false
    ): NotificationStep {
        const step = new NotificationStep(name, size);
        step.minimize(minimized);
        step.setParent(this);
        this.steps.push(step);
        return step;
    }

    public getStep(name: string): NotificationStep | null {
        return this.steps.find((s) => s.name === name);
    }

    public info(): INotificationInfo {
        const info = {
            name: this.name,
            started: this.started,
            completed: this.completed,
            failed: this.failed,
            skipped: this.skipped,
            error: this.error,
            size: 1,
            estimate: Math.max(this.steps.length, this.estimate),
            steps: this.steps.map((s) => s.info()),
            startDate: this.startDate,
            stopDate: this.stopDate,
            minimized: this.minimized,
            index: -1,
            progress: -1,
            message: '',
            timestamp: Date.now()
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
                const step = info.steps[index];
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

    public sendStatus(action: string): void {
        const info = this.info();
        info.action = action;
        this.helper?.sendStatus(info);
    }

    public sendError(error: {
        code: string | number;
        message: string;
    }): void {
        this.helper?.sendError(error);
    }

    public sendResult(result: any): void {
        this.helper?.sendResult(result);
    }

    public setId(id: string): INotificationStep {
        this.id = id;
        return this;
    }

    public getStepById(id: string): INotificationStep {
        return this.findStepById(id);
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
        return NewNotifier.empty();
    }
}

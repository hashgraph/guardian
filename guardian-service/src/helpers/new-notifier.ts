import { NotificationHelper } from '@guardian/common';
import { MessageAPI, StatusType, TaskAction, } from '@guardian/interfaces';
import { GuardiansService } from './guardians.js';
import {
    getNotificationResult,
    getNotificationResultMessage,
    getNotificationResultTitle,
    getTaskResult,
    notificationActionMap
} from './notifier.js';

export interface INotificationStep {
    start(): INotificationStep;
    complete(): INotificationStep;
    fail(error: string | Error, code?: string | number): INotificationStep;
    skip(): INotificationStep;
    setEstimate(estimate: number): INotificationStep;
    addEstimate(estimate: number): INotificationStep;
    addStep(name: string, size?: number): INotificationStep;
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
    steps: INotificationInfo[]
}

export class NotificationStep implements INotificationStep {
    public readonly name: string;
    public readonly size: number;

    public started: boolean = false;
    public completed: boolean = false;
    public failed: boolean = false;
    public skipped: boolean = false;
    public estimate: number = 0;
    public error: {
        code: string | number,
        message: string
    };
    public startDate: number;
    public stopDate: number;
    public id: string;
    public minimized: boolean;

    private steps: NotificationStep[];
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
        this.notify?.sendStatus();
        return this;
    }

    public complete(): NotificationStep {
        this.stopDate = Date.now();
        this.completed = true;
        this.failed = false;
        this.notify?.sendStatus();
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
        this.notify?.sendStatus();
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

    public addStep(name: string, size: number = 1): NotificationStep {
        const step = new NotificationStep(name, size);
        step.setParent(this.notify);
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
            size: this.size,
            estimate: Math.max(this.steps.length, this.estimate),
            steps: this.steps.map((s) => s.info()),
            startDate: this.startDate,
            stopDate: this.stopDate,
            minimized: this.minimized,
            index: -1,
            progress: -1,
            message: ''
        }
        if (this.completed || this.skipped) {
            info.progress = 100;
            info.index = info.estimate;
            info.message = this.name;
        } else if (this.failed) {
            info.progress = 100;
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
                    info.index = info.index + 1;
                    completed = completed + Math.round((step.size * step.progress) / 100);
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

export class NotifierHelper {
    public readonly taskId: string;
    public readonly userId: string;
    public readonly action: TaskAction;

    private notify: NotificationHelper;
    private guardiansService: GuardiansService;

    constructor(options: {
        taskId: string;
        userId: string;
        action: TaskAction;
    }) {
        this.taskId = options.taskId;
        this.userId = options.userId;
        this.action = options.action;
        this.notify = null;
        this.guardiansService = null;
    }

    public async init(): Promise<void> {
        const notificationHelper = NotificationHelper.init([this.userId]);
        this.notify = await notificationHelper.progress(this.action, 'Operation started', this.taskId);
        this.guardiansService = new GuardiansService();
    }

    public sendStatus(info: INotificationInfo): void {
        this.notify.step(info.message, info.progress);
        this.guardiansService.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            info,
            statuses: [{
                type: StatusType.PROCESSING,
                message: info.message,
            }],
        });
    }

    public sendError(error: {
        code: string | number,
        message: string
    }): void {
        this.notify.stop({
            title: this.action,
            message: error.message
        });
        this.guardiansService.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            error: error,
        });
    }

    public sendResult(result: any): void {
        const resultTitle = getNotificationResultTitle(this.action, result);
        if (resultTitle) {
            this.notify.finish({
                title: resultTitle,
                action: notificationActionMap.get(this.action),
                message: getNotificationResultMessage(this.action, result),
                result: getNotificationResult(this.action, result),
            });
        } else {
            this.notify.finish(null);
        }
        this.guardiansService.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            result: getTaskResult(this.action, result),
        });
    }
}

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

    private readonly helper: NotifierHelper | null;
    private readonly steps: NotificationStep[];

    private constructor(name: string, helper: NotifierHelper | null) {
        this.name = name;
        this.helper = helper;
        this.steps = [];
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
        this.sendStatus();
        return this;
    }

    public complete(): NewNotifier {
        this.stopDate = Date.now();
        this.completed = true;
        this.failed = false;
        this.sendStatus();
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
        this.sendStatus();
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
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.start();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return this;
    }

    public completeStep(name: string): NewNotifier {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.complete();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return this;
    }

    public skipStep(name: string): NewNotifier {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.skip();
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return this;
    }

    public failStep(
        name: string,
        error: string | Error,
        code?: string | number
    ): NewNotifier {
        const step = this.steps.find((s) => s.name === name);
        if (step) {
            step.fail(error, code);
        } else {
            throw new Error(`Step ${name} not found`);
        }
        return this;
    }

    public addStep(name: string, size: number = 1): NotificationStep {
        const step = new NotificationStep(name, size);
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
            message: ''
        };
        if (this.completed || this.skipped) {
            info.progress = 100;
            info.index = info.estimate;
            info.message = this.name;
        } else if (this.failed) {
            info.progress = 100;
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
                    info.index = info.index + 1;
                    completed = completed + Math.round((step.size * step.progress) / 100);
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

    public sendStatus(): void {
        const info = this.info();
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

    public static async create(options: {
        taskId: string;
        userId: string;
        action: TaskAction;
    }): Promise<NewNotifier> {
        const helper = new NotifierHelper(options);
        await helper.init();
        return new NewNotifier(options.action, helper);
    }

    public static empty(): NewNotifier {
        return new NewNotifier('empty', null);
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

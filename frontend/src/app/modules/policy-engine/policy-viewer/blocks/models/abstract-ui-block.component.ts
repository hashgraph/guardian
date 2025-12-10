import { HttpErrorResponse } from "@angular/common/http";
import { IUser } from "@guardian/interfaces";
import { Subscription, Observable, of } from "rxjs";
import { PolicyEngineService } from "src/app/services/policy-engine.service";
import { ProfileService } from "src/app/services/profile.service";
import { WebSocketService } from "src/app/services/web-socket.service";
import { Directive, Input } from '@angular/core';

@Directive()
export abstract class AbstractUIBlockComponent<T> {
    public id!: string;
    public policyId!: string;
    public static!: T;
    public user!: IUser;
    public loading: boolean = true;
    public socket: Subscription;

    @Input('savepointIds') savepointIds?: string[] | null = null;

    constructor(
        protected policyEngineService: PolicyEngineService,
        protected profile: ProfileService,
        protected wsService: WebSocketService
    ) {
    }

    protected init() {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.profile.getProfile().subscribe((user: IUser) => {
            this.user = user;
            this.loadData();
        });
    }

    protected destroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    protected onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    protected loadData() {
        this.loading = true;
        this._getData().subscribe(this._onSuccess.bind(this), this._onError.bind(this));
    }

    protected _getData(): Observable<T> {
        if (this.static) {
            return of(this.static);
        } else {
            return this.policyEngineService.getBlockData<T>(this.id, this.policyId, this.savepointIds);
        }
    }

    protected _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    protected _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    abstract setData(data: any | null): void;
}

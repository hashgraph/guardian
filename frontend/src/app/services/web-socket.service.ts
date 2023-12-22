import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, of } from 'rxjs';
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { ApplicationStates, MessageAPI, NotifyAPI, UserRole } from '@guardian/interfaces';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import {
    ServiceUnavailableDialog
} from '../modules/schema-engine/service-unavailable-dialog/service-unavailable-dialog.component';

interface MeecoVerifyVPResponse {
    vc: any;
    presentation_request_id: string;
    submission_id: string;
    cid: string;
    role: UserRole | null;
}

interface MeecoApproveSubmissionResponse {
    username: string;
    did: string;
    role: UserRole;
    accessToken: string;
}

/**
 *  WebSocket service.
 */
@Injectable()
export class WebSocketService {
    private static HEARTBEAT_DELAY = 30 * 1000;
    private socket: WebSocketSubject<string> | null;
    private wsSubjectConfig: WebSocketSubjectConfig<string>;
    private socketSubscription: Subscription | null = null;
    private heartbeatTimeout: any = null;
    private reconnectInterval: number = 5000;  /// pause between connections
    private reconnectAttempts: number = 10;  /// number of connection attempts
    private servicesReady: Subject<boolean>;
    private profileSubject: Subject<{ type: string, data: any }>;
    private blockUpdateSubject: Subject<any>;
    private userInfoUpdateSubject: Subject<any>;
    private taskStatusSubject: Subject<any>;
    private updateNotification: Subject<any>;
    private deleteNotification: Subject<any>;
    private createProgress: Subject<any>;
    private updateProgress: Subject<any>;
    private deleteProgress: Subject<any>;
    private meecoPresentVPSubject: Subject<any> = new Subject();
    private meecoVerifyVPSubject: Subject<any> = new Subject();
    private meecoVerifyVPFailedSubject: Subject<any> = new Subject();
    private meecoApproveVCSubject: Subject<any> = new Subject();
    private serviesStates: any = [];
    private sendingEvent: boolean;

    private requiredServicesWrongStatus: boolean = false;

    public readonly meecoPresentVP$: Observable<any> = this.meecoPresentVPSubject.asObservable();
    public readonly meecoVerifyVP$: Observable<any> = this.meecoVerifyVPSubject.asObservable();
    public readonly meecoVerifyVPFailed$: Observable<any> = this.meecoVerifyVPFailedSubject.asObservable();

    constructor(private dialogService: DialogService, private auth: AuthService, private toastr: ToastrService, private router: Router) {
        this.blockUpdateSubject = new Subject();
        this.userInfoUpdateSubject = new Subject();
        this.servicesReady = new Subject();
        this.profileSubject = new Subject();
        this.taskStatusSubject = new Subject();
        this.updateNotification = new Subject();
        this.deleteNotification = new Subject();
        this.createProgress = new Subject();
        this.updateProgress = new Subject();
        this.deleteProgress = new Subject();
        this.socket = null;
        this.sendingEvent = false;

        this.socketSubscription = null;
        this.wsSubjectConfig = {
            url: this.getUrl(),
            deserializer: (e) => {
                this.sendingEvent = true;
                return e.data;
            },
            serializer: (value) => {
                return value;
            },
            closeObserver: {
                next: this.closeWebSocket.bind(this)
            },
            openObserver: {
                next: this.openWebSocket.bind(this)
            }
        };

        this.auth.subscribe(() => {
            this.reconnectAttempts = 10;
            this.send(MessageAPI.SET_ACCESS_TOKEN, this.auth.getAccessToken());
        })
        this.connect();

    }

    static initialize() {
        return this;
    }

    private closeWebSocket() {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();

        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }

        this.socketSubscription = null;
        this.heartbeatTimeout = null;
        this.socket = null;
        this.reconnect();
        this.toastr.error(this.getBaseUrl(), 'Close Web Socket', {
            timeOut: 10000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true
        });
    }

    private openWebSocket() {
        this.reconnectAttempts = 10;
    }

    private async connect(): Promise<void> {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }
        const accessToken = this.auth.getAccessToken();
        this.wsSubjectConfig.url = this.getUrl(accessToken);
        this.socket = webSocket(this.wsSubjectConfig);
        this.socketSubscription = this.socket?.subscribe(
            (m: any) => {
                this.accept(m);
            },
            (error: Event) => {
                if (!this.socket) {
                    this.reconnect();
                }
            });
        this.send(MessageAPI.SET_ACCESS_TOKEN, this.auth.getAccessToken());
        this.heartbeat();
    }

    private heartbeat() {
        this.socket?.next('ping');
        this.send(MessageAPI.GET_STATUS, null);
        this.heartbeatTimeout = setTimeout(
            this.heartbeat.bind(this), WebSocketService.HEARTBEAT_DELAY
        );
    }

    private reconnect(): void {
        setTimeout(() => {
            if (this.reconnectAttempts < 0) {
                return;
            }
            this.reconnectAttempts--;
            this.connect();
        }, this.reconnectInterval);
    }

    private _send(data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sendingEvent = true;
            this.socket?.next(data);
            setTimeout(() => {
                this.sendingEvent = false;
                resolve();
            },
                100
            );
        })
    }

    private async send(type: string, data: any): Promise<void> {
        try {
            if (this.socket) {
                const message = JSON.stringify({ type, data });
                await this._send(message);
            }
        } catch (error: any) {
            console.error(error);
            this.toastr.error(error.message, 'Web Socket', {
                timeOut: 10000,
                closeButton: true,
                positionClass: 'toast-bottom-right',
                enableHtml: true
            });
        }
    }

    private accept(message: string) {
        if (message === 'pong') {
            return;
        }
        try {
            const event = JSON.parse(message);
            const { type, data } = event;

            switch (type || event.event) {
                case MessageAPI.PROFILE_BALANCE:
                    this.profileSubject.next(event);
                    break;
                case MessageAPI.GET_STATUS:
                case MessageAPI.UPDATE_STATUS:
                    this.updateStatus(data);
                    const allStatesReady = !this.serviesStates.find((item: any) => !item.states.includes(ApplicationStates.READY));
                    // const allStatesReady = true;
                    if (!allStatesReady && !this.requiredServicesWrongStatus) {
                        this.requiredServicesWrongStatus = true;
                        if (!['/status', '/admin/settings', '/admin/logs', '/login'].includes(location.pathname)) {
                            const last = location.pathname === '/status' ? null : btoa(location.href);
                            //this.router.navigate(['/status'], { queryParams: { last } });
                            this.dialogService.open(ServiceUnavailableDialog, {
                                closable: true,
                                header: 'Something went wrong',
                                width: '500px',
                            });
                        }
                    }
                    this.servicesReady.next(allStatesReady);
                    break;
                case MessageAPI.UPDATE_EVENT: {
                    this.blockUpdateSubject.next(data);
                    break;
                }
                case MessageAPI.ERROR_EVENT: {
                    if (!data.blockType.includes('401'))
                    this.toastr.error(data.message, data.blockType, {
                        timeOut: 10000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true
                    });
                    break;
                }
                case MessageAPI.UPDATE_USER_INFO_EVENT: {
                    this.userInfoUpdateSubject.next(data);
                    break;
                }
                case MessageAPI.UPDATE_TASK_STATUS: {
                    this.taskStatusSubject.next(data);
                    break;
                }
                case NotifyAPI.UPDATE_WS:
                    this.updateNotification.next(event.data);
                    break;
                case NotifyAPI.DELETE_WS:
                    this.deleteNotification.next(event.data);
                    break;
                case NotifyAPI.CREATE_PROGRESS_WS:
                    this.createProgress.next(event.data);
                    break;
                case NotifyAPI.UPDATE_PROGRESS_WS:
                    this.updateProgress.next(event.data);
                    break;
                case NotifyAPI.DELETE_PROGRESS_WS:
                    this.deleteProgress.next(event.data);
                    break;
                case MessageAPI.MEECO_AUTH_PRESENT_VP: {
                    this.meecoPresentVPSubject.next(data);
                    break;
                }
                case MessageAPI.MEECO_VERIFY_VP: {
                    this.meecoVerifyVPSubject.next(data);
                    break;
                }
                case MessageAPI.MEECO_VERIFY_VP_FAILED: {
                    this.meecoVerifyVPFailedSubject.next(data);
                    break;
                }
                case MessageAPI.MEECO_APPROVE_SUBMISSION_RESPONSE: {
                    this.meecoApproveVCSubject.next(data);
                    break;
                }
                default:
                    break;
            }
        } catch (error: any) {
            console.error(error);
            this.toastr.error(error.message, 'Web Socket', {
                timeOut: 10000,
                closeButton: true,
                positionClass: 'toast-bottom-right',
                enableHtml: true
            });
        }
    }

    private getBaseUrl() {
        let url = location.origin;
        if (/^https/.test(url)) {
            return `${url.replace(/^https/, 'wss')}`;
        }
        return `${url.replace(/^http/, 'ws')}`;
    }

    private getUrl(accessToken: string | null = null) {
        return `${this.getBaseUrl()}/ws/?token=${accessToken}`;
    }

    public blockSubscribe(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.blockUpdateSubject.subscribe(next, error, complete);
    }

    public subscribeUserInfo(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.userInfoUpdateSubject.subscribe(next, error, complete);
    }

    public statusSubscribe(
        next?: ((event: boolean) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.servicesReady.subscribe(next, error, complete);
    }

    public profileSubscribe(
        next?: ((event: { type: string, data: any }) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.profileSubject.subscribe(next, error, complete);
    }

    public taskSubscribe(
        next?: ((event: any/*{ taskId: string, statuses?: string[], completed?: boolean }*/) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.taskStatusSubject.subscribe(next, error, complete);
    }

    public updateNotificationSubscribe(
        next?: (
            data: any
        ) => void,
        error?: (error: any) => void,
        complete?: () => void
    ) {
        if (this.updateNotification.observers.length > 0) {
            this.updateNotification = new Subject();
        }
        return this.updateNotification.subscribe(next, error, complete);
    }

    public deleteNotificationSubscribe(
        next?: (
            data: any
        ) => void,
        error?: (error: any) => void,
        complete?: () => void
    ) {
        if (this.deleteNotification.observers.length > 0) {
            this.deleteNotification = new Subject();
        }
        return this.deleteNotification.subscribe(next, error, complete);
    }

    public createProgressSubscribe(
        next?: (
            data: any
        ) => void,
        error?: (error: any) => void,
        complete?: () => void
    ) {
        if (this.createProgress.observers.length > 0) {
            this.createProgress = new Subject();
        }
        return this.createProgress.subscribe(next, error, complete);
    }

    public updateProgressSubscribe(
        next?: (
            data: any
        ) => void,
        error?: (error: any) => void,
        complete?: () => void
    ) {
        if (this.updateProgress.observers.length > 0) {
            this.updateProgress = new Subject();
        }
        return this.updateProgress.subscribe(next, error, complete);
    }

    public deleteProgressSubscribe(
        next?: (
            data: any
        ) => void,
        error?: (error: any) => void,
        complete?: () => void
    ) {
        if (this.deleteProgress.observers.length > 0) {
            this.deleteProgress = new Subject();
        }
        return this.deleteProgress.subscribe(next, error, complete);
    }

    public meecoApproveVCSubscribe(
        next?: ((event: MeecoApproveSubmissionResponse) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.meecoApproveVCSubject.subscribe(next, error, complete);
    }

    public approveVCSubject(
        presentation_request_id: string,
        submission_id: string,
        role: UserRole
    ): void {
        this.send(MessageAPI.MEECO_APPROVE_SUBMISSION, {
            presentation_request_id,
            submission_id,
            role,
        });
    }

    public rejectVCSubject(presentation_request_id: string, submission_id: string): void {
        this.send(MessageAPI.MEECO_REJECT_SUBMISSION, {
            presentation_request_id,
            submission_id,
        });
    }

    public login() {
        this.send(MessageAPI.SET_ACCESS_TOKEN, this.auth.getAccessToken());
    }

    public logaut() {
        this.send(MessageAPI.SET_ACCESS_TOKEN, null);
    }

    public updateProfile() {
        this.send(MessageAPI.UPDATE_PROFILE, this.auth.getAccessToken());
    }

    public sendMessage(type: string, data: any = null) {
        this.send(type, data);
    }

    public meecoLogin(): void {
        this.send(MessageAPI.MEECO_AUTH_REQUEST, null);
    }

    private updateStatus(serviceStatus: any) {
        if (!serviceStatus || !Object.keys(serviceStatus).length) {
            return;
        }
        const serviceNames = Object.keys(serviceStatus);
        for (let i = 0; i < serviceNames.length; i++) {
            const serviceName = serviceNames[i];
            const existsService = this.serviesStates.find((item: any) => item.serviceName === serviceName);
            if (!existsService) {
                this.serviesStates.push({
                    serviceName,
                    states: serviceStatus[serviceName]
                });
                continue;
            }
            existsService.states = serviceStatus[serviceName]
        }
    }

    public IsServicesReady() {
        this.send(MessageAPI.GET_STATUS, null);
        return this.servicesReady;
    }

    public getServicesStatesArray(): any[] {
        return this.serviesStates;
    }
}

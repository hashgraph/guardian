import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { ApplicationStates, MessageAPI } from '@guardian/interfaces';
import { Router } from '@angular/router';

/**
 *  WebSocket service.
 */
@Injectable({
    providedIn: 'root'
})
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
    private serviesStates: any = [];
    private sendingEvent: boolean;

    constructor(private auth: AuthService, private toastr: ToastrService, private router: Router) {
        this.blockUpdateSubject = new Subject();
        this.userInfoUpdateSubject = new Subject();
        this.servicesReady = new Subject();
        this.profileSubject = new Subject();
        this.taskStatusSubject = new Subject();
        this.socket = null;
        this.sendingEvent = false;

        this.socketSubscription = null;
        this.wsSubjectConfig = {
            url: this.getUrl(),
            deserializer: (e) => {
                this.sendingEvent = true;
                return e.data
            },
            serializer: (value) => {
                return value
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
            this.send('SET_ACCESS_TOKEN', this.auth.getAccessToken());
        })
        this.connect();
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
        this.heartbeat();
        await this.send('SET_ACCESS_TOKEN', this.auth.getAccessToken());
        await this.send(MessageAPI.GET_STATUS, null);
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
            if (this.sendingEvent) {
                setTimeout(async () => {
                    await this._send(data);
                    this.sendingEvent = false;
                    resolve();
                }, 10);
            } else {
                this.sendingEvent = true;
                this.socket?.next(data);

                setTimeout(() => {
                    this.sendingEvent = false;
                    resolve();
                }, 100);
            }

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
            switch (event.type) {
                case 'PROFILE_BALANCE':
                    this.profileSubject.next(event);
                    break;
                case MessageAPI.GET_STATUS:
                case MessageAPI.UPDATE_STATUS:
                    this.updateStatus(event.data);
                    const allStatesReady = !this.serviesStates.find((item: any) => item.state !== ApplicationStates.READY)
                    if (!allStatesReady) {
                        this.router.navigate(['/status']);
                    }
                    this.servicesReady.next(allStatesReady);
                    break;
                case 'update-event': {
                    this.blockUpdateSubject.next(event.data);
                    break;
                }
                case 'error-event': {
                    this.toastr.error(event.data.message, event.data.blockType, {
                        timeOut: 10000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true
                    });
                    break;
                }
                case 'update-user-info-event': {
                    this.userInfoUpdateSubject.next(event.data);
                    break;
                }
                case MessageAPI.UPDATE_TASK_STATUS: {
                    this.taskStatusSubject.next(event.data);
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

    public login() {
        this.send('SET_ACCESS_TOKEN', this.auth.getAccessToken());
    }

    public logaut() {
        this.send('SET_ACCESS_TOKEN', null);
    }

    public updateProfile() {
        this.send('UPDATE_PROFILE', this.auth.getAccessToken());
    }

    public sendMessage(type: string, data: any = null) {
        this.send(type, data);
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
                    state: serviceStatus[serviceName]
                });
                continue;
            }
            existsService.state = serviceStatus[serviceName]
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

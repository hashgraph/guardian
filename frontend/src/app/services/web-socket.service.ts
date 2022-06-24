import { Injectable } from '@angular/core';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 *  WebSocket service.
 */
@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private static HEARTBEAT_DELAY = 30 * 1000;
    private socket: any;
    private wsSubjectConfig: WebSocketSubjectConfig<string>;
    private socketSubscription: Subscription | null = null;
    private heartbeatTimeout: any = null;
    private reconnectInterval: number = 5000;  /// pause between connections
    private reconnectAttempts: number = 10;  /// number of connection attempts
    private policySubject: Subject<{ type: string, data: any }>;
    private statusSubject: Subject<{ type: string, data: any }>;
    private profileSubject: Subject<{ type: string, data: any }>;

    constructor(private auth: AuthService, private toastr: ToastrService) {
        this.policySubject = new Subject();
        this.statusSubject = new Subject();
        this.profileSubject = new Subject();

        this.socketSubscription = null;
        this.wsSubjectConfig = {
            url: this.getUrl(),
            deserializer: (e) => e.data,
            serializer: (value) => value,
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

    private connect(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }

        this.wsSubjectConfig.url = this.getUrl();
        this.socket = webSocket(this.wsSubjectConfig);
        this.socketSubscription = this.socket.subscribe(
            (m: any) => {
                this.accept(m);
            },
            (error: Event) => {
                if (!this.socket) {
                    this.reconnect();
                }
            });
        this.heartbeat();
        this.send('SET_ACCESS_TOKEN', this.auth.getAccessToken());
    }

    private heartbeat() {
        this.socket.next('ping');
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

    private send(type: string, data: any) {
        try {
            if (this.socket) {
                const message = JSON.stringify({ type, data });
                this.socket.next(message);
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
                    this.policySubject.next(event);
                    break;

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

    private getUrl() {
        return `${this.getBaseUrl()}/ws/`;
    }

    public policySubscribe(
        next?: ((event: { type: string, data: any }) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.policySubject.subscribe(next, error, complete);
    }

    public statusSubscribe(
        next?: ((event: { type: string, data: any }) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.statusSubject.subscribe(next, error, complete);
    }

    public profileSubscribe(
        next?: ((event: { type: string, data: any }) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.profileSubject.subscribe(next, error, complete);
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
}

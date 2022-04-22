import { Injectable } from '@angular/core';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { ApplicationStates, MessageAPI } from 'interfaces';

/**
 * Status service.
 */
@Injectable({
    providedIn: 'root'
})
export class StatusService {

    private static HEARTBEAT_DELAY = 30 * 1000;

    private socket: any;
    private wsSubjectConfig: WebSocketSubjectConfig<string>;
    private socketSubscription: Subscription | null = null;
    private heartbeatTimeout: any = null;

    private reconnectInterval: number = 5000;  /// pause between connections
    private reconnectAttempts: number = 10;  /// number of connection attempts
    private serviesStates: any = [];
    private servicesReady: Subject<boolean> = new Subject();

    constructor(
        private toastr: ToastrService
    ) {
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
        this.init();
    }

    public init() {
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
                const event = JSON.parse(m);
                if (event.type === MessageAPI.UPDATE_STATUS
                    || event.type === MessageAPI.GET_STATUS) {
                    this.updateStatus(event.data);
                    this.servicesReady.next(!this.serviesStates.find((item: any) => item.state !== ApplicationStates.READY))
                }
            },
            (error: Event) => {
                if (!this.socket) {
                    this.reconnect();
                }
            });

        this.socket.next(MessageAPI.GET_STATUS.toString());
        this.heartbeat();
    }

    private heartbeat() {
        this.socket.next(MessageAPI.GET_STATUS.toString());
        this.heartbeatTimeout = setTimeout(this.heartbeat.bind(this), StatusService.HEARTBEAT_DELAY);
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
        this.socket.next(MessageAPI.GET_STATUS.toString());
        return this.servicesReady;
    }

    public getServicesStatesArray(): any[] {
        return this.serviesStates;
    }
}

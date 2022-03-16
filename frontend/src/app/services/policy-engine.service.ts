import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription } from 'rxjs';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';
import { API_BASE_URL } from './api';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyEngineService {
    private static HEARTBEAT_DELAY = 60 * 1000;

    private socket: any;
    private blockUpdateSubject: Subject<unknown>;
    private wsSubjectConfig: WebSocketSubjectConfig<string>;
    private socketSubscription: Subscription | null = null;
    private heartbeatTimeout: any = null;

    private connectionStatus: boolean = false;
    private reconnectInterval: number = 5000;  /// pause between connections
    private reconnectAttempts: number = 10;  /// number of connection attempts

    private readonly url: string = `${API_BASE_URL}/policies`;

    constructor(
        private http: HttpClient,
        private auth: AuthService,
        private toastr: ToastrService
    ) {
        this.blockUpdateSubject = new Subject();
        this.socketSubscription = null;
        this.wsSubjectConfig = {
            url: this.getUrl(null),
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
        this.auth.subscribe(() => {
            this.reconnectAttempts = 10;
            this.connect();
        })
    }

    public subscribe(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.blockUpdateSubject.subscribe(next, error, complete);
    }

    public all(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/`);
    }

    public create(policy: any): Observable<void> {
        return this.http.post<any>(`${this.url}/`, policy);
    }

    public policy(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}`);
    }

    public update(policyId: string, policy: any): Observable<void> {
        return this.http.put<any>(`${this.url}/${policyId}`, policy);
    }

    public publish(policyId: string, policyVersion: string): Observable<any> {
        return this.http.put<any>(`${this.url}/${policyId}/publish`, {policyVersion});
    }

    public validate(policy: any): Observable<any> {
        return this.http.post<any>(`${this.url}/validate`, policy);
    }

    public policyBlock(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks`);
    }

    public getBlockData(blockId: string, policyId: string, filters?: any): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}`, {
            params: filters
        });
    }

    public setBlockData(blockId: string, policyId: string, data: any): Observable<any> {
        return this.http.post<void>(`${this.url}/${policyId}/blocks/${blockId}`, data);
    }

    public getGetIdByName(blockName: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/tag/${blockName}`);
    }

    public getParents(blockId: string, policyId: string): Observable<any> {
        return this.http.get<any>(`${this.url}/${policyId}/blocks/${blockId}/parents`);
    }

    public exportInFile(policyId: string): Observable<any> {
        return this.http.get(`${this.url}/${policyId}/export/file`, {
            responseType: 'blob'
        });
    }

    public exportInMessage(policyId: string): Observable<any> {
        return this.http.get(`${this.url}/${policyId}/export/message`);
    }

    public importByMessage(messageId: string): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/import/message`, {messageId});
    }

    public importByFile(policyFile: any): Observable<any[]> {
        return this.http.post<any[]>(`${this.url}/import/file`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public previewByMessage(messageId: string): Observable<any> {
        return this.http.post<any>(`${this.url}/import/message/preview`, {messageId});
    }

    public previewByFile(policyFile: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/file/preview`, policyFile, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    private getBaseUrl() {
        let url = location.origin;
        if (/^https/.test(url)) {
            return `${url.replace(/^https/, 'wss')}`;
        }
        return `${url.replace(/^http/, 'ws')}`;
    }

    private getUrl(accessToken: string | null) {
        return `${this.getBaseUrl()}/ws/?token=${accessToken}`;
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
        const accessToken = this.auth.getAccessToken();
        if (!accessToken) {
            return;
        }
        this.socketSubscription = null;
        this.heartbeatTimeout = null;
        this.socket = null;
        this.connectionStatus = false;
        this.reconnect();
        this.toastr.error(this.getBaseUrl(), 'Close Web Socket', {
            timeOut: 10000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true
        });
    }

    private openWebSocket() {
        this.connectionStatus = true;
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
        const accessToken = this.auth.getAccessToken();
        if (!accessToken) {
            return;
        }
        this.wsSubjectConfig.url = this.getUrl(accessToken);
        this.socket = webSocket(this.wsSubjectConfig);
        this.socketSubscription = this.socket.subscribe(
            (m: any) => {
                if (m === 'pong') {
                    return;
                }
                const event = JSON.parse(m);
                if (event.type === 'update-event') {
                    this.blockUpdateSubject.next(event.data);
                }
                if (JSON.parse(m).type === 'error-event') {
                    this.toastr.error(event.data.message, event.data.blockType, {
                        timeOut: 10000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true
                    });
                }
            },
            (error: Event) => {
                if (!this.socket) {
                    this.reconnect();
                }
            });
        this.heartbeat();
    }

    private heartbeat() {
        this.socket.next('ping');
        this.heartbeatTimeout = setTimeout(this.heartbeat.bind(this), PolicyEngineService.HEARTBEAT_DELAY);
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
}

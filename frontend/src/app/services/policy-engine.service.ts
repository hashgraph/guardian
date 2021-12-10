import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, Subject, Subscription, of } from 'rxjs';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 * Services for working from policy and separate blocks.
 */
@Injectable()
export class PolicyEngineService {
  private static HEARTBEAT_DELAY = 60 * 1000;

  private socket: any;
  private websocketSubject: Subject<unknown>;
  private wsSubjectConfig: WebSocketSubjectConfig<string>;

  private connectionStatus: boolean = false;
  private reconnectInterval: number = 5000;  /// pause between connections
  private reconnectAttempts: number = 10;  /// number of connection attempts

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private toastr: ToastrService
  ) {
    this.websocketSubject = new Subject();
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

    this.connect();
    this.auth.subscribe(() => {
      this.reconnectAttempts = 10;
      this.connect();
    })
  }

  private getBaseUrl() {
    let url = location.origin;
    if (/^https/.test(url)) {
      return `${url.replace(/^https/, 'wss')}`;
    }
    return `${url.replace(/^http/, 'ws')}`;
  }

  private getUrl(accessToken: string | null) {
    return `${this.getBaseUrl()}?token=${accessToken}`;
  }

  private closeWebSocket() {
    if (this.socket) {
      this.socket.unsubscribe();
    }
    this.socket = null;
    this.connectionStatus = false;
    this.reconnect();
    this.toastr.error(this.getBaseUrl(), "Close Web Socket", {
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
    const accessToken = this.auth.getAccessToken();
    if (!accessToken) {
      return;
    }
    this.wsSubjectConfig.url = this.getUrl(accessToken);
    this.socket = webSocket(this.wsSubjectConfig);
    this.socket.subscribe(
      (m: any) => {
        if (m === "pong") {
          return;
        }
        this.websocketSubject.next(m);
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
    setTimeout(this.heartbeat.bind(this), PolicyEngineService.HEARTBEAT_DELAY);
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

  public getAllPolicy(): Observable<any[]> {
    return this.http.get<any[]>(`/api/get-policy-list`);
  }

  public getPolicy(policyId: string): Observable<any> {
    return this.http.get<any>(`/policy/${policyId}`);
  }

  public getData(blockId: string, policyId: string): Observable<any> {
    return this.http.get<any>(`/policy/block/${blockId}`);
  }

  public getGetIdByName(blockName: string, policyId: string): Observable<any> {
    return this.http.get<any>(`/policy/block/tag/${policyId}/${blockName}`);
  }

  public setData(blockId: string, policyId: string, data: any): Observable<any> {
    return this.http.post<void>(`/policy/block/${blockId}`, data);
  }

  public subscribe(
    next?: ((id: any) => void),
    error?: ((error: any) => void),
    complete?: (() => void)
  ): Subscription {
    return this.websocketSubject.subscribe(next, error, complete);
  }

  public loadPolicy(policyId: string): Observable<any> {
    return this.http.get<any>(`/policy/edit/${policyId}`);
  }

  public savePolicy(policyId: string, policy: any): Observable<void> {
    return this.http.post<any>(`/policy/edit/${policyId}`, policy);
  }

  public createPolicy(policy: any): Observable<void> {
    return this.http.post<any>(`/policy/create`, policy);
  }

  public publishPolicy(policyId: string): Observable<void> {
    return this.http.post<any>(`/policy/publish/${policyId}`, null);
  }

  public toYAML(json: any): Observable<any> {
    return this.http.post<any>(`/policy/to-yaml`, { json });
  }

  public fromYAML(yaml: string): Observable<any> {
    return this.http.post<any>(`/policy/from-yaml`, { yaml });
  }

  public exportPolicy(policyId: string): Observable<void> {
    return this.http.get<any>(`/api/package/export/${policyId}`);
  }

  public exportPolicyDownload(policyId: string, data: any): Observable<Blob> {
    return this.http.post(`/api/package/export/${policyId}/download`, data, {
      responseType: 'blob'
    });
  }

  public importFileUpload(policyFile: any): Observable<any> {
    return this.http.put('/api/package/import/upload', policyFile, {
      headers: {
        'Content-Type': 'binary/octet-stream'
      }
    });
  }
  public importUpload(policyData: any): Observable<any[]> {
    return this.http.post<any[]>('/api/package/import', policyData);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, Subject, Subscription, of } from 'rxjs';
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
  private websocketSubject: Subject<unknown>;
  private wsSubjectConfig: WebSocketSubjectConfig<string>;

  private connectionStatus: boolean = false;
  private reconnectInterval: number = 5000;  /// pause between connections
  private reconnectAttempts: number = 10;  /// number of connection attempts

  private readonly url: string = `${API_BASE_URL}/policies`;

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

  public subscribe(
    next?: ((id: any) => void),
    error?: ((error: any) => void),
    complete?: (() => void)
  ): Subscription {
    return this.websocketSubject.subscribe(next, error, complete);
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
    return this.http.put<any>(`${this.url}/${policyId}/publish`, { policyVersion });
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
    return this.http.post<any[]>(`${this.url}/import/message`, { messageId });
  }

  public importByFile(policyFile: any): Observable<any[]> {
    return this.http.post<any[]>(`${this.url}/import/file`, policyFile, {
      headers: {
        'Content-Type': 'binary/octet-stream'
      }
    });
  }

  public previewByMessage(messageId: string): Observable<any> {
    return this.http.post<any>(`${this.url}/import/message/preview`, { messageId });
  }

  public previewByFile(policyFile: any): Observable<any> {
    return this.http.post<any[]>(`${this.url}/import/file/preview`, policyFile, {
      headers: {
        'Content-Type': 'binary/octet-stream'
      }
    });
  }

  public toYAML(json: any): Observable<any> {
    return this.http.post<any>(`${this.url}/to-yaml`, { json });
  }

  public fromYAML(yaml: string): Observable<any> {
    return this.http.post<any>(`${this.url}/from-yaml`, { yaml });
  }
}

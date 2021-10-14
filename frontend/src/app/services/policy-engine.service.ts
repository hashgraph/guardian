import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, Subscription} from 'rxjs';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';

// /*
@Injectable()
export class PolicyEngineService {
  private obs: WebSocketSubject<string>;

  constructor(private http: HttpClient) {
    this.obs = webSocket({
      url: `${location.origin.replace(/^https?/, 'ws')}?token=${localStorage.getItem('accessToken')}`,
      deserializer: (e) => e.data,
      serializer: (value) => value,
    });
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
    next?: ((id: string) => void),
    error?: ((error: any) => void),
    complete?: (() => void)
  ): Subscription {
    return this.obs.subscribe(next, error, complete);
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

  public restartService(): Observable<any> {
    return this.http.get('/api/restart-service');
  }

  public toYAML(json: any): Observable<any> {
    return this.http.post<any>(`/policy/to-yaml`, {json});
  }
  
  public fromYAML(yaml: string): Observable<any> {
    return this.http.post<any>(`/policy/from-yaml`, {yaml});
  }
}

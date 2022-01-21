import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api';
/**
 * Services for working from user profile.
 */
@Injectable()
export class IPFSService {
  private readonly url: string = `${API_BASE_URL}/ipfs`;
  constructor(
    private http: HttpClient
  ) { }

  public addFile(file: any): Observable<any> {
    return this.http.post<string>(`${this.url}/file`, file, {
      headers: {
       'Content-Type': 'binary/octet-stream'
      }
    });
  }
}

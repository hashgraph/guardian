import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { IChainItem, IVCDocument, IVPDocument } from "interfaces";

/**
 * Service to find VP Documents and Trust Chain.
 */
@Injectable()
export class AuditService {
    private readonly url: string = '/api/audit';

    constructor(
        private http: HttpClient
    ) { }

    public getVpDocuments(): Observable<IVPDocument[]> {
        return this.http.get<any>(`${this.url}/documents`);
    }

    public searchHash(params: string): Observable<IChainItem[]> {
        return this.http.get<any>(`${this.url}/chain?search=${params}`);
    }
}

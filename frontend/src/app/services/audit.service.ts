import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { IChainItem, IVCDocument, IVPDocument } from "interfaces";

/**
 * Service to find VP Documents and Trust Chain.
 */
@Injectable()
export class AuditService {
    constructor(
        private http: HttpClient
    ) { }

    public getVpDocuments(): Observable<IVPDocument[]> {
        return this.http.get<any>('/api/get-vp-documents');
    }

    public searchVcDocuments(filters: any): Observable<IVCDocument[]> {
        return this.http.post<any>('/api/search-vc-documents', { filters });
    }

    public searchHash(params: string): Observable<IChainItem[]> {
        return this.http.get<any>(`/api/search-documents?search=${params}`);
    }
}

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { IChainItem, IVCDocument, IVPDocument } from "interfaces";
import { API_BASE_URL } from "./api";

/**
 * Service to find VP Documents and Trust Chain.
 */
@Injectable()
export class AuditService {
    private readonly url: string = `${API_BASE_URL}/trustchains`;

    constructor(
        private http: HttpClient
    ) { }

    public getVpDocuments(): Observable<IVPDocument[]> {
        return this.http.get<any>(`${this.url}`);
    }

    public searchHash(params: string): Observable<IChainItem[]> {
        return this.http.get<any>(`${this.url}/${params}`);
    }
}

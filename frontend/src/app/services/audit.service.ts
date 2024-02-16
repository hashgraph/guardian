import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { Observable } from "rxjs";
import { IChainItem, IVCDocument, IVPDocument } from "@guardian/interfaces";
import { API_BASE_URL } from "./api";

/**
 * Service to find VP Documents and Trust Chain.
 */
@Injectable()
export class AuditService {
    private readonly url: string = `${API_BASE_URL}/trust-chains`;

    constructor(
        private http: HttpClient
    ) { }

    public getVpDocuments(
        currentPolicy?: any,
        owner?: any,
        pageIndex?: number,
        pageSize?: number
    ): Observable<HttpResponse<IVPDocument[]>> {
        let url = `${this.url}`;
        if (currentPolicy) {
            url += `?policyId=${currentPolicy}`;
            if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
                url += `&pageIndex=${pageIndex}&pageSize=${pageSize}`;
            }
        } else if (owner) {
            url += `?policyOwner=${owner}`;
            if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
                url += `&pageIndex=${pageIndex}&pageSize=${pageSize}`;
            }
        } else if (Number.isInteger(pageIndex) && Number.isInteger(pageSize)) {
            url += `?pageIndex=${pageIndex}&pageSize=${pageSize}`;
        }
        return this.http.get<any>(url, { observe: 'response' });
    }

    public searchHash(params: string): Observable<IChainItem[]> {
        return this.http.get<any>(`${this.url}/${params}`);
    }
}

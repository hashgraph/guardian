import { PolicyEngineService } from "src/app/services/policy-engine.service";

export class HttpRequestUIAddonCode {
    private readonly url: string;
    private readonly type: string;
    private readonly headers: any;
    private readonly authentication: any;
    private readonly policyEngineService: PolicyEngineService;

    constructor(
        config: any,
        policyEngineService: PolicyEngineService,
    ) {
        this.url = config.url;
        this.type = config.method;
        this.headers = config.headers;
        this.authentication = config.authentication;
        this.policyEngineService = policyEngineService;
    }

    public async run(
        data: {
            document: any,
            params: any,
            history: any[]
        }
    ) {
        const url = this.createUrl(document);
        const headers = this.createHeaders();
        return new Promise<any>((resolve, reject) => {
            this.policyEngineService
                .customRequest(this.type, url, document, headers)
                .subscribe((response: any) => {
                    data.document = response;
                    if (!data.history) {
                        data.history = [];
                    }
                    data.history.push(response);
                    resolve(data)
                }, (e) => {
                    reject(e);
                });
        });
    }

    private createUrl(data: any): string {
        let url = `${this.url}`;
        if (data) {
            for (const key of Object.keys(data)) {
                const value = String(data[key]);
                url = this.replaceAll(url, '${' + key + '}', value);
            }
        }
        return url;
    }

    private escapeRegExp(find: string) {
        return find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private replaceAll(str: string, find: string, replace: string) {
        return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
    }

    private createHeaders() {
        let headers: any = null;
        if (this.authentication) {
            if (!headers) {
                headers = {};
            }
            const token = localStorage.getItem('accessToken') as string;
            headers.Authorization = `Bearer ${token}`;
        }
        if (Array.isArray(this.headers) && this.headers.length) {
            if (!headers) {
                headers = {};
            }
            for (const item of this.headers) {
                headers[item.name] = item.value
            }
        }
        return headers;
    }
}
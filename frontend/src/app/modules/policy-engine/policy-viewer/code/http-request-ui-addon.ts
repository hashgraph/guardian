import { PolicyEngineService } from "src/app/services/policy-engine.service";

export class HttpRequestUIAddonCode {
    private readonly url: string;
    private readonly type: string;
    private readonly headers: any;
    private readonly authentication: any;
    private readonly authenticationURL: any;
    private readonly policyEngineService: PolicyEngineService;

    constructor(
        config: any,
        policyEngineService: PolicyEngineService,
    ) {
        this.url = config.url;
        this.type = config.method;
        this.headers = config.headers;
        this.authentication = config.authentication;
        this.authenticationURL = config.authenticationURL;
        this.policyEngineService = policyEngineService;
    }

    public async run(
        data: {
            document: any,
            params: any,
            history: any[]
        }
    ) {
        const url = this.createUrl(data.document);
        const headers = await this.createHeaders();
        return new Promise<any>((resolve, reject) => {
            this.policyEngineService
                .customRequest(this.type, url, data.document, headers)
                .subscribe((response: any) => {
                    data.document = response;
                    resolve(data);
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

    private async createHeaders() {
        let headers: any = null;
        if (this.authentication) {
            if (!headers) {
                headers = {};
            }
            let token = localStorage.getItem('accessToken') as string;
            if(this.authenticationURL) {
                token = await this.getRemoteAuthToken();
            }
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

    private getRemoteAuthToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            function handler(event: any) {
                if (event.data && event.data.type === "MSAL_TOKEN") {
                    window.removeEventListener("message", handler);
                    resolve(event.data.token);
                }
            }

            window.addEventListener("message", handler, false);

            const popup = window.open(this.authenticationURL, "authPopup", "width=950,height=950");
        });
    }
}

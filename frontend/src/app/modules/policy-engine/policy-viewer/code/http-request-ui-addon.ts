import { PolicyEngineService } from "src/app/services/policy-engine.service";
import { DynamicMsalAuthService } from "../../services/dynamic-msal-auth.service";
import { ToastrService } from "ngx-toastr";

export class HttpRequestUIAddonCode {
    private readonly url: string;
    private readonly type: string;
    private readonly headers: any;
    private readonly authentication: any;
    private readonly authenticationURL: any;
    private readonly authenticationClientId: any;
    private readonly authenticationScopes: any;
    private readonly policyEngineService: PolicyEngineService;
    private readonly dynamicMsalAuthService: DynamicMsalAuthService;
    private readonly toastr: ToastrService;

    constructor(
        config: any,
        policyEngineService: PolicyEngineService,
        dynamicMsalAuthService: DynamicMsalAuthService,
        toastr: ToastrService
    ) {
        this.url = config.url;
        this.type = config.method;
        this.headers = config.headers;
        this.authentication = config.authentication;
        this.authenticationClientId = config.authenticationClientId;
        this.authenticationURL = config.authenticationURL;
        this.authenticationScopes = config.authenticationScopes;
        this.policyEngineService = policyEngineService;
        this.dynamicMsalAuthService = dynamicMsalAuthService;
        this.toastr = toastr;
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
                    this.toastr.success('Document was sent successfully', '', {
                        timeOut: 3000,
                        closeButton: true,
                        positionClass: 'toast-bottom-right',
                        enableHtml: true,
                    });
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
            if(this.authenticationURL && this.authenticationClientId) {
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

    private async getRemoteAuthToken(): Promise<string> {
        const config: any = {
            clientId: this.authenticationClientId,
            authority: this.authenticationURL,
            knownAuthorities: [new URL(this.authenticationURL).hostname],
            scopes: this.authenticationScopes.split(','),
        };

        const token = await this.dynamicMsalAuthService.getRemoteAuthToken(config);
        return token;
    }
}

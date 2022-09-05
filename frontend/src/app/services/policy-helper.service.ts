import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivationStart, NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, Subscription, of } from 'rxjs';

@Injectable()
export class PolicyHelper {
    private policyId: any = null;
    private policyParams: any = {};
    private subject: Subject<unknown>;

    constructor(private route: ActivatedRoute, private router: Router) {
        this.subject = new Subject();
        this.parsParams(router.url);
        router.events.subscribe((event: any) => {
            if (event instanceof NavigationEnd) {
                this.parsParams(event.url);
            }
        });
    }

    public subscribe(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.subject.subscribe(next, error, complete);
    }

    private parsParams(url: any) {
        try {
            this.policyId = null;
            this.policyParams = {};
            if (url) {
                const params = /^\/policy-viewer\/(\w+)(.*)/.exec(url);
                if(params) {
                    this.policyId = params[1];
                    if (params[2]) {
                        const urlParams = new URLSearchParams(params[2]);
                        const policyParams = urlParams.get('policyParams');
                        if(policyParams) {
                            const json = atob(policyParams);
                            this.policyParams = JSON.parse(json);
                        }
                    }
                }
                this.subject.next();
            }
        } catch (error) {
            this.policyId = null;
            this.policyParams = {};
        }
    }

    private updateParams() {
        try {
            const json = btoa(JSON.stringify(this.policyParams));
            this.router.navigate(
                [],
                {
                    relativeTo: this.route,
                    queryParams: {
                        policyParams: json,
                    },
                    queryParamsHandling: 'merge'
                });
        } catch (error) {
            console.error(error);
        }
    }

    public getParams(uuid: any) {
        if (this.policyId && this.policyParams) {
            return this.policyParams[uuid];
        }
        return null;
    }

    public setParams(data: any): void
    public setParams(uuid: any, data: any): void
    public setParams(...arg: any[]): void {
        if (!this.policyId || !this.policyParams) {
            return;
        }
        if (arg.length == 1) {
            const data = arg[0];
            const keys = Object.keys(data);
            for (let i = 0; i < keys.length; i++) {
                const uuid = keys[i];
                this.policyParams[uuid] = data[uuid];
            }
            this.updateParams();
        }
        if (arg.length == 2) {
            const uuid = arg[0];
            const data = arg[1];
            if (this.policyParams[uuid] != data) {
                this.policyParams[uuid] = data;
                this.updateParams();
            }
        }
    }
}

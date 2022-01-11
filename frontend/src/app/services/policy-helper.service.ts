import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, Subscription, of } from 'rxjs';

@Injectable()
export class PolicyHelper {
    private policyId: any = null;
    private policyParams: any = {};
    private subject: Subject<unknown>;

    constructor(private route: ActivatedRoute, private router: Router) {
        this.subject = new Subject();
        this.route.queryParams.subscribe(this.parsParams.bind(this));
    }

    public subscribe(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
      ): Subscription {
        return this.subject.subscribe(next, error, complete);
      }

    private parsParams(params: any) {
        try {
            this.policyId = null;
            this.policyParams = {};
            if (params) {
                if (params.policyId) {
                    this.policyId = params.policyId;
                }
                if (params.policyParams) {
                    const json = atob(params.policyParams);
                    this.policyParams = JSON.parse(json);
                }
            }
            this.subject.next();
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

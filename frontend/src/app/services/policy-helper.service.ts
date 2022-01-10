import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable()
export class ProfileHelper {
    private policyId: any = null;
    private policyParams: any = {};

    constructor(private route: ActivatedRoute, private router: Router) {
        this.route.queryParams.subscribe(this.parsParams.bind(this));
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

    public setParams(uuid: any, data: any) {
        if (this.policyId && this.policyParams && this.policyParams[uuid] != data) {
            this.policyParams[uuid] = data;
            this.updateParams();
        }
    }
}

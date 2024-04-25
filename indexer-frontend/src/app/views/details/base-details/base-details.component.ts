import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IDetailsResults, IRelationshipsResults } from '@services/search.service';
import { Subscription } from 'rxjs';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
    selector: 'base-details',
    template: '',
    styles: []
})
export abstract class BaseDetailsComponent {
    public loading: boolean = true;
    public id: string = '';

    public uuid: string = '';
    public history: any[] = [];
    public first: any = null;
    public last: any = null;
    public target: any = null;
    public row: any = null;
    public relationships: IRelationshipsResults | null = null;
    public tab: string = '';
    public tabIndex: number = 0;

    private _queryObserver?: Subscription;
    private _paramsObserver?: Subscription;

    constructor(
        protected route: ActivatedRoute,
        protected router: Router
    ) {
    }

    ngOnInit() {
        this.loading = false;
        this._queryObserver = this.route.queryParams.subscribe(params => {
            const tab = params['tab'];
            if (this.id) {
                if (this.tab !== tab) {
                    this.tab = tab;
                    this.tabIndex = this.getTabIndex(tab);
                    this.onNavigate();
                }
            } else {
                this.tab = tab;
                this.tabIndex = this.getTabIndex(tab);
            }
        });
        this._paramsObserver = this.route.params.subscribe(params => {
            const id = params['id'];
            if (this.id !== id) {
                this.id = id;
                this.loadData();
                this.onNavigate();
            }
        });
    }

    ngOnDestroy(): void {
        this._queryObserver?.unsubscribe();
        this._paramsObserver?.unsubscribe();
    }

    protected setResult(result?: IDetailsResults): void {
        this.uuid = '';
        this.history = [];
        this.first = null;
        this.last = null;
        this.target = null;
        this.row = null;
        this.relationships = null;
        if (result) {
            this.row = result.row;
            this.target = result.item;
            if (Array.isArray(result.history)) {
                this.history = result.history;
                this.first = this.history[0] || this.target;
                this.last = this.history[this.history.length] || this.target;
            } else {
                this.first = this.target;
                this.last = this.target;
                this.history = [this.target]
            }
        }
        this.tabIndex = this.getTabIndex(this.tab);
    }

    protected setRelationships(result: IRelationshipsResults): void {
        this.relationships = result;
    }

    protected setTab(tab: string): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    protected onTab(event: MatTabChangeEvent) {
        this.setTab(this.getTabName(event.index));
    }

    protected toEntity(type: string, id: string, tab?: string) {
        const queryParams = tab ? { tab } : undefined;
        const option = queryParams ? { queryParams } : undefined;
        switch (type) {
            case 'EVC-Document':
            case 'VC-Document': {
                this.router.navigate([`/vc-documents/${id}`], option);
                break;
            }
            case 'DID-Document': {
                this.router.navigate([`/did-documents/${id}`], option);
                break;
            }
            case 'Schema':
            case 'schema-document': {
                this.router.navigate([`/schemas/${id}`], option);
                break;
            }
            case 'Policy': {
                this.router.navigate([`/policies/${id}`], option);
                break;
            }
            case 'Instance-Policy': {
                this.router.navigate([`/instance-policies/${id}`], option);
                break;
            }
            case 'VP-Document': {
                this.router.navigate([`/vp-documents/${id}`], option);
                break;
            }
            case 'Standard Registry': {
                this.router.navigate([`/standard-registries/${id}`], option);
                break;
            }
            case 'Topic': {
                debugger;
                this.router.navigate([`/topic-documents/${id}`], option);
                break;
            }
            case 'Token': {
                this.router.navigate([`/tokens/${id}`], option);
                break;
            }
            case 'Module': {
                this.router.navigate([`/modules/${id}`], option);
                break;
            }
            case 'Tool': {
                this.router.navigate([`/tools/${id}`], option);
                break;
            }
            case 'Tag': {
                this.router.navigate([`/tags/${id}`], option);
                break;
            }
            case 'Role-Document': {
                this.router.navigate([`/roles/${id}`], option);
                break;
            }
            case 'Synchronization Event': {
                this.router.navigate([`/events/${id}`], option);
                break;
            }
            case 'Contract': {
                this.router.navigate([`/contracts/${id}`], option);
                break;
            }
            default: {
                //TODO
                debugger;
                this.router.navigate([`/messages/${id}`], option);
                break;
            }
        }
    }

    protected abstract onNavigate(): void;

    protected abstract loadData(): void;

    protected abstract getTabIndex(name: string): number;

    protected abstract getTabName(index: number): string;
}

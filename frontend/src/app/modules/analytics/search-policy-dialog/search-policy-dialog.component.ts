import { Component } from '@angular/core';
import { FormControl, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { concatMap, debounceTime, distinctUntilChanged, finalize, map, scan, startWith, Subject, switchMap, takeUntil, takeWhile, tap } from 'rxjs';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ToolsService } from 'src/app/services/tools.service';

/**
 * Search policy dialog.
 */
@Component({
    selector: 'search-policy-dialog',
    templateUrl: './search-policy-dialog.component.html',
    styleUrls: ['./search-policy-dialog.component.scss']
})
export class SearchPolicyDialog {
    public loading = false;
    public policy: any = null;
    public filtersForm = new UntypedFormGroup({
        policyName: new UntypedFormControl(''),
        type: new UntypedFormControl('Owned'),
        owner: new UntypedFormControl(''),
        tokens: new UntypedFormControl(false),
        vcDocuments: new UntypedFormControl(false),
        vpDocuments: new UntypedFormControl(false),
        tokensCount: new UntypedFormControl(1),
        vcDocumentsCount: new UntypedFormControl(1),
        vpDocumentsCount: new UntypedFormControl(1),
        toolMessageIds: new UntypedFormControl([])
    });
    public types = [{
        name: 'Search only imported',
        value: 'Owned'
    }, {
        name: 'Local Guardian search',
        value: 'Local'
    }, {
        name: 'Global search',
        value: 'Global'
    }];
    public options = [{
        name: 'Not selected',
        value: false
    }, {
        name: 'Yes',
        value: true
    }];
    public showMoreFilters = false;
    public list: any[] = [];
    public selectedAll: boolean = false;
    public count: number = 0;
    public filtersCount: number = 0;
    public error: string | null = null;

    public get globalType(): boolean {
        return this.filtersForm.value.type === 'Global';
    }

    tools: ToolOption[] = [];
    query = '';
    page = 0;
    pageSize = 50;
    total = 0;
    loadingms = false;             // вместо loadingms
    private search$ = new Subject<string>();
    private destroy$ = new Subject<void>();
    private loadingMore = false;
    private loadMore$ = new Subject<void>();
    searchCtrl = new FormControl<string>('', { nonNullable: true });

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private analyticsService: AnalyticsService,
        private policyEngineService: PolicyEngineService,
        private toolsService: ToolsService,
        private router: Router
    ) {
        this.policy = this.config.data.policy;

        const searchStream$ = this.search$.pipe(
            debounceTime(250),
            distinctUntilChanged(),
            map(q => (q ?? '').trim()),
            startWith('') // первая загрузка
        );
        
        this.searchCtrl.valueChanges
            .pipe(debounceTime(250), distinctUntilChanged())
            .subscribe(q => this.onSearchChange(q));

        searchStream$
            .pipe(
            switchMap(query => {
                return this.fetchPage(query, 0).pipe(
                tap((first: any) => {
                    this.tools = this.getToolOptions(first?.items);
                    this.total = first.total;
                    this.page = 0;
                }),
                switchMap(() =>
                    this.loadMore$.pipe(
                    scan(acc => acc + 1, 0),
                    concatMap(nextPage =>
                        this.fetchPage(query, nextPage).pipe(
                        tap(res => {
                            this.tools = this.getToolOptions([...this.tools, ...res.items]);
                            this.page = nextPage;
                        })
                        )
                    ),
                    takeWhile(() => this.tools.length < this.total, true)
                    )
                )
                );
            }),
            takeUntil(this.destroy$)
            )
            .subscribe();
    }

    private getToolOptions(tools: any) {
        if (tools?.length > 0) {
            console.log(tools);
            
            return tools.map((tool: any) => ({
                id: tool.messageId,
                label: tool.name
            }))
        }
        return [];
    }

    onSearchChange(value: string) {
        this.search$.next(value);
    }

    onLazyLoad(e: any) {
        const nearEnd = e?.last >= this.tools.length - 10;
        const hasMore = this.tools.length < this.total;
        if (nearEnd && hasMore && !this.loadingMore) this.loadMore$.next();
    }

    private fetchPage(query: string, page: number) {
        const firstPage = page === 0;
        this.loading = firstPage;
        this.loadingMore = !firstPage;

        return this.toolsService.page(page, this.pageSize, query).pipe(
            map((resp: any) => {
            const items = resp.body || [];
            const total =
                Number(resp.headers?.get?.('X-Total-Count')) ?? this.total ?? items.length;
            return { items, total };
            }),
            finalize(() => {
            this.loading = false;
            this.loadingMore = false;
            })
        );
    }



    ngOnInit() {
        this.load();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    public load() {
        this.loading = true;
        this.count = this.policy ? 1 : 0;

        this.filtersCount = 0;
        const filters = this.filtersForm.value;
        const options: any = {
            threshold: 0
        };
        options.type = filters.type;
        if (this.policy) {
            options.policyId = this.policy.id;
        }
        if (filters.policyName) {
            options.text = filters.policyName;
            this.filtersCount++;
        }
        if (filters.owner) {
            options.owner = filters.owner;
            this.filtersCount++;
        }
        if (filters.tokens) {
            options.minTokensCount = filters.tokensCount || 1;
            this.filtersCount++;
        }
        if (filters.vcDocuments) {
            options.minVcCount = filters.vcDocumentsCount || 1;
            this.filtersCount++;
        }
        if (filters.vpDocuments) {
            options.minVpCount = filters.vpDocumentsCount || 1;
            this.filtersCount++;
        }
        if (filters.toolMessageIds) {
            options.toolMessageIds = filters.toolMessageIds;
            this.filtersCount++;
        }
        this.error = null;
        this.analyticsService.searchPolicies(options)
            .subscribe((data) => {
                this.loading = false;
                if (!data || !data.result) {
                    return;
                }
                const { target, result } = data;
                this.list = result;
                for (const item of this.list) {
                    if (item.rate) {
                        if (item.rate >= 80) {
                            item._color = 'item-color-green';
                        } else if (item.rate >= 40) {
                            item._color = 'item-color-yellow';
                        } else {
                            item._color = 'item-color-red';
                        }
                    } else {
                        item._color = 'item-color-red';
                    }
                    item._tags = item.tags.join(', ');
                }
                this.loading = false;
                this.select();
            }, (error) => {
                this.error = error?.error?.message;
                this.list = [];
                this.loading = false;
                console.error(error);
            });
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCompare() {
        const items = [];
        if (this.policy) {
            items.push({
                type: 'id',
                value: this.policy.id
            })
        }
        const type = this.filtersForm.value.type;
        for (const item of this.list) {
            if (item._select) {
                if (type === 'Global') {
                    items.push({
                        type: 'message',
                        name: item.messageId,
                        value: item.messageId
                    })
                } else {
                    items.push({
                        type: 'id',
                        name: item.name,
                        value: item.id
                    })
                }
            }
        }
        this.ref.close(items);
    }

    public changeType(): void {
        this.loading = true;
        setTimeout(() => {
            this.selectedAll = false;
            this.select();
            this.filtersForm.setValue({
                type: this.filtersForm.value.type,
                policyName: '',
                owner: '',
                tokens: false,
                vcDocuments: false,
                vpDocuments: false,
                tokensCount: 1,
                vcDocumentsCount: 1,
                vpDocumentsCount: 1
            })
            this.load();
        }, 0);
    }

    public clearFilters(): void {
        this.selectedAll = false;
        this.filtersForm.setValue({
            policyName: '',
            type: this.filtersForm.value.type,
            owner: '',
            tokens: false,
            vcDocuments: false,
            vpDocuments: false,
            tokensCount: 1,
            vcDocumentsCount: 1,
            vpDocumentsCount: 1
        })
        this.select();
        this.load();
    }

    public showFilters(): void {
        this.showMoreFilters = !this.showMoreFilters;
    }

    public applyFilters(): void {
        this.load();
    }

    public onSelectAll() {
        this.selectedAll = !this.selectedAll;
        if (this.list) {
            for (const item of this.list) {
                item._select = this.selectedAll;
            }
        }
        this.select();
    }

    public onSelect(item: any) {
        item._select = !item._select;
        this.select();
    }

    public select() {
        this.count = 0;
        if (this.list) {
            for (const item of this.list) {
                if (item._select) {
                    this.count++;
                }
            }
        }
        this.selectedAll = this.count === this.list.length && this.list.length > 0;
        if (this.policy) {
            this.count++;
        }
    }

    public importPolicy(item: any) {
        this.loading = true;
        this.policyEngineService
            .pushImportByMessage(item.messageId)
            .subscribe((result) => {
                const { taskId, expectation } = result;
                this.router.navigate(['task', taskId], {
                    queryParams: {
                        last: btoa(location.href),
                    },
                });
                this.loading = false;
                this.ref.close(null);
            }, (e) => {
                this.loading = false;
            });
    }
}

class ToolOption {
    id: string;
    label: string;
}
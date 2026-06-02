import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { CompareStorage } from 'src/app/services/compare-storage.service';

enum ItemType {
    Document = 'document',
    Policy = 'policy',
    Module = 'module',
    Schema = 'schema',
    Tool = 'tool'
}

@Component({
    selector: 'app-compare',
    templateUrl: './compare.component.html',
    styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit {
    public eventOptions = [
        { label: 'Exclude events', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public propertyOptions = [
        { label: 'Exclude properties', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public childrenOptions = [
        { label: 'Exclude child blocks', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public uuidOptions = [
        { label: 'Exclude ID', value: '0' },
        { label: 'Strict comparison', value: '1' }
    ];

    public typeOptions: any[] = [
        { label: 'Tree', value: 'tree' },
        { label: 'Table', value: 'table' }
    ];

    public loading: boolean = true;
    public visibleType: string = this.typeOptions[0].value;
    public eventsLvl: string = this.eventOptions[2].value;
    public propLvl: string = this.propertyOptions[2].value;
    public childrenLvl: string = this.childrenOptions[2].value;
    public idLvl: string = this.uuidOptions[0].value;
    public needApplyFilters: boolean = false;
    public result: any;
    public total: any;

    public type: ItemType;
    public items: any[] = [];
    public parent: any;
    public error: any;

    public get isEventsLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isPropertiesLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isChildrenLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isUUIDLvl(): boolean {
        return this.type !== ItemType.Document;
    }

    public get isApplyBtn(): boolean {
        return this.type !== ItemType.Document;
    }

    public get isDocuments(): boolean {
        return this.type === ItemType.Document;
    }

    public get isMultiPolicies(): boolean {
        return this.type === ItemType.Policy && this.items.length > 2;
    }

    public get isPolicies(): boolean {
        return this.type === ItemType.Policy && this.items.length < 3;
    }

    public get isModules(): boolean {
        return this.type === ItemType.Module;
    }

    public get isSchemas(): boolean {
        return this.type === ItemType.Schema;
    }

    public get isTools(): boolean {
        return this.type === ItemType.Tool;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private analyticsService: AnalyticsService,
        private compareStorage: CompareStorage
    ) {
    }

    ngOnInit() {
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
    }

    loadData() {
        this.needApplyFilters = false;
        this.loading = true;
        this.type = this.route.snapshot.queryParams['type'] || '';
        const config = this.route.snapshot.queryParams['items'] || '';
        const policyId = this.route.snapshot.queryParams['policyId'] || '';

        if(policyId) {
            this.loadOriginalPolicy(policyId);
        } else {
            this.parsConfig(config);

            this.result = null;

            if (this.type === ItemType.Policy) {
                this.loadPolicy();
            } else if (this.type === ItemType.Schema) {
                this.loadSchema();
            } else if (this.type === ItemType.Module) {
                this.loadModule();
            } else if (this.type === ItemType.Document) {
                this.loadDocument();
            } else if (this.type === ItemType.Tool) {
                this.loadTool();
            } else {
                this.loading = false;
            }
        }
    }

    private parsConfig(config: string) {
        try {
            const json = atob(config);
            const params = JSON.parse(json);
            const parent = params.parent;
            const items = params.items;
            this.parent = parent;
            this.items = items || [];
        } catch (error) {
            console.error(error)
        }
    }

    private getIds(): string[] {
        return this.items.map((item) => item.value);
    }

    private getItems(): any[] {
        const results = [];
        for (const item of this.items) {
            const result = { ...item };
            if (item.type === 'file') {
                const file = this.compareStorage.getFile(item.value);
                if (!file) {
                    continue;
                }
                result.value = file;
            } else if (item.type === 'policy-file') {
                const file = this.compareStorage.getFile(item.policy);
                if (!file) {
                    continue;
                }
                result.policy = file;
            }
            results.push(result)
        }
        return results;
    }

    private loadDocument() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            documentIds: this.getIds()
        }
        if (!options.documentIds || options.documentIds.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.compareDocuments(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private downloadDocuments() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            documentIds: this.getIds()
        }
        if (!options.documentIds || options.documentIds.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.compareDocumentsFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }
    private loadOriginalPolicy(policyId: string) {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            policies: this.getItems()
        }
        this.analyticsService.comparePolicyOriginal(policyId, options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadPolicy() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            policies: this.getItems()
        }
        if (!options.policies || options.policies.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.comparePolicy(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private downloadPolicy() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            policies: this.getItems()
        }
        if (!options.policies || options.policies.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.comparePolicyFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadSchema() {
        this.error = null;
        const ids = this.getItems();
        if (!ids || ids.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        const options = {
            idLvl: this.idLvl,
            schemas: ids
        }
        this.analyticsService.compareSchema(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private downloadSchema() {
        this.error = null;
        const ids = this.getItems();
        if (!ids || ids.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        const options = {
            idLvl: this.idLvl,
            schemas: ids
        }
        this.analyticsService.compareSchemaFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadModule() {
        this.error = null;
        const ids = this.getIds();
        if (!ids || ids.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            moduleId1: ids[0],
            moduleId2: ids[1]
        }
        this.analyticsService.compareModule(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private downloadModule() {
        this.error = null;
        const ids = this.getIds();
        if (!ids || ids.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            moduleId1: ids[0],
            moduleId2: ids[1]
        }
        this.analyticsService.compareModuleFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadTool() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            toolIds: this.getIds()
        }
        if (!options.toolIds || options.toolIds.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.compareTools(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private downloadTools() {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
            toolIds: this.getIds()
        }
        if (!options.toolIds || options.toolIds.length < 2) {
            this.error = 'Invalid params';
            this.loading = false;
            return;
        }
        this.analyticsService.compareToolsFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    onChange(event: any) {
        if (event.type === 'params') {
            this.onFilters(event);
        } else if (event.type === 'schema') {
            this.compareSchema(event);
        }
    }

    onFilters(event: any) {
        this.eventsLvl = event.eventsLvl;
        this.propLvl = event.propLvl;
        this.childrenLvl = event.childrenLvl;
        this.idLvl = event.idLvl;
        this.loadData();
    }

    private compareSchema(event: any) {
        const schemaIds = event.schemaIds;
        const params = {
            parent: {
                parent: this.parent,
                items: this.items
            },
            items: schemaIds
        }
        const items = btoa(JSON.stringify(params));
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'schema',
                items
            }
        });
    }

    onBack() {
        const items = btoa(JSON.stringify(this.parent));
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'policy',
                items
            }
        });
    }

    onApply() {
        this.loadData();
    }

    onExport() {
        if (this.type === ItemType.Policy) {
            this.downloadPolicy();
        } else if (this.type === ItemType.Schema) {
            this.downloadSchema();
        } else if (this.type === ItemType.Module) {
            this.downloadModule();
        } else if (this.type === ItemType.Tool) {
            this.downloadTools();
        } else if (this.type === ItemType.Document) {
            this.downloadDocuments();
        }
    }

    downloadObjectAsJson(csvContent: any, exportName: string) {
        const data = csvContent.replace('text/csv;charset=utf-8;', '');
        var blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', exportName + '.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    onFilterChange() {
        this.needApplyFilters = true;
    }

}

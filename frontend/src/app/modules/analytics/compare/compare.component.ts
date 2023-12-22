import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';

enum ItemType {
    Document = 'document',
    MultiPolicy = 'multi-policy',
    Policy = 'policy',
    Module = 'module',
    Schema = 'schema',
    Tool = 'tool'
}

@Component({
    selector: 'app-compare',
    templateUrl: './compare.component.html',
    styleUrls: ['./compare.component.css']
})
export class CompareComponent implements OnInit {
    loading: boolean = true;
    type: ItemType;
    policyId1: any;
    policyId2: any;
    schemaId1: any;
    schemaId2: any;
    moduleId1: any;
    moduleId2: any;
    policyIds: any;
    documentId1: any;
    documentId2: any;
    documentIds: any;
    toolId1: any;
    toolId2: any;
    toolIds: any;
    ids: any;
    result: any;
    eventsLvl = '1';
    propLvl = '2';
    childrenLvl = '2';
    idLvl = '0';
    visibleType = 'tree';
    total: any;
    needApplyFilters: any;

    public get isEventsLvl(): boolean {
        return this.type === ItemType.Policy || this.type === ItemType.MultiPolicy;
    }

    public get isPropertiesLvl(): boolean {
        return this.type === ItemType.Policy || this.type === ItemType.MultiPolicy;
    }

    public get isChildrenLvl(): boolean {
        return this.type === ItemType.Policy || this.type === ItemType.MultiPolicy;
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
        return this.type === ItemType.MultiPolicy;
    }

    public get isPolicies(): boolean {
        return this.type === ItemType.Policy;
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
        private analyticsService: AnalyticsService
    ) {
    }

    ngOnInit() {
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
        // this.loadData();
    }

    loadData() {
        this.needApplyFilters = false;
        this.loading = true;
        this.type = this.route.snapshot.queryParams['type'] || '';
        this.policyId1 = this.route.snapshot.queryParams['policyId1'] || '';
        this.policyId2 = this.route.snapshot.queryParams['policyId2'] || '';
        this.schemaId1 = this.route.snapshot.queryParams['schemaId1'] || '';
        this.schemaId2 = this.route.snapshot.queryParams['schemaId2'] || '';
        this.moduleId1 = this.route.snapshot.queryParams['moduleId1'] || '';
        this.moduleId2 = this.route.snapshot.queryParams['moduleId2'] || '';
        this.policyIds = this.route.snapshot.queryParams['policyIds'] || [];
        this.documentId1 = this.route.snapshot.queryParams['documentId1'] || '';
        this.documentId2 = this.route.snapshot.queryParams['documentId2'] || '';
        this.documentIds = this.route.snapshot.queryParams['documentIds'] || [];
        this.toolId1 = this.route.snapshot.queryParams['toolId1'] || '';
        this.toolId2 = this.route.snapshot.queryParams['toolId2'] || '';
        this.toolIds = this.route.snapshot.queryParams['toolIds'] || [];
        this.ids = this.route.snapshot.queryParams['ids'] || [];
        this.result = null;

        if (this.type === ItemType.Policy) {
            this.loadPolicy();
        } else if (this.type === ItemType.Schema) {
            this.loadSchema();
        } else if (this.type === ItemType.Module) {
            this.loadModule();
        } else if (this.type === ItemType.MultiPolicy) {
            this.loadMultiPolicy();
        } else if (this.type === ItemType.Document) {
            this.loadDocument();
        } else if (this.type === ItemType.Tool) {
            this.loadTool();
        } else {
            this.loading = false;
        }
    }

    private loadDocument() {
        const options: any = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
        }
        if (Array.isArray(this.documentIds) && this.documentIds.length > 1) {
            options.documentIds = this.documentIds;
        } else if (this.documentId1 && this.documentId2) {
            options.documentId1 = this.documentId1;
            options.documentId2 = this.documentId2;
        } else {
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

    private loadMultiPolicy() {
        const options = {
            policyIds: this.policyIds,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
        }
        this.analyticsService.comparePolicy(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 1500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadPolicy() {
        const options = {
            policyId1: this.policyId1,
            policyId2: this.policyId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private loadSchema() {
        const options = {
            schemaId1: this.schemaId1,
            schemaId2: this.schemaId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private loadModule() {
        const options = {
            moduleId1: this.moduleId1,
            moduleId2: this.moduleId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private loadTool() {
        const options: any = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
        }
        if (Array.isArray(this.toolIds) && this.toolIds.length > 1) {
            options.toolIds = this.toolIds;
        } else if (Array.isArray(this.ids) && this.ids.length > 1) {
            options.toolIds = this.ids;
        } else if (this.toolId1 && this.toolId2) {
            options.toolId1 = this.toolId1;
            options.toolId2 = this.toolId2;
        } else {
            this.loading = false;
            return;
        }
        this.analyticsService.compareTools(options).subscribe((value) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({message}) => {
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

    compareSchema(event: any) {
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'schema',
                policyId1: this.policyId1,
                policyId2: this.policyId2,
                schemaId1: event.schemaId1,
                schemaId2: event.schemaId2
            }
        });
    }

    onBack() {
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'policy',
                policyId1: this.policyId1,
                policyId2: this.policyId2,
                schemaId1: undefined,
                schemaId2: undefined
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
        } else if (this.type === ItemType.MultiPolicy) {
            this.downloadMultiPolicy();
        } else if (this.type === ItemType.Tool) {
            this.downloadTools();
        } else if (this.type === ItemType.Document) {
            this.downloadDocuments();
        }
    }

    private downloadDocuments() {
        const options: any = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
        }
        if (Array.isArray(this.documentIds) && this.documentIds.length > 1) {
            options.documentIds = this.documentIds;
        } else if (this.documentId1 && this.documentId2) {
            options.documentId1 = this.documentId1;
            options.documentId2 = this.documentId2;
        } else {
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

    private downloadMultiPolicy() {
        const options = {
            policyIds: this.policyIds,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private downloadPolicy() {
        const options = {
            policyId1: this.policyId1,
            policyId2: this.policyId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private downloadModule() {
        const options = {
            moduleId1: this.moduleId1,
            moduleId2: this.moduleId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private downloadSchema() {
        const options = {
            schemaId1: this.schemaId1,
            schemaId2: this.schemaId2,
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
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

    private downloadTools() {
        const options: any = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl
        }
        if (Array.isArray(this.toolIds) && this.toolIds.length > 1) {
            options.toolIds = this.toolIds;
        } else if (Array.isArray(this.ids) && this.ids.length > 1) {
            options.toolIds = this.ids;
        } else if (this.toolId1 && this.toolId2) {
            options.toolId1 = this.toolId1;
            options.toolId2 = this.toolId2;
        } else {
            this.loading = false;
            return;
        }
        this.analyticsService.compareToolsFile(options, 'csv').subscribe((data) => {
            if (data) {
                this.downloadObjectAsJson(data, 'report');
            }
            this.loading = false;
        }, ({message}) => {
            this.loading = false;
            console.error(message);
        });
    }

    downloadObjectAsJson(csvContent: any, exportName: string) {
        const data = csvContent.replace('text/csv;charset=utf-8;', '');
        var blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement("a");
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", exportName + '.csv');
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

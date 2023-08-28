import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';

@Component({
    selector: 'app-compare',
    templateUrl: './compare.component.html',
    styleUrls: ['./compare.component.css']
})
export class CompareComponent implements OnInit {
    loading: boolean = true;
    type: any;
    policyId1: any;
    policyId2: any;
    schemaId1: any;
    schemaId2: any;
    moduleId1: any;
    moduleId2: any;
    policyIds: any;
    result: any;
    eventsLvl = '1';
    propLvl = '2';
    childrenLvl = '2';
    idLvl = '0';
    visibleType = 'tree';
    total: any;
    needApplyFilters: any;

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
        this.result = null;

        if (this.type === 'policy') {
            this.loadPolicy();
        } else if (this.type === 'schema') {
            this.loadSchema();
        } else if (this.type === 'module') {
            this.loadModule();
        } else if (this.type === 'multi-policy') {
            this.loadMultiPolicy();
        } else {
            this.loading = false;
        }
    }

    loadMultiPolicy() {
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

    loadPolicy() {
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

    loadSchema() {
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

    loadModule() {
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
        if (this.type === 'policy') {
            this.downloadPolicy();
        } else if (this.type === 'schema') {
            this.downloadSchema();
        } else if (this.type === 'module') {
            this.downloadModule();
        } else if (this.type === 'multi-policy') {
            this.downloadMultiPolicy();
        }
    }

    downloadMultiPolicy() {
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

    downloadPolicy() {
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

    downloadModule() {
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

    downloadSchema() {
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

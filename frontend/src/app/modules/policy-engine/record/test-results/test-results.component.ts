import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';

/**
 * Component for show test results
 */
@Component({
    selector: 'app-test-results',
    templateUrl: './test-results.component.html',
    styleUrls: ['./test-results.component.scss'],
    standalone: false
})
export class TestResultsComponent implements OnInit {
    public loading: boolean = true;
    public testId: string;
    public policyId: string;
    public owner: any;
    public results: any;
    public policyName: string = '';
    public testName: string = '';
    public testStatus: string = '';
    public docOptions: { label: string, value: string }[] = [];
    public selectedDoc: string | null = null;
    public fieldStatusFilter: string = 'all';
    public fieldNameFilter: string | null = null;
    public fieldNameOptions: { label: string, value: string }[] = [];

    constructor(
        private policyEngineService: PolicyEngineService,
        public profileService: ProfileService,
        public route: ActivatedRoute,
        public router: Router,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.route.queryParams.subscribe(queryParams => {
            this.loadData();
        });
    }

    private loadData() {
        this.loading = true;
        this.testId = this.route.snapshot.queryParams.testId;
        this.policyId = this.route.snapshot.queryParams.policyId;
        const docFilter: string = this.route.snapshot.queryParams.docFilter || '';
        this.policyName = this.route.snapshot.queryParams.policyName || '';
        this.testName = this.route.snapshot.queryParams.testName || this.testId;
        this.testStatus = this.route.snapshot.queryParams.testStatus || '';
        this.docOptions = [];

        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.getTestDetails(this.policyId, this.testId)
        ]).subscribe(([profile, results]) => {
            this.owner = profile?.did;
            if (docFilter) {
                const selected = new Set(docFilter.split(','));
                const report = results?.documents?.report;
                if (report && report.length > 1) {
                    const filteredRows = report.slice(1).filter((_: any, i: number) => selected.has(String(i)));
                    const recalcTotal = filteredRows.length
                        ? Math.round(filteredRows.reduce((s: number, r: any) => s + (parseFloat(r.total_rate) || 0), 0) / filteredRows.length)
                        : 0;
                    results = {
                        ...results,
                        total: recalcTotal,
                        documents: {
                            ...results.documents,
                            report: [report[0], ...filteredRows]
                        }
                    };
                }
            }
            this.results = results;
            const report = this.results?.documents?.report;
            if (report && report.length > 1) {
                const docItems: { label: string, value: string }[] = [];
                report.slice(1).forEach((row: any, i: number) => {
                    if (row.left_schema) {
                        docItems.push({ label: row.left_schema, value: String(i) });
                    }
                });
                this.docOptions = [{ label: 'Collapse all', value: '__top__' }, ...docItems];

                const namesSet = new Set<string>();
                for (const row of report.slice(1)) {
                    for (const docField of (row.documents || [])) {
                        const item = docField.items?.[0] || docField.items?.[1];
                        if (item?.name) { namesSet.add(item.name); }
                    }
                }
                this.fieldNameOptions = [
                    { label: 'All fields', value: '' },
                    ...[...namesSet].sort().map((n: string) => ({ label: n, value: n }))
                ];
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
            console.error(e);
        });
    }

    public get computedDocOptions(): { label: string, value: string, disabled?: boolean }[] {
        return this.docOptions.map((opt) =>
            opt.value === '__top__' ? { ...opt, disabled: !this.selectedDoc } : opt
        );
    }

    public onDocSelect(value: string): void {
        if (value === '__top__') {
            document.getElementById('doc-row-0')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => { this.selectedDoc = null; }, 0);
        }
    }

    public onDocumentOpen(value: string): void {
        this.selectedDoc = value;
    }

    public onDocumentClose(value: string): void {
        if (this.selectedDoc === value) {
            this.selectedDoc = null;
        }
    }

    public onBack(): void {
        this.router.navigate(['/policy-viewer'], {
            queryParams: {
                openTestsFor: this.policyId,
                openTestId: this.testId
            }
        });
    }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PanelModule } from 'primeng/panel';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { SearchService } from '@services/search.service';
import {
    AdvancedSearchParams,
    AdvancedSearchResult,
    AdvancedSearchResultItem,
    ConditionOperator,
} from '@indexer/interfaces';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { Subject, takeUntil } from 'rxjs';

export const DOCUMENT_TYPES = [
    'VC-Document',
    'EVC-Document',
    'VP-Document',
    'DID-Document',
    'Policy',
    'Instance-Policy',
    'Schema',
    'Module',
    'Tool',
    'Tag',
    'Role-Document',
    'Standard Registry',
    'Topic',
    'Contract',
    'Synchronization Event',
];

export const OPERATORS: Array<{ label: string; value: ConditionOperator }> = [
    { label: 'equals',          value: 'eq' },
    { label: 'not equals',      value: 'neq' },
    { label: 'contains',        value: 'contains' },
    { label: 'matches regex',   value: 'regex' },
    { label: 'greater than',    value: 'gt' },
    { label: 'greater or equal',value: 'gte' },
    { label: 'less than',       value: 'lt' },
    { label: 'less or equal',   value: 'lte' },
    { label: 'between',         value: 'between' },
    { label: 'in list',         value: 'in' },
    { label: 'not in list',     value: 'not_in' },
];

/** Operators that need a "to" value */
const RANGE_OPERATORS: ConditionOperator[] = ['between'];
/** Operators where value is a comma-separated list */
const LIST_OPERATORS: ConditionOperator[] = ['in', 'not_in'];

@Component({
    selector: 'app-advanced-search',
    templateUrl: './advanced-search.component.html',
    styleUrl: './advanced-search.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatInputModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatExpansionModule,
        MatDividerModule,
        MatChipsModule,
        TranslocoModule,
        ButtonModule,
        InputTextModule,
        DropdownModule,
        PanelModule,
        TagModule,
        TooltipModule,
        TableComponent,
    ],
})
export class AdvancedSearchViewComponent implements OnInit, OnDestroy {
    public loading = false;
    public results: AdvancedSearchResultItem[] = [];
    public columns: any[] = [];
    public total = 0;
    public pageIndex = 0;
    public pageSize = 10;
    public pageSizeOptions = [5, 10, 25, 100];
    public searchToken: string | null = null;
    public errorMessage: string | null = null;

    public readonly documentTypes = DOCUMENT_TYPES;
    public readonly operators = OPERATORS;

    public form: FormGroup;

    private _destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private searchService: SearchService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.form = this.fb.group({
            steps: this.fb.array([this._buildStep()]),
            displayColumns: this.fb.array([
                this._buildColumn('type', 'Type'),
                this._buildColumn('consensusTimestamp', 'Timestamp'),
                this._buildColumn('topicId', 'Topic ID'),
                this._buildColumn('owner', 'Owner'),
            ]),
        });
    }

    get steps(): FormArray {
        return this.form.get('steps') as FormArray;
    }

    get displayColumnsArr(): FormArray {
        return this.form.get('displayColumns') as FormArray;
    }

    ngOnInit(): void {
        // Restore from URL search token if present
        this.route.queryParams.pipe(takeUntil(this._destroy$)).subscribe((params) => {
            if (params['token']) {
                this._restoreFromToken(params['token']);
            }
            if (params['pageIndex']) {
                this.pageIndex = Number(params['pageIndex']);
                this.pageSize = Number(params['pageSize'] ?? 10);
            }
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    // ── Form helpers ──────────────────────────────────────────────────────────

    private _buildStep(type = '', label = ''): FormGroup {
        return this.fb.group({
            label:       [label],
            type:        [type],
            conditions:  this.fb.array([this._buildCondition()]),
            carryFields: [''],
        });
    }

    private _buildCondition(field = '', operator: ConditionOperator = 'eq', value = '', valueTo = ''): FormGroup {
        return this.fb.group({
            field:    [field, Validators.required],
            operator: [operator, Validators.required],
            value:    [value,  Validators.required],
            valueTo:  [valueTo],
        });
    }

    private _buildColumn(field = '', header = ''): FormGroup {
        return this.fb.group({ field: [field], header: [header] });
    }

    addStep(): void {
        this.steps.push(this._buildStep());
    }

    removeStep(i: number): void {
        if (this.steps.length > 1) { this.steps.removeAt(i); }
    }

    getConditions(stepIdx: number): FormArray {
        return this.steps.at(stepIdx).get('conditions') as FormArray;
    }

    addCondition(stepIdx: number): void {
        this.getConditions(stepIdx).push(this._buildCondition());
    }

    removeCondition(stepIdx: number, condIdx: number): void {
        const conds = this.getConditions(stepIdx);
        if (conds.length > 1) { conds.removeAt(condIdx); }
    }

    addColumn(): void {
        this.displayColumnsArr.push(this._buildColumn());
    }

    removeColumn(i: number): void {
        this.displayColumnsArr.removeAt(i);
    }

    isRangeOp(operator: ConditionOperator): boolean {
        return RANGE_OPERATORS.includes(operator);
    }

    isListOp(operator: ConditionOperator): boolean {
        return LIST_OPERATORS.includes(operator);
    }

    // ── Search ────────────────────────────────────────────────────────────────

    onSubmit(): void {
        this.pageIndex = 0;
        this._runSearch();
    }

    onPage(event: { pageIndex: number; pageSize: number }): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this._runSearch();
    }

    private _runSearch(): void {
        this.errorMessage = null;
        const params = this._buildParams();
        this.loading = true;

        this.searchService.advancedSearch(params).pipe(takeUntil(this._destroy$)).subscribe({
            next: (result: AdvancedSearchResult) => {
                this.results = result.items ?? [];
                this.total   = result.total ?? 0;
                this.searchToken = result.searchToken ?? null;
                this._buildColumns(result.columns);

                // Persist state in URL
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {
                        token: this.searchToken,
                        pageIndex: this.pageIndex,
                        pageSize: this.pageSize,
                    },
                    replaceUrl: true,
                });

                this.loading = false;
            },
            error: (err: any) => {
                this.errorMessage = err?.error?.message ?? err?.message ?? 'Search failed';
                this.loading = false;
            },
        });
    }

    private _buildParams(): AdvancedSearchParams {
        const raw = this.form.value;
        return {
            steps: raw.steps.map((s: any) => ({
                label: s.label || undefined,
                type:  s.type  || undefined,
                conditions: s.conditions.map((c: any) => ({
                    field:    c.field,
                    operator: c.operator as ConditionOperator,
                    value:    this.isListOp(c.operator)
                        ? c.value.split(',').map((v: string) => v.trim()).filter(Boolean)
                        : c.value,
                    valueTo:  this.isRangeOp(c.operator) ? c.valueTo : undefined,
                })),
                carryFields: s.carryFields
                    ? s.carryFields.split(',').map((f: string) => f.trim()).filter(Boolean)
                    : undefined,
            })),
            displayColumns: raw.displayColumns
                .filter((c: any) => c.field)
                .map((c: any) => ({ field: c.field, header: c.header || c.field })),
            pageIndex: this.pageIndex,
            pageSize:  this.pageSize,
        };
    }

    private _buildColumns(cols: Array<{ field: string; header: string }>): void {
        this.columns = [
            ...cols.map((c) => ({
                type: ColumnType.TEXT,
                title: c.header,
                field: c.field,
                width: '200px',
            })),
            {
                type: ColumnType.BUTTON,
                title: '',
                btn_label: 'Open',
                width: '80px',
                callback: this.onOpen.bind(this),
            },
        ];
    }

    private _restoreFromToken(token: string): void {
        try {
            const params: AdvancedSearchParams = JSON.parse(
                Buffer.from(token, 'base64').toString('utf-8')
            );
            // Rebuild form from params
            while (this.steps.length) { this.steps.removeAt(0); }
            for (const step of params.steps) {
                const stepGroup = this._buildStep(step.type ?? '', step.label ?? '');
                const condsArray = stepGroup.get('conditions') as FormArray;
                while (condsArray.length) { condsArray.removeAt(0); }
                for (const cond of step.conditions) {
                    const val = Array.isArray(cond.value) ? cond.value.join(', ') : String(cond.value);
                    condsArray.push(this._buildCondition(cond.field, cond.operator, val, String(cond.valueTo ?? '')));
                }
                (stepGroup.get('carryFields') as any).setValue(
                    (step.carryFields ?? []).join(', ')
                );
                this.steps.push(stepGroup);
            }
            if (params.displayColumns?.length) {
                while (this.displayColumnsArr.length) { this.displayColumnsArr.removeAt(0); }
                for (const col of params.displayColumns) {
                    this.displayColumnsArr.push(this._buildColumn(col.field, col.header));
                }
            }
        } catch { /* ignore malformed token */ }
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    public onOpen(item: AdvancedSearchResultItem): void {
        const ts = item.consensusTimestamp;
        if (!ts) { return; }
        switch (item.type) {
            case 'EVC-Document':
            case 'VC-Document':              this.router.navigate([`/vc-documents/${ts}`]);   break;
            case 'DID-Document':             this.router.navigate([`/did-documents/${ts}`]);  break;
            case 'Schema':                   this.router.navigate([`/schemas/${ts}`]);         break;
            case 'Policy':
            case 'Instance-Policy':          this.router.navigate([`/policies/${ts}`]);        break;
            case 'VP-Document':              this.router.navigate([`/vp-documents/${ts}`]);    break;
            case 'Standard Registry':        this.router.navigate([`/registries/${ts}`]);      break;
            case 'Topic':                    this.router.navigate([`/topics/${item.topicId}`]); break;
            case 'Module':                   this.router.navigate([`/modules/${ts}`]);          break;
            case 'Tool':                     this.router.navigate([`/tools/${ts}`]);            break;
            default: break;
        }
    }

    /** Copy the current search URL to clipboard */
    copyLink(): void {
        navigator.clipboard.writeText(window.location.href).catch(() => {});
    }

    /** Reset to empty form */
    resetForm(): void {
        while (this.steps.length) { this.steps.removeAt(0); }
        this.steps.push(this._buildStep());
        this.results = [];
        this.total = 0;
        this.searchToken = null;
        this.errorMessage = null;
        this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
}

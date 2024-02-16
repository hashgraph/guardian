import { Component, EventEmitter, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { saveAs } from 'file-saver';
import { ILog } from '@guardian/interfaces';
import * as moment from 'moment';
import { merge, of, Subscription } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap } from 'rxjs/operators';
import { LoggerService } from 'src/app/services/logger.service';
import { DetailsLogDialog } from '../details-log-dialog/details-log-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-logs-view',
    templateUrl: './logs-view.component.html',
    styleUrls: ['./logs-view.component.scss'],
})
export class LogsViewComponent implements OnInit, OnDestroy {
    @ViewChild('searchInput') searchInput: any;

    loading: boolean = true;
    logs: ILog[] = [];
    logColumns: string[] = [
        'type',
        'datetime',
        'message',
        'attributes',
        'details',
    ];
    selectedAll!: boolean;
    totalCount: number = 0;
    searchForm = this.fb.group({
        message: [''],
        type: [''],
        startDate: [''],
        endDate: [''],
        attributes: [[]],
    });
    autoCompleteControl = this.fb.control('');
    filters: any = {};
    attributes?: any;

    dateRangeForm: FormControl = new FormControl('');

    types: any = [
        { id: '', label: 'All' },
        { id: 'ERROR', label: 'Error' },
        { id: 'WARN', label: 'Warning' },
        { id: 'INFO', label: 'Info' },
    ];

    @ViewChild(MatAutocompleteTrigger) autocomplete: MatAutocompleteTrigger;
    onSearch: EventEmitter<any> = new EventEmitter();
    pageSize: number = 10;
    pageIndex: number = 0;
    selectedMessageType: any = this.types[3];
    dateRange: any;

    private subscriptions = new Subscription();

    get currentDate() {
        return new Date();
    };

    constructor(
        private fb: FormBuilder,
        private logService: LoggerService,
        public dialog: DialogService,
        private route: ActivatedRoute,
    ) {
    }

    onFilter(event: any) {
        event.originalEvent.preventDefault();

        this.autoCompleteControl.setValue(event.filter);
        return false;
    }

    ngOnInit() {
        this.logService.getAttributes(
            this.autoCompleteControl.value,
            this.searchForm?.get('attributes')?.value).subscribe(attrs => {
                this.attributes = attrs;
            });

        this.subscriptions.add(this.autoCompleteControl.valueChanges.pipe(debounceTime(500)).subscribe(searchValue => {
            this.logService.getAttributes(
                searchValue,
                this.searchForm?.get('attributes')?.value).subscribe(attrs => {
                this.searchInput._filteredOptions = attrs;
                this.attributes = attrs;
            });
        }));

        this.route.queryParams.subscribe((params) => {
            if (params.attr) {
                setTimeout(() => {
                    this.searchForm.patchValue({
                        attributes: [params.attr],
                    });
                    this.attributes.push(params.attr);
                    this.onApply();
                }, 500)

            }
            if (params.message) {
                try {
                    const message = atob(params.message);
                    this.searchForm.patchValue({
                        message,
                    });
                    setTimeout(() => {
                        this.onApply();
                    }, 500)
                } catch (error) {
                    return;
                }
            }
        });
        this.loading = false;
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();

    }

    ngAfterViewInit() {
        this.subscriptions.add(merge(this.onSearch)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.loading = true;
                    return this.logService!.getLogs({
                        ...this.filters,
                        pageSize: this.pageSize,
                        pageIndex: this.pageIndex,
                        sortDirection: 'desc',
                    }).pipe(catchError(() => of(null)));
                }),
                map((data: any) => {
                    this.loading = false;
                    if (data === null) {
                        return [];
                    }

                    this.totalCount = data.totalCount;
                    return data.logs;
                }),
            )
            .subscribe((data: any) => {
                this.logs = data.map((item: any) => {
                    item.datetime = moment(item.datetime)
                        .local()
                        .format('YYYY-MM-DD HH:mm:ss');
                    return item;
                });
            })
        );
    }

    remove(attribute: string) {
        const attributes = this.searchForm.get('attributes')!.value;
        const index = attributes.indexOf(attribute);
        if (index >= 0) {
            attributes.splice(index, 1);
        }
        this.onApply();
    }

    add(event: MatChipInputEvent, auto: any): void {
        const value = (event.value || '').trim();
        const attributes = this.searchForm.get('attributes')!.value;

        if (value) {
            const attrList = this.logService.getAttributes(value, this.searchForm?.get('attributes')?.value).subscribe(attrs => {
                const firstAttr = attrs[0];
                if (firstAttr) {
                    attributes.push(firstAttr);
                }
                event.chipInput!.clear();
                this.autocomplete.closePanel();
                this.autoCompleteControl.patchValue('');
                this.onApply();
                attrList.unsubscribe();
            })
        } else {
            event.chipInput!.clear();
            this.onApply();
        }
    }

    onApply() {
        const value = this.searchForm.value;
        this.searchForm.markAsPristine();
        try {
            value.startDate = this.dateRangeForm.value[0];
            value.endDate = this.dateRangeForm.value[1];

        } catch {
            value.startDate = null;
            value.endDate = null;
        }

        this.filters = {
            type: value.type.id,
            startDate: value.startDate && new Date(value.startDate).toISOString(),
            endDate: value.endDate && new Date(value.endDate).toISOString(),
            attributes: value.attributes,
            message: value.message,
        };
        this.onSearch.emit();
    }

    onSave() {
        this.loading = true;
        this.logService.getLogs(this.filters).subscribe(
            (data) => {
                const logs = data.logs?.map((log: any) => {
                    let attributes = '';
                    if (log.attributes && log.attributes.length !== 0) {
                        attributes = `(${log.attributes.join(', ')})`;
                    }
                    return `[${log.type}] ${log.datetime} ${attributes} ${log.message}`;
                });

                if (!logs || logs.length === 0) {
                    return;
                }
                const blob = new Blob([logs.join('\r\n')], {
                    type: 'text/plain;charset=utf-8',
                });
                saveAs(blob, 'logs.txt');
                this.loading = false;
            },
            (error) => {
                this.loading = false;
            },
        );
    }

    selected(event: MatAutocompleteSelectedEvent): void {
        const value = (event.option.viewValue || '').trim();
        const attributes = this.searchForm.get('attributes')!.value;

        if (value) {
            attributes.push(value);
        }
        this.autoCompleteControl.patchValue('');
        this.onApply();
    }

    clearValues() {
        this.pageIndex = 0;
        this.dateRangeForm.reset();
        this.searchForm.patchValue({
            message: '',
            type: '',
            startDate: '',
            endDate: '',
            attributes: [],
        });
        this.dateRange = undefined;
        this.onApply();
    }

    openDetails(element: any) {
        this.dialog.open(DetailsLogDialog, {
            data: element,
            header: 'Details Log'
        }).onClose.subscribe(() => {
            return;
        })
    }

    changeTypeEvent(event: any) {
        this.searchForm.controls.type.setValue(event.id);
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.onApply();
    }
}

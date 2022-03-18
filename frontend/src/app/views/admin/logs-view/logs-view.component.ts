import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { saveAs } from 'file-saver';
import { ILog } from 'interfaces';
import { merge, Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { LoggerService } from 'src/app/services/logger.service';

/**
 * Page for creating, editing, importing and exporting schemes.
 */
@Component({
    selector: 'app-logs-view',
    templateUrl: './logs-view.component.html',
    styleUrls: ['./logs-view.component.css']
})
export class LogsViewComponent implements OnInit {
    loading: boolean = true;
    logs: ILog[] = [];
    logColumns: string[] = [
        'type',
        'datetime',
        'message',
        'attributes'
    ];
    selectedAll!: boolean;
    totalCount: number = 0;
    searchForm = this.fb.group({
        message: [''],
        type: [''],
        startDate: [''],
        endDate: [''],
        attributes: [[]]
    });
    autoCompleteControl = this.fb.control('');
    filters: any = {};
    attributes?: Observable<any>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    onSearch: EventEmitter<any> = new EventEmitter();

    constructor(
        private fb: FormBuilder,
        private logService: LoggerService,
        public dialog: MatDialog) {

    }

    ngOnInit() {
        this.attributes = this.autoCompleteControl.valueChanges
          .pipe(
            startWith([]),
            switchMap(value => this.logService.getAttributes(this.autoCompleteControl.value))
          );
      }

    ngAfterViewInit() {
        const resetPage = () => this.paginator.pageIndex = 0;
        this.sort.sortChange.subscribe(resetPage);
        this.onSearch.subscribe(resetPage);
        merge(this.sort.sortChange, this.paginator.page, this.onSearch)
          .pipe(
            startWith({}),
            switchMap(() => {
              this.loading = true;
              return this.logService!.getLogs({
                    ...this.filters,
                    pageSize: this.paginator.pageSize,
                    pageIndex: this.paginator.pageIndex,
                    sortDirection: this.sort.direction
                })
                .pipe(catchError(() => of(null)));
            }),
            map((data: any) => {
                this.loading = false;
                if (data === null) {
                    return [];
                }
                
                this.totalCount = data.totalCount;
                return data.logs;
            })
          ).subscribe((data: ILog[]) => this.logs = data);
      }

    remove(attribute: string) {
        const attributes = this.searchForm.get('attributes')!.value;
        const index = attributes.indexOf(attribute);
        if (index >= 0) {
            attributes.splice(index, 1);
        }
    }

    add(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        const attributes = this.searchForm.get('attributes')!.value;

        if (value) {
            attributes.push(value);
        }

        event.chipInput!.clear();
    }

    onApply() {
        const value = this.searchForm.value;
        this.filters = {
            type: value.type,
            startDate: value.startDate && value.startDate.toISOString(),
            endDate: value.endDate && value.endDate.toISOString(),
            attributes: value.attributes,
            message: value.message
        };
        this.onSearch.emit();
    }

    onSave() {
        this.loading = true;
        this.logService.getLogs(this.filters)
            .subscribe(data => {
                const logs = data.logs?.map((log: any) => {
                    let attributes = "";
                    if (log.attributes &&  log.attributes.length !== 0) {
                        attributes = `(${log.attributes.join(', ')})`;
                    }
                    return `[${log.type}] ${log.datetime} ${attributes} ${log.message}`;
                });

                if (!logs || logs.length === 0) {
                    return;
                }
                var blob = new Blob([logs.join('\r\n')], { type: "text/plain;charset=utf-8" });
                saveAs(blob, 'logs.txt');
                this.loading = false;
            }, (error) => {
                this.loading = false;
            });

    }

    selected(event: MatAutocompleteSelectedEvent): void {
        const value = (event.option.viewValue || '').trim();
        const attributes = this.searchForm.get('attributes')!.value;

        if (value) {
            attributes.push(value);
        }
        this.autoCompleteControl.patchValue('');
    }

    clearValues() {
        this.searchForm.patchValue({
            message: '',
            type: '',
            startDate: '',
            endDate: '',
            attributes: []
        });
    }
}
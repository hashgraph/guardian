import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';
import moment from 'moment';

/**
 * Component for display block of 'requestVcDocument' type.
 */
@Component({
    selector: 'filters-addon-block',
    templateUrl: './filters-addon-block.component.html',
    styleUrls: ['./filters-addon-block.component.scss']
})
export class FiltersAddonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @Input('savepointIds') savepointIds?: string[] | null = null;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    type: any;
    options: any;
    multioptions: any;
    content: any;
    target: any;
    filters: any;
    currentValue: any;
    currentType: string = 'eq';
    queryType: string = 'equal';
    valid: boolean = true;
    canBeEmpty: boolean = false;
    readonly: boolean = false;

    userDefinedOptions = [
        { name: 'Equal', value: 'eq' },
        { name: 'Not Equal', value: 'ne' },
        { name: 'In', value: 'in' },
        { name: 'Not In', value: 'nin' },
        { name: 'Greater Than', value: 'gt' },
        { name: 'Greater Than or Equal', value: 'gte' },
        { name: 'Less Than', value: 'lt' },
        { name: 'Less Than or Equal', value: 'lte' }
    ];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId, this.savepointIds)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    private parseFilterValue(value: string): [string, string | string[]] {
        if (typeof value === 'string') {
            if (value.startsWith('eq:')) {
                return ['eq', value.substring('eq'.length + 1)];
            }
            if (value.startsWith('ne:')) {
                return ['ne', value.substring('ne'.length + 1)];
            }
            if (value.startsWith('in:')) {
                return ['in', value.substring('in'.length + 1).split(',')];
            }
            if (value.startsWith('nin:')) {
                return ['nin', value.substring('nin'.length + 1).split(',')];
            }
            if (value.startsWith('gt:')) {
                return ['gt', value.substring('gt'.length + 1)];
            }
            if (value.startsWith('gte:')) {
                return ['gte', value.substring('gte'.length + 1)];
            }
            if (value.startsWith('lt:')) {
                return ['lt', value.substring('lt'.length + 1)];
            }
            if (value.startsWith('lte:')) {
                return ['lte', value.substring('lte'.length + 1)];
            }
            if (value.startsWith('regex:')) {
                return ['eq', value.substring('regex'.length + 1)];
            }
        }
        return ['eq', value];
    }

    setData(data: any) {
        this.currentValue = null;
        this.valid = true;
        if (data) {
            this.readonly = !!data.readonly;
            this.data = data.data;
            this.type = data.type;
            this.target = data.targetBlock;
            this.content = data.uiMetaData.content;
            this.filters = data.filters;
            this.canBeEmpty = data.canBeEmpty;

            this.queryType = data.queryType;
            if (this.queryType === 'user_defined') {
                const [type, value] = this.parseFilterValue(data.filterValue);
                this.currentType = type;
                this.currentValue = value;
            } else {
                this.currentType = this.queryType || 'eq';

                if (this.currentType === 'in' || this.currentType === 'not_in' || this.currentType === 'nin') {
                    if (Array.isArray(data.filterValue)) {
                        this.currentValue = data.filterValue;
                    } else if (typeof data.filterValue === 'string') {
                        this.currentValue = (data.filterValue).split(',');
                    } else {
                        this.currentValue = [];
                    }
                } else {
                    this.currentValue = data.filterValue;
                }
            }

            if (this.type == 'unelected') {
            }

            if (this.type == 'dropdown') {
                const options = data.data;
                this.options = [];
                if (data.canBeEmpty) {
                    this.options.push({
                        name: "Not selected",
                        value: null,
                    });
                }
                if (options) {
                    for (let i = 0; i < options.length; i++) {
                        const item = options[i];
                        this.options.push({
                            name: item.name,
                            value: String(item.value)
                        })
                    }
                }
                this.multioptions = this.options.filter((o: any) => o.value);
            }
        } else {
            this.data = null;
        }
    }

    onType(event: any) {
        if (this.currentType === 'in' || this.currentType === 'not_in' || this.currentType === 'nin') {
            this.currentValue = [];
        } else {
            this.currentValue = '';
        }
        this.valid = false;
    }

    onFilters(event: any) {
        this.valid = true;
        this.loading = true;
        let value = this.currentValue;
        if (this.type === 'datepicker') {
            value = moment(value).format('YYYY-MM-DD');
        }
        if (Array.isArray(value)) {
            value = value.join(',');
        }
        const options: any = { filterValue: null };
        if (!value) {
            if (this.canBeEmpty) {
                options.filterValue = null;
            } else {
                if (this.queryType === 'user_defined') {
                    options.filterValue = this.currentType + ':';
                } else {
                    options.filterValue = '';
                }
            }
        } else {
            if (this.queryType === 'user_defined') {
                options.filterValue = this.currentType + ':' + value;
            } else {
                options.filterValue = value;
            }
        }
        this.policyEngineService
            .setBlockData(this.id, this.policyId, options)
            .subscribe(() => {
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
    }
}

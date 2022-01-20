import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';

/**
 * Component for display block of 'requestVcDocument' type.
 */
@Component({
    selector: 'filters-addon-block',
    templateUrl: './filters-addon-block.component.html',
    styleUrls: ['./filters-addon-block.component.css']
})
export class FiltersAddonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    type: any;
    options: any;
    content: any;
    target: any;
    filters: any;
    currentValue: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        private policyHelper: PolicyHelper
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.policyEngineService.subscribe(this.onUpdate.bind(this));
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(id: string): void {
        if (this.id == id) {
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
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }


    setData(data: any) {
        this.currentValue = null;
        if (data) {
            this.data = data.data;
            this.type = data.type;
            this.target = data.targetBlock;
            this.content = data.uiMetaData.content;
            this.filters = data.filters;

            if (this.type == 'unelected') {
                this.currentValue = this.data;
            }

            if (this.type == 'dropdown') {
                this.currentValue = null;
                const options = data.options;
                this.options = [{
                    name: "",
                    value: null
                }];
                if (options) {
                    for (let i = 0; i < options.length; i++) {
                        const item = options[i];
                        this.options.push({
                            name: this.getObjectValue(item, data.name),
                            value: item
                        })
                    }
                }
            }
        } else {
            this.data = null;
        }
    }

    getObjectValue(data: any, value: any) {
        let result: any = null;
        if (data && value) {
            const keys = value.split('.');
            result = data;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                result = result[key];
            }
        }
        return result;
    }

    getFilters(data: any) {
        if (!data) {
            return null;
        }
        if (this.filters) {
            const filters: any = {};
            for (let i = 0; i < this.filters.length; i++) {
                const filter = this.filters[i];
                if (filter.type == 'object') {
                    filters[filter.name] = this.getObjectValue(data, filter.value);
                } else {
                    filters[filter.name] = filter.value;
                }
            }
            return filters;
        }
        return null;
    }

    onFilters() {
        const currentFilters = this.getFilters(this.currentValue);
        // this.loading = true;
        // this.policyEngineService.getGetIdByName(this.target, this.policyId).subscribe(({ id }: any) => {
        //     this.policyEngineService.getParents(id, this.policyId).subscribe((parents: any[]) => {
        //         this.loading = false;
        //         const filters: any = {};
        //         for (let index = parents.length - 1; index > 0; index--) {
        //             filters[parents[index]] = parents[index - 1];
        //         }
        //         filters[parents[0]] = currentFilters;
        //         this.policyHelper.setParams(filters)
        //     }, (e) => {
        //         console.error(e.error);
        //         this.loading = false;
        //     });
        // });
    }
}

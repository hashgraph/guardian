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
            this.currentValue = data.filterValue;

            if (this.type == 'unelected') {
            }

            if (this.type == 'dropdown') {
                const options = data.data;
                this.options = [];
                if (data.canBeEmpty) {
                    this.options.push({
                        name: "",
                        value: null,
                    });
                }
                if (options) {
                    for (let i = 0; i < options.length; i++) {
                        const item = options[i];
                        this.options.push(item);
                    }
                }
            }
        } else {
            this.data = null;
        }
    }

    onFilters() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, { filterValue: this.currentValue }).subscribe(() => {
            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}

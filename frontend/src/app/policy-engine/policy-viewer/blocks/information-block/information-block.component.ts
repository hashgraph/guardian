import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';

/**
 * Component for display block of 'informationBlock' types.
 */
@Component({
    selector: 'app-information-block',
    templateUrl: './information-block.component.html',
    styleUrls: ['./information-block.component.css']
})
export class InformationBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    socket: any;
    content: string | null = null;

    type: any;
    title: any;
    description: any;

    constructor(
        private policyEngineService: PolicyEngineService,
        private policyHelper: PolicyHelper,
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
            this.loading = true;
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                this.loading = false;
                console.log(data);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData || {};

            this.type = uiMetaData.type;
            this.title = uiMetaData.title;
            this.description = uiMetaData.description;

            this.isActive = true;
        } else {
            this.content = null;
            this.isActive = false;
        }
    }
}

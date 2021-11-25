import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

/**
 * Settings for policy.
 */
@Component({
    selector: 'policy-properties',
    templateUrl: './policy-properties.component.html',
    styleUrls: [
        './../common-properties/common-properties.component.css',
        './policy-properties.component.css'
    ]
})
export class PolicyPropertiesComponent implements OnInit {
    @Input('policy') policy!: any;
    @Input('readonly') readonly!: boolean;
    
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        metaData: false,
        rolesGroup: false,
    };

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
    }

    ngOnChanges(changes: SimpleChanges) {
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}

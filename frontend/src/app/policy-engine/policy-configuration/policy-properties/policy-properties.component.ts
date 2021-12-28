import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';

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

    @ViewChild('body') body?: ElementRef;

    propHidden: any = {
        metaData: false,
        rolesGroup: false,
    };
    roles: any[] = [];

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.roles = [];
        if (this.policy.policyRoles) {
            for (let i = 0; i < this.policy.policyRoles.length; i++) {
                this.roles.push({
                    name: this.policy.policyRoles[i]
                })
            }
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addRoles() {
        if (!this.policy.policyRoles) {
            this.policy.policyRoles = [];
        }
        this.roles.push({
            name: ""
        });
        for (let i = 0; i < this.roles.length; i++) {
            this.policy.policyRoles[i] = this.roles[i].name;
        }
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditRole(i: number) {
        if (!this.policy.policyRoles) {
            this.policy.policyRoles = [];
        }
        this.policy.policyRoles[i] = this.roles[i].name;
    }

    onRemoveRole(i: number) {
        this.policy.policyRoles.splice(i, 1);
        this.roles.splice(i, 1);
    }
}

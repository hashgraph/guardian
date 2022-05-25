import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PolicyModel, PolicyRoleModel, PolicyTopicModel } from '../../policy-model';

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
    @Input('policy') policy!: PolicyModel;
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;

    @Output() onInit = new EventEmitter();

    @ViewChild('body') body?: ElementRef;

    propHidden: any = {
        metaData: false,
        rolesGroup: false,
        topicsGroup: {}
    };
    roles: PolicyRoleModel[] = [];
    topics: PolicyTopicModel[] = [];

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.roles = this.policy.policyRoles;
        this.topics = this.policy.policyTopics;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addRoles() {
        this.policy.createRole("");
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditRole(role: PolicyRoleModel) {
        role.emitUpdate();
    }

    onRemoveRole(role: PolicyRoleModel) {
        this.policy.removeRole(role)
    }

    addTopic() {
        this.policy.createTopic({
            name: "",
            description: "",
            type: "any",
            static: false
        });
    }

    onRemoveTopic(topic: PolicyTopicModel) {
        this.policy.removeTopic(topic)
    }
}

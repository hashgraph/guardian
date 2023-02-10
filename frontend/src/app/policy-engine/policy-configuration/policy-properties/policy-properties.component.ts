import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PolicyModel, PolicyGroupModel, PolicyRoleModel, PolicyTopicModel, PolicyTokenModel } from '../../structures/policy-model';

/**
 * Settings for policy.
 */
@Component({
    selector: 'policy-properties',
    templateUrl: './policy-properties.component.html',
    styleUrls: ['./policy-properties.component.css']
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
        groupsGroup: {},
        topicsGroup: {},
        tokensGroup: {}
    };
    policyGroups: PolicyGroupModel[] = [];
    topics: PolicyTopicModel[] = [];
    tokens: PolicyTokenModel[] = [];
    roles: any[] = [];

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.roles = this.policy.policyRoles;
        this.policyGroups = this.policy.policyGroups;
        this.topics = this.policy.policyTopics;
        this.tokens = this.policy.policyTokens;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addGroup() {
        this.policy.createGroup();
        setTimeout(() => {
            if (this.body) {
                this.body.nativeElement.scrollTop = 10000;
            }
        });
    }

    onEditGroup(group: PolicyGroupModel) {
        group.emitUpdate();
    }

    onRemoveGroup(group: PolicyGroupModel) {
        this.policy.removeGroup(group)
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

    addToken() {
        this.policy.createToken({
            templateTokenTag: `token_template_${this.tokens.length}`,
            tokenName: '',
            tokenSymbol: '',
            decimals: ''
        });
    }

    onRemoveToken(topic: PolicyTokenModel) {
        this.policy.removeToken(topic)
    }

    onTokenTypeChange(item: any) {
        item.decimals = '';
    }
}

import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { PolicyProgressService } from '../../../services/policy-progress.service';

/**
 * Component for display block of 'policyRolesBlock' types.
 */
@Component({
    selector: 'app-roles-block',
    templateUrl: './roles-block.component.html',
    styleUrls: ['./roles-block.component.scss']
})
export class RolesBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    disabled: boolean = false;
    socket: any;
    content: string | null = null;

    roles: string[] = [];
    groups?: string[];
    title?: any;
    description?: any;
    roleForm: FormGroup;
    type: any = 'new';
    groupMap: any;

    params: any;
    inviteRole: string = '';
    isGroup: boolean = false;

    policyName: string = '';
    groupName: string = '';
    groupLabel: string = '';

    constructor(
        private policyEngineService: PolicyEngineService,
        private policyProgressService: PolicyProgressService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private fb: FormBuilder
    ) {
        this.roleForm = fb.group({
            roleOrGroup: ['', Validators.required],
            invitation: [''],
            groupLabel: [''],
        });
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
        }
        this.params = this.policyHelper.subscribe(this.onUpdateParams.bind(this));
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
        if (this.params) {
            this.params.unsubscribe();
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
            this.loading = true;
            this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
                this.setData(data);
                this.loading = false;
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {
            const uiMetaData = data.uiMetaData || {};
            const active = data.active;

            this.disabled = active === false;
            this.groups = data.groups;
            this.roles = data.roles;
            this.groupMap = data.groupMap || {};

            this.title = uiMetaData.title;
            this.description = uiMetaData.description;
            this.isGroup = !!(this.groups && this.groups.length);

            const invitation = this.policyHelper.getParams('invitation');
            if (invitation) {
                this.type = 'invite';
                this.roleForm = this.fb.group({
                    roleOrGroup: [''],
                    groupLabel: [''],
                    invitation: [invitation, Validators.required],
                });
            } else {
                this.roleForm = this.fb.group({
                    roleOrGroup: ['', Validators.required],
                    groupLabel: [''],
                    invitation: [''],
                });
            }

            this.isActive = true;
        } else {
            this.content = null;
            this.isActive = false;
            this.disabled = false;
        }
    }

    onSubmit() {
        if (this.roleForm.valid) {
            const value = this.roleForm.value;
            let data: any;
            if (this.type === 'invite') {
                data = { invitation: value.invitation };
            } else if (this.isGroup) {
                data = { group: value.roleOrGroup, label: value.groupLabel };
            } else {
                data = { role: value.roleOrGroup };
            }
            this.loading = true;
            this.policyEngineService
                .setBlockData(this.id, this.policyId, data)
                .subscribe(
                    () => {
                        this.policyProgressService.updateData(data);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    onChange(event: any) {
        this.type = event.value;
        this.inviteRole = '';
        this.policyName = '';
        this.groupName = '';
        this.groupLabel = '';
        if (this.type === 'new') {
            this.roleForm = this.fb.group({
                roleOrGroup: ['', Validators.required],
                groupLabel: [''],
                invitation: [''],
            });
        } else {
            this.roleForm = this.fb.group({
                roleOrGroup: [''],
                groupLabel: [''],
                invitation: ['', Validators.required],
            });
        }
    }

    onUpdateParams() {
        // const invitation = this.policyHelper.getParams('invitation');
        // debugger;
    }

    onParse(event: any) {
        if (event) {
            try {
                const json = JSON.parse(atob(event));
                this.inviteRole = json.role || '';
                this.policyName = json.policyName || '';
                this.groupName = json.name || '';
                this.groupLabel = json.label || '';
            } catch (error) {
                this.inviteRole = '';
                this.policyName = '';
                this.groupName = '';
                this.groupLabel = '';
            }
        }
    }

    ifPrivateGroup() {
        if (this.groupMap && this.groupMap[this.roleForm.value.roleOrGroup]) {
            return this.groupMap[this.roleForm.value.roleOrGroup].groupAccessType === 'Private';
        }
        return false;
    }
}

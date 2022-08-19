import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { LinkDialogComponent } from 'src/app/policy-engine/helpers/link-dialog/link-dialog.component';
import { MatDialog } from '@angular/material/dialog';

/**
 * Component for display block of 'policyRolesBlock' types.
 */
@Component({
    selector: 'app-group-manager-block',
    templateUrl: './group-manager-block.component.html',
    styleUrls: ['./group-manager-block.component.css']
})
export class GroupManagerBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    isActive = false;
    loading: boolean = true;
    socket: any;
    content: string | null = null;

    users: any;
    visible: any;
    canInvite: any;
    canDelete: any;
    role: any;
    groupRelationshipType: any;
    groupAccessType: any;

    commonAddons: any[];
    paginationAddon: any;

    displayedColumns: string[] = [
        'username',
        'type',
        'action'
    ];

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private fb: FormBuilder,
        private dialog: MatDialog
    ) {
        this.commonAddons = [];
        this.paginationAddon = null;
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
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }
    }

    setData(data: any) {
        if (data) {

            this.users = data.data || [];
            this.visible = data.visible || false;
            this.canInvite = data.canInvite || false;
            this.canDelete = data.canDelete || false;
            this.role = data.role || '';
            this.groupRelationshipType = data.groupRelationshipType;
            this.groupAccessType = data.groupAccessType;
            this.commonAddons = data.commonAddons || [];
            this.paginationAddon = this.commonAddons.find((addon) => {
                return addon.blockType === "paginationAddon"
            })
            this.isActive = true;
        } else {
            this.users = [];
            this.visible = false;
            this.canInvite = false;
            this.canDelete = false;
            this.role = '';
            this.groupRelationshipType = '';
            this.groupAccessType = '';
            this.content = null;
            this.commonAddons = [];
            this.paginationAddon = null;
            this.isActive = false;
        }
    }

    onInvite() {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, {
            action: 'invite'
        }).subscribe((result) => {
            const dialogRef = this.dialog.open(LinkDialogComponent, {
                width: '500px',
                panelClass: 'g-dialog',
                disableClose: true,
                data: {
                    header: 'Invitation',
                    invitation: result.invitation,
                    link: location.origin + location.pathname + `?policyParams=${btoa(JSON.stringify(result))}`
                }
            });
            dialogRef.afterClosed().subscribe(async () => {
            });

            this.loading = false;
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    onDelete(user: any) {
        this.loading = true;
        this.policyEngineService.setBlockData(this.id, this.policyId, {
            action: 'delete',
            username: user.username
        }).subscribe((result) => {
            this.loadData();
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }
}

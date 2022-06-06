import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog.component';

/**
 * Component for display block of 'revoke' type.
 */
@Component({
  selector: 'revoke-block',
  templateUrl: './revoke-block.component.html',
  styleUrls: ['./revoke-block.component.css']
})
export class RevokeBlockComponent implements OnInit {
  @Input('id') id!: string;
  @Input('policyId') policyId!: string;
  @Input('static') static!: any;

  loading: boolean = true;
  socket: any;
  data: any;
  uiMetaData: any;
  type: any;
  visible: any;

  constructor(
    private policyEngineService: PolicyEngineService,
    public dialog: MatDialog
  ) { }

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
    if (data) {
      this.data = data.data;
      this.type = data.type;
      this.uiMetaData = data.uiMetaData;
      this.visible = this.getObjectValue(this.data, 'option.status') !== 'Revoked';
    } else {
      this.data = null;
    }
  }

  onSelectDialog() {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      data: {
        title: this.uiMetaData.title,
        description: this.uiMetaData.description
      }
    })

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.visible = false;
        this.policyEngineService.setBlockData(this.id, this.policyId, {
          revokeMessage: result,
          messageId: this.data.messageId,
          relationships: this.data.relationships
        }).subscribe(() => {
          this.loadData();
        }, (e) => {
          this.visible = true;
          console.error(e.error);
          this.loading = false;
        });
      }
    })
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
}

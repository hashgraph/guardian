import { AfterContentChecked, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog.component';

/**
 * Component for display block of 'Buttons' type.
 */
@Component({
  selector: 'button-block',
  templateUrl: './button-block.component.html',
  styleUrls: ['./button-block.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonBlockComponent implements OnInit, AfterContentChecked {
  @Input('id') id!: string;
  @Input('policyId') policyId!: string;
  @Input('static') static!: any;

  loading: boolean = true;
  socket: any;
  data: any;
  uiMetaData: any;
  buttons: any;
  commonVisible: boolean = true;
  private readonly _commentField: string = 'comment';

  constructor(
    private policyEngineService: PolicyEngineService,
    private policyHelper: PolicyHelper,
    public dialog: MatDialog,
    private cdref: ChangeDetectorRef
  ) {
  }
  ngAfterContentChecked(): void {
    if (!this.buttons) {
      return;
    }
    for (let i = 0; i < this.buttons.length; i++) {
      let button = this.buttons[i];
      button.visible = this.checkVisible(button);
    }
    this.cdref.detectChanges();
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
    if (data) {
      this.data = data.data;
      this.uiMetaData = data.uiMetaData;
      this.buttons = this.uiMetaData.buttons || [];
    } else {
      this.data = null;
    }
  }

  checkVisible(button: any) {
    let result = true;
    if (!this.data) {
      return result;
    }
    if (button.field) {
      result = this.getObjectValue(this.data, button.field) !== button.value;
    }
    if (!result) {
      return result;
    }
    if (!button.filters) {
      return result;
    }
    for (const filter of button.filters) {
      const fieldValue = this.getObjectValue(this.data, filter.field);
      switch (filter.type) {
        case 'equal':
          result = result && (fieldValue == filter.value);
          break;
        case 'not_equal':
          result = result && (fieldValue != filter.value);
          break;
        case 'in':
          filter.value.split(',').foreach((val: any) => result = result && (val == fieldValue));
          break;
        case 'not_in':
          filter.value.split(',').foreach((val: any) => result = result && (val != fieldValue));
          break;
        }
    }
    return result;
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

  setObjectValue(data: any, field: any, value: any) {
    let result: any = null;
    if (data && field) {
      const keys = field.split('.');
      result = data;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        result = result[key];
      }
      result[keys[keys.length - 1]] = value;
    }
    return result;
  }

  onSelect(button: any) {
    this.setObjectValue(this.data, button.field, button.value);
    this.commonVisible = false;
    this.policyEngineService.setBlockData(this.id, this.policyId, { document: this.data, tag: button.tag }).subscribe(() => {
      this.loadData();
    }, (e) => {
      console.error(e.error);
      this.loading = false;
    });
  }

  onSelectDialog(button: any) {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      data: {
        title: button.title,
        description: button.description
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.setObjectValue(this.data, this._commentField, result);
        this.onSelect(button);
      }
    });
  }
}

import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';

/**
 * Component for display block of 'requestVcDocument' type.
 */
@Component({
  selector: 'action-block',
  templateUrl: './action-block.component.html',
  styleUrls: ['./action-block.component.css']
})
export class ActionBlockComponent implements OnInit {
  @Input('id') id!: string;
  @Input('policyId') policyId!: string;
  @Input('static') static!: any;

  loading: boolean = true;
  socket: any;
  data: any;
  uiMetaData: any;
  type: any;
  options: any;
  field: any;
  value: any;
  visible: any;
  content: any;
  target: any;
  filters: any;

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
    if (data) {
      this.data = data.data;
      this.type = data.type;
      this.uiMetaData = data.uiMetaData;
      if (this.type == 'selector') {
        this.options = this.uiMetaData.options || [];
        this.field = this.uiMetaData.field;
        this.value = this.data[this.field];
        this.visible = this.options.findIndex((o: any) => o.value == this.value) == -1;
      }
      if (this.type == 'download') {
        this.content = this.uiMetaData.content;
      }
      if (this.type == 'filters') {
        this.content = this.uiMetaData.content;
        this.target = data.targetBlock;
        this.filters = {};
        if (data.filters) {
          for (let i = 0; i < data.filters.length; i++) {
            const filter = data.filters[i];
            if (filter.type == 'object') {
              this.filters[filter.name] = this.getObjectValue(this.data, filter.value);
            } else {
              this.filters[filter.name] = filter.value;
            }
          }
        }
      }
    } else {
      this.data = null;
    }
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

  onSelect(value: any) {
    this.data[this.field] = value;
    this.value = this.data[this.field];
    this.visible = this.options.findIndex((o: any) => o.value == this.value) == -1;
    this.policyEngineService.setBlockData(this.id, this.policyId, this.data).subscribe(() => {
      this.loadData();
    }, (e) => {
      console.error(e.error);
      this.loading = false;
    });
  }

  setStatus(row: any, status: string) {
    this.loading = true;
    const data = { ...row };
    data.status = status;
    this.policyEngineService.setBlockData(this.id, this.policyId, data).subscribe(() => {
      this.loadData();
    }, (e) => {
      console.error(e.error);
      this.loading = false;
    });
  }

  onDownload() {
    this.policyEngineService.setBlockData(this.id, this.policyId, this.data).subscribe((data) => {
      if (data) {
        this.downloadObjectAsJson(data.body, data.fileName);
      }
      this.loading = false;
    }, (e) => {
      console.error(e.error);
      this.loading = false;
    });
  }

  downloadObjectAsJson(exportObj: any, exportName: string) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.config');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  onFilters() {
    this.loading = true;
    this.policyEngineService.getGetIdByName(this.target, this.policyId).subscribe(({ id }: any) => {
      this.policyEngineService.getParents(id, this.policyId).subscribe((parents: any[]) => {
        this.loading = false;
        const filters: any = {};
        for (let index = parents.length - 1; index > 0; index--) {
          filters[parents[index]] = parents[index - 1];
        }
        filters[parents[0]] = this.filters;
        this.policyHelper.setParams(filters)
      }, (e) => {
        console.error(e.error);
        this.loading = false;
      });
    });
  }
}

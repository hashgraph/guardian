import { Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { Subscription } from 'rxjs';
import { PolicyHelper } from 'src/app/services/policy-helper.service';

/**
 * Component for display block of 'interfaceStepBlock' types.
 */
@Component({
  selector: 'step-block',
  templateUrl: './step-block.component.html',
  styleUrls: ['./step-block.component.css']
})
export class StepBlockComponent implements OnInit {
  private socket: Subscription | null;

  get loading(): boolean {
    return !this.blocks || !this.blocks.length || !this.activeBlock;
  }

  get activeBlock(): any {
    return this.blocks && this.blocks[this.index] || (this.index === -1);
  }

  @Input('id') id!: string;
  @Input('policyId') policyId!: string;
  @Input('static') static!: any;


  blocks: any;
  activeBlockId: any;
  isActive = false;
  private index: number = 0;

  constructor(
    private policyEngineService: PolicyEngineService,
    private policyHelper: PolicyHelper,
  ) {
    this.socket = null;
    console.log(this);
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
    if (this.static) {
      this.setData(this.static);
      setTimeout(() => {
      }, 500);
    } else {
      this.policyEngineService.getBlockData(this.id, this.policyId).subscribe((data: any) => {
        this.setData(data);
        console.log(data);
      }, (e) => {
        console.error(e.error);
      });
    }
  }

  setData(data: any) {
    if (data) {
      this.isActive = true;
      this.blocks = data.blocks || [];
      this.index = data.index;
    } else {
      this.blocks = null;
      this.index = 0;
      this.isActive = false;
    }
  }
}

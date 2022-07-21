import { Component, Input, SimpleChanges, DoCheck, IterableDiffers, IterableDiffer } from '@angular/core';

@Component({
  selector: 'async-progess',
  templateUrl: './async-progess.component.html',
})
export class AsyncProgessComponent implements DoCheck {

  progressValue!: number;
  iterableDiffer: IterableDiffer<any>;

  @Input('expected') expected!: number;
  @Input('statuses') statuses!: string[];

  constructor(iterableDiffers: IterableDiffers) {
    this.iterableDiffer = iterableDiffers.find([]).create();
  }

  ngDoCheck(): void {
    const changes = this.iterableDiffer.diff(this.statuses);
    if (changes) {
      this.applyChanges();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.applyChanges();
  }

  private applyChanges() {
    if (!this.expected && !this.statuses) {
      return;
    }
    if (this.expected == 0) {
      this.progressValue = 100;
    }
    if (this.statuses.length > this.expected) {
      this.expected = this.statuses.length + 1;
    }
    this.progressValue = this.statuses.length * 90 / this.expected;
  }
}

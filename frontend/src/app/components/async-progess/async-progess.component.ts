import { Component, OnDestroy, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'async-progess',
  templateUrl: './async-progess.component.html',
})
export class AsyncProgessComponent implements OnInit, OnDestroy {

  progressValue!: number;
  statuses: string[] = [];

  @Input('taskId') taskId!: string;
  @Input('expected') expected!: number;

  @Output() completed = new EventEmitter<string>();
  @Output() error = new EventEmitter<any>();

  private subscription = new Subscription();

  constructor(private wsService: WebSocketService) { }

  ngOnInit() {
    this.subscription.add(
      this.wsService.taskSubscribe((event) => {
          const { taskId, statuses, completed, error } = event;
          if (taskId != this.taskId) { return; }

          if (completed) {
              this.progressValue = 100;
              if (error) {
                this.error.emit(error);
              } else {
                this.completed.emit(this.taskId);
              }
              return;
          }

          console.log("this.statuses", this.statuses.length, "statuses", (statuses || []).length);
          this.statuses.push(...statuses);
          this.applyChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.taskId) {
      this.statuses.length = 0;
      this.progressValue = 0;
    }
  }

  private applyChanges() {
    if (!this.taskId) {
      return;
    }

    if (this.statuses.length > this.expected) {
      this.expected = this.statuses.length + 1;
    }
    this.progressValue = this.statuses.length * 90 / this.expected;
  }
}

import { Component, OnDestroy, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { Subscription } from 'rxjs';
import { IStatus, StatusType } from '@guardian/interfaces';

@Component({
  selector: 'async-progess',
  templateUrl: './async-progess.component.html',
  styleUrls: ['./async-progess.component.css']
})
export class AsyncProgessComponent implements OnInit, OnDestroy {

  progressValue!: number;
  statusesCount: number = 0;
  statuses: IStatus[] = [];
  statusesRefMap: any = {};

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

          const newStatuses: IStatus[] = statuses || [];
          newStatuses.forEach((status) => {
            switch (status.type) {
              case StatusType.INFO:
                this.statuses.push(status);
                break;
              case StatusType.PROCESSING:
                this.statusesRefMap[status.message] = status;
                this.statuses.push(status);
                this.statusesCount++;
                break;
              case StatusType.COMPLETED:
                if (this.statusesRefMap[status.message]) {
                  this.statusesRefMap[status.message].type = status.type;
                  this.statusesCount++;
                } else {
                  this.statusesRefMap[status.message] = status;
                  this.statuses.push(status);
                  this.statusesCount = this.statusesCount + 2;
                }
                break;
              default:
                console.log('Unknown status type');
                break;
            }
          });
          this.applyChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.taskId) {
      this.statusesCount = 0;
      this.statuses.length = 0;
      this.progressValue = 0;
    }
  }

  isInfo(status: IStatus) {
    return status.type == StatusType.INFO;
  }

  private applyChanges() {
    if (!this.taskId) {
      return;
    }

    if (this.statusesCount > this.expected) {
      this.expected = this.statusesCount + 1;
    }
    this.progressValue = this.statusesCount * 90 / this.expected;
  }
}

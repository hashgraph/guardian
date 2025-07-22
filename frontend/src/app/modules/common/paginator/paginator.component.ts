import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-paginator',
    templateUrl: './paginator.component.html',
    styleUrls: ['./paginator.component.scss']
})
export class PaginatorComponent {
    @Input('pageIndex') pageIndex: number = 0;
    @Input('pageSize') pageSize: number = 25;
    @Input('length') length: number = 0;
    @Input('options') options: number[] = [10, 25, 50, 100];
    @Output('page') page = new EventEmitter<any>();

    public get pageNumberMin(): number {
        return this.pageIndex * this.pageSize + 1;
    }

    public get pageNumberMax(): number {
        return this.pageIndex * this.pageSize + this.pageSize > this.length
            ? this.length
            : this.pageIndex * this.pageSize + this.pageSize;
    }

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.options.includes(this.pageSize)) {
            this.options.push(this.pageSize);
            this.options.sort((a, b) => a < b ? -1 : 1);
        }
    }

    public newOnSize() {
        this.pageIndex = 0;
        this.page.emit({
            pageSize: this.pageSize,
            pageIndex: this.pageIndex
        });
    }

    public movePageIndex(inc: number) {
        if (inc > 0 && this.pageIndex < this.length / this.pageSize - 1) {
            this.pageIndex += 1;
            this.page.emit({
                pageSize: this.pageSize,
                pageIndex: this.pageIndex
            });
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.page.emit({
                pageSize: this.pageSize,
                pageIndex: this.pageIndex
            });
        }
    }
}

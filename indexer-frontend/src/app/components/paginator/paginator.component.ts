import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { DropdownModule } from 'primeng/dropdown';

@Component({
    selector: 'app-paginator',
    templateUrl: './paginator.component.html',
    standalone: true,
    imports: [DropdownModule, FormsModule, TranslocoModule],
    styleUrls: ['./paginator.component.scss'],
})
export class PaginatorComponent {
    @Input('pageIndex') pageIndex: number = 0;
    @Input('pageSize') pageSize: number = 25;
    @Input('length') length: number = 0;
    @Output('page') page = new EventEmitter<any>();
    @Input() pageSizeOptions!: number[]

    public get pageNumberMin(): number {
        return this.pageIndex * this.pageSize + 1;
    }

    public get pageNumberMax(): number {
        return this.pageIndex * this.pageSize + this.pageSize > this.length
            ? this.length
            : this.pageIndex * this.pageSize + this.pageSize;
    }

    public newOnSize() {
        this.pageIndex = 0;
        this.page.emit({
            pageSize: this.pageSize,
            pageIndex: this.pageIndex,
        });
    }

    public movePageIndex(inc: number) {
        if (inc > 0 && this.pageIndex < this.length / this.pageSize - 1) {
            this.pageIndex += 1;
            this.page.emit({
                pageSize: this.pageSize,
                pageIndex: this.pageIndex,
            });
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.page.emit({
                pageSize: this.pageSize,
                pageIndex: this.pageIndex,
            });
        }
    }
}

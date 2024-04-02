import { Component } from '@angular/core';
import { LogsService } from '../../services/logs.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-messages',
    templateUrl: './messages.component.html',
    styleUrl: './messages.component.scss',
    standalone: true,
    imports: [CommonModule]
})
export class MessagesComponent {
    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public items: any[] = [];

    constructor(
        private documentsService: LogsService,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
    }

    ngOnDestroy(): void {
    }

    private loadData() {
        this.loading = true;

        this.documentsService.getMessages({
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
        }).subscribe({
            next: (messages) => {
                if (messages) {
                    const { items, total } = messages;
                    this.items = items;
                    this.total = total;
                } else {
                    this.items = [];
                    this.total = 0;
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        });
    }
}

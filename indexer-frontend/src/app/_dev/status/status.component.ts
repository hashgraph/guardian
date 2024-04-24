import { Component } from '@angular/core';
import { StatusService } from '../services/status.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-status',
    templateUrl: './status.component.html',
    styleUrl: './status.component.scss',
    standalone: true,
    imports: [CommonModule]
})
export class StatusComponent {
    public loading: boolean = true;
    public workers: any[] = [];
    public indexers: any[] = [];

    constructor(
        private statusService: StatusService,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
        setInterval(() => {
            this.loadData();
        }, 10000)
    }

    ngOnDestroy(): void {
    }

    private loadData() {
        this.loading = true;

        this.statusService.getStatuses().subscribe({
            next: ({ workers, indexers }) => {
                this.workers = workers;
                this.indexers = indexers;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loading = false;
                this.workers = [];
                this.indexers = [];
                console.error(message);
            }
        });
    }
}

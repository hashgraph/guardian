import { Component } from '@angular/core';
import { StatusService } from '../../services/status.service';
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
    public statuses: any[] = [];

    constructor(
        private statusService: StatusService,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
        setInterval(() => {
            this.loadData();
        }, 1000)
    }

    ngOnDestroy(): void {
    }

    private loadData() {
        this.loading = true;

        this.statusService.getWorkerStatuses().subscribe(
            (statuses) => {
                this.statuses = statuses;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        );
    }
}

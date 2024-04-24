import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElasticService } from '../services/elastic.service';

@Component({
    selector: 'app-elastic',
    templateUrl: './elastic.component.html',
    styleUrl: './elastic.component.scss',
    standalone: true,
    imports: [CommonModule]
})
export class ElasticComponent {
    public loading: boolean = true;

    constructor(
        private elasticService: ElasticService,
    ) {
    }

    ngOnInit() {
        this.loading = true;
    }

    ngOnDestroy(): void {
    }

    public update() {
        this.loading = true;

        this.elasticService.update().subscribe({
            next: (value) => {
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

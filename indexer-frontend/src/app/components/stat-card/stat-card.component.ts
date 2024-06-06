import {
    Component,
    ElementRef,
    Input,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [ChartModule, SelectButtonModule, FormsModule, TranslocoModule],
    templateUrl: './stat-card.component.html',
    styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
    @ViewChild('counter') counter!: ElementRef<HTMLElement>;
    @Input() count!: number;
    @Input() upcount?: number;
    @Input() cardLabel!: string;
    @Input() chartData?: { labels: string[]; data: number[] };
    @Input() link?: string;
    stateOptions: any[] = [
        { value: 'count', icon: 'pi pi-sort-numeric-up-alt' },
        { value: 'graph', icon: 'pi pi-chart-line' },
    ];

    type = 'count';
    data: any;
    options: any;

    constructor(private router: Router, public translocoService: TranslocoService) {}

    ngOnChanges() {
        if (this.chartData) {
            this.initChartConfig(this.chartData?.labels, this.chartData.data);
        }
    }

    numberWithCommas(x: number) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    ngAfterViewInit() {
        setTimeout(() => {
            const counter: any = this.counter.nativeElement;
            counter.innerText = '0';
            const updateCounter = () => {
                const target = +counter.getAttribute('data-target');
                const count = parseFloat(counter.innerText.replace(/,/g, ''));
                const increment = target / 100;
                if (count < target) {
                    counter.innerText = this.numberWithCommas(
                        Math.ceil(count + increment)
                    );
                    setTimeout(updateCounter, 5);
                } else {
                    counter.innerText = this.numberWithCommas(target);
                }
            };
            updateCounter();
        });
    }

    initChartConfig(labels: any, data: any) {
        this.data = {
            labels,
            datasets: [
                {
                    data,
                    fill: true,
                    borderColor: '#4169E2',
                },
            ],
        };

        this.options = {
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                x: {
                    ticks: {
                        display: false,
                    },
                    grid: {
                        color: '#e3e3e3',
                        drawBorder: true,
                    },
                    title: {
                        display: true,
                        text: this.translocoService.translate('stat.x')
                    }
                },
                y: {
                    ticks: {
                        display: false,
                    },
                    grid: {
                        color: '#e3e3e3',
                        drawBorder: true,
                    },
                    title: {
                        display: true,
                        text: this.translocoService.translate('stat.y')
                    }
                },
            },
        };
    }

    onOpen() {
        if (this.link) {
            this.router.navigate([this.link]);
        }
    }
}

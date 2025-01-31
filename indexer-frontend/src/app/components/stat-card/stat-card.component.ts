import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
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
    imports: [CommonModule, ChartModule, SelectButtonModule, FormsModule, TranslocoModule],
    templateUrl: './stat-card.component.html',
    styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
    @ViewChild('counter') counter!: ElementRef<HTMLElement>;
    @Input() statData!: {
        label?: string,
        count: number,
        upcount?: number,
        chartLabel?: string,
        chartData?:
        {
            labels: string[],
            data: number[],
            datasets: any,
        },
        link?: string,
        tabLabel?: string,
    }[];

    stateOptions: any[] = [
        { value: 'count', icon: 'pi pi-sort-numeric-up-alt' },
        { value: 'graph', icon: 'pi pi-chart-line' },
    ];
    tabOptions: any[] = [];
    type = 'count';
    options: any;
    selectedStatIndex: number = 0;

    constructor(private router: Router, public translocoService: TranslocoService, public cdr: ChangeDetectorRef) { }

    ngOnChanges() {
        this.initChartConfig();
    }

    get selectedStatData() { return this.statData?.[this.selectedStatIndex] };

    numberWithCommas(x: number) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    ngAfterViewInit() {
        this.initCounter();
    }

    initCounter() {
        setTimeout(() => {
            if (this.counter) {
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
            }
        });
    }

    initChartConfig() {
        this.statData?.forEach((data, i) => {
            if (data.chartData) {
                data.chartData.datasets = [
                    {
                        data: data.chartData.data,
                        fill: true,
                        borderColor: '#4169E2',
                    }
                ]
            }
            this.tabOptions.push({ value: i, label: this.translocoService.translate(data?.tabLabel || '') });
        });

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
                        display: true,
                        minRotation: 0,
                        maxRotation: 0,
                        font: {
                          size: 10
                        }
                    },
                    grid: {
                        color: '#e3e3e3',
                        drawBorder: true,
                    },
                    title: {
                        display: true,
                        text: this.translocoService.translate('stat.x'),
                    },
                },
                y: {
                    ticks: {
                        display: true,
                        font: {
                          size: 10
                        }
                    },
                    grid: {
                        color: '#e3e3e3',
                        drawBorder: true,
                    },
                    title: {
                        display: true,
                        text: this.translocoService.translate('stat.y'),
                    }
                },
            },
        };
    }

    onSubTabClick(event: any) {
        event.stopPropagation();
    }

    onSubTabSelect(event: any) {
        this.selectedStatIndex = event.index;
        
        this.initCounter();
        
        this.cdr.detectChanges();
    }

    onOpen() {
        if (this.statData?.[this.selectedStatIndex]?.link) {
            this.router.navigate([this.statData?.[this.selectedStatIndex]?.link]);
        }
    }
}

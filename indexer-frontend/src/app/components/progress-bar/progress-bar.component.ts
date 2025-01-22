import { CommonModule } from '@angular/common';
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

@Component({
    selector: 'app-progress-bar',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoModule],
    templateUrl: './progress-bar.component.html',
    styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
    @ViewChild('counter') counter!: ElementRef<HTMLElement>;
    @Input() count!: number;
    @Input() total!: number;
    @Input() loading!: boolean;
    
    constructor(private router: Router, public translocoService: TranslocoService) {}

    ngOnChanges() {
    }
}

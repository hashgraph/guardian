import {
    AfterContentInit,
    Component,
    ContentChild,
    Directive,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

@Directive({
    selector: '[appDialogHeader]',
    standalone: false,
})
export class DialogHeaderDirective {}

@Directive({
    selector: '[appDialogFooter]',
    standalone: false,
})
export class DialogFooterDirective {}

@Component({
    selector: 'app-common-dialog',
    templateUrl: './common-dialog.component.html',
    styleUrls: ['./common-dialog.component.scss'],
    standalone: false,
})
export class CommonDialogComponent implements AfterContentInit {
    @Input() title: string;
    @Input() confirmLabel: string = 'Confirm';
    @Input() cancelLabel: string = 'Close';
    @Input() confirmDisabled: boolean = false;
    @Input() confirmVisible: boolean = true;
    @Input() cancelVisible: boolean = true;
    @Input() showHeader: boolean = true;
    @Input() showFooter: boolean = true;
    @Input() loading: boolean = false;
    @Input() width: string;
    @Input() height: string;
    @Input() bodyMaxHeight: string;

    @Output() confirm: EventEmitter<void> = new EventEmitter<void>();
    @Output() cancel: EventEmitter<void> = new EventEmitter<void>();
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    @ContentChild(DialogHeaderDirective) private headerContent?: DialogHeaderDirective;
    @ContentChild(DialogFooterDirective) private footerContent?: DialogFooterDirective;

    public hasCustomHeader: boolean = false;
    public hasCustomFooter: boolean = false;

    public ngAfterContentInit(): void {
        this.hasCustomHeader = !!this.headerContent;
        this.hasCustomFooter = !!this.footerContent;
    }
}

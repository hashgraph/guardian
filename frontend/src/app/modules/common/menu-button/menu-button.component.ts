import { Component, ElementRef, EventEmitter, Inject, Input, Output, SimpleChanges, ViewChild } from '@angular/core';

interface IOption {
    id: string;
    text: string;
    icon: string;
    color: string;
}

/**
 * menu button.
 */
@Component({
    selector: 'menu-button',
    templateUrl: './menu-button.component.html',
    styleUrls: ['./menu-button.component.scss']
})
export class MenuButton {
    @Input('immediately') immediately: boolean = false;
    @Input('options') options!: IOption[];
    @Output('action') action = new EventEmitter<any>();

    @ViewChild('dropdownMenu', { static: true }) dropdownMenu: any;

    public current: IOption;
    public size: string = 'auto';

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.current = this.options?.[0];
    }

    ngAfterViewInit(): void {
        this.size = this.getSize();
    }

    onAction() {
        this.action.emit(this.current);
    }

    onChange($event: any) {
        this.current = $event.value;
        if(this.immediately) {
            this.onAction();
        }
    }

    private getSize(): string {
        try {
            const width = this.dropdownMenu.el.nativeElement.getBoundingClientRect().width;
            if (width) {
                return width + 'px';
            }
        } catch (error) {
            return 'auto';
        }
        return 'auto';
    }
}
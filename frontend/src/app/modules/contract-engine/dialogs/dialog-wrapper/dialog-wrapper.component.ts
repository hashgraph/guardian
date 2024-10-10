import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';


@Component({
    selector: 'app-dialog-wrapper',
    templateUrl: './dialog-wrapper.component.html',
    styleUrls: ['./dialog-wrapper.component.scss'],
})
export class DialogWrapperComponent implements OnInit {
    @Output() cancel: EventEmitter<void> = new EventEmitter<void>();
    @Output() confirm: EventEmitter<void> = new EventEmitter<void>();
    @Output() sync: EventEmitter<any> = new EventEmitter<any>();
    @Output() page: EventEmitter<any> = new EventEmitter<any>();
    @Input() confirmDisabled: boolean;
    @Input() confirmVisible: boolean = true;
    @Input() syncVisible: boolean = false;
    @Input() confirmBtnLabel: string;
    @Input() syncDate: string;
    @Input() title: string;
    @Input() loading: boolean;
    @Input() length: number;
    @Input() pageSize: number;
    @Input() paginatorVisible: boolean = true;

    constructor() {}

    ngOnInit(): void {}
}

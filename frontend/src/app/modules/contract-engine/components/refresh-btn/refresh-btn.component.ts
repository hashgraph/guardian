import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-refresh-btn',
    templateUrl: './refresh-btn.component.html',
    styleUrls: ['./refresh-btn.component.scss'],
})
export class RefreshBtnComponent implements OnInit {
    @Output() refresh: EventEmitter<any> = new EventEmitter();

    constructor() {}

    ngOnInit(): void {}
}

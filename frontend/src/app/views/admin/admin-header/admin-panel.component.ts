import { Component, OnInit } from '@angular/core';

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-admin-panel',
    templateUrl: './admin-panel.component.html',
    styleUrls: ['./admin-panel.component.css']
})
export class AdminHeaderComponent implements OnInit {
    links = [{
        name: 'Settings',
        link: 'settings'
    }, {
        name: 'Logs',
        link: 'logs'
    }, {
        name: 'Status',
        link: 'status'
    }];
    activeLink = null;
    constructor() {

    }

    ngOnInit() { }
}

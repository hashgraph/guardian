import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { StatusService } from 'src/app/services/status.service';
/**
 * Page for creating, editing, importing and exporting schemes.
 */
@Component({
    selector: 'app-service-status',
    templateUrl: './service-status.component.html',
    styleUrls: ['./service-status.component.css']
})
export class ServiceStatusComponent implements OnInit {

    servicesStates: any[] = [];

    constructor(
        private statusService: StatusService
    ) { 
        this.servicesStates = this.statusService.getServicesStatesArray();
    }

    ngOnInit() { }
}
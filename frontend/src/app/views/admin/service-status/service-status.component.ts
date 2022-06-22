import { Component, OnInit } from '@angular/core';
import { ApplicationStates } from '@guardian/interfaces';
import { Observable, of } from 'rxjs';
import { StatusService } from 'src/app/services/status.service';
/**
 * Page for creating, editing, importing and exporting schemas.
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

    getLoadingServices() {
        return this.servicesStates.filter(item => [ApplicationStates.INITIALIZING, ApplicationStates.STARTED].includes(item.state));
    }

    getStoppedServices() {
        return this.servicesStates.filter(item => item.state === ApplicationStates.STOPPED);
    }

    getServiceNames(serviceStates: any) {
        return serviceStates.map((item: any) => item.serviceName).join(', ');
    }

    ngOnInit() { }
}
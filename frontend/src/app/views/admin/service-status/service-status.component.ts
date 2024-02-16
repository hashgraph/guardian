import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationStates } from '@guardian/interfaces';
import { WebSocketService } from 'src/app/services/web-socket.service';

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
    last?: any;

    constructor(
        private wsService: WebSocketService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.servicesStates = this.wsService.getServicesStatesArray();
        this.last = this.route?.snapshot?.queryParams?.last;
        try {
            if (this.last) {
                this.last = atob(this.last);
            }
        } catch (error) {
            this.last = null;
        }
    }

    getLoadingServices() {
        return this.servicesStates.filter(item => {
            for (const state of item.states) {
                if ([ApplicationStates.INITIALIZING, ApplicationStates.STARTED].includes(state)) {
                    return true;
                }
            }
            return false;
        });
    }

    getStoppedServices() {
        return this.servicesStates.filter(item => {
            if (item.states.length === 0) {
                return true;
            }
            for (const state of item.states) {
                if ([ApplicationStates.STOPPED, ApplicationStates.BAD_CONFIGURATION].includes(state)) {
                    return true;
                }
            }
            return false;
        });
    }

    getIfAllServicesAreRunning() {
        const notActiveService = this.servicesStates.find(item => {
            if (item.states.length === 0) {
                return true;
            }
            for (const state of item.states) {
                if (state !== ApplicationStates.READY) {
                    return true;
                }
            }
            return false;
        });
        return !notActiveService;
    }

    getServiceNames(serviceStates: any) {
        return serviceStates.map((item: any) => item.serviceName).join(', ');
    }

    ngOnInit() {

    }

    onBack() {
        window.location.href = this.last;
    }
}

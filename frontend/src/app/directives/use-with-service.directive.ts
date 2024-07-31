import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { WebSocketService } from '../services/web-socket.service';
import { Subscription } from 'rxjs';

@Directive({
    selector: '[useWithServiceDecorator]'
})
export class UseWithServiceDirective{

    private hasView = false;
    private readonly subscription: Subscription;
    private serviceName: string;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private wsService: WebSocketService
    ) {
        this.subscription = this.wsService.statusSubscribe(() => {
            this.updateView();
        });
    }

    @Input() set useWithServiceDecorator(service: string) {
        this.serviceName = service;
        this.updateView();
    }

    private updateView() {
        let view = false;

        const currentService = this.wsService.getServicesStatesArray().find(s => s.serviceName === this.serviceName);
        if (currentService) {
            const readyService = currentService.states.find((state: string) => state === 'READY');
            if (readyService) {
                view = true;
            }
        }

        if (view && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!view && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

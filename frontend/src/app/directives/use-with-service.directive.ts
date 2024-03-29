import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { WebSocketService } from '../services/web-socket.service';

@Directive({
    selector: '[useWithServiceDecorator]'
})
export class UseWithServiceDirective{

    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private wsService: WebSocketService
    ) {
    }

    @Input() set useWithServiceDecorator(service: string) {
        let view = false;

        const currentService = this.wsService.getServicesStatesArray().find(s => s.serviceName === service);
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
}

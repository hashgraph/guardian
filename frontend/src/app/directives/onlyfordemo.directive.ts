import { Directive, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { environment } from '../../environments/environment';

@Directive({
    selector: '[onlyForDemo]'
})
export class OnlyForDemoDirective implements OnInit {

    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
    ) {
    }

    ngOnInit(): void {
        if (environment.displayDemoAccounts && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!environment.displayDemoAccounts && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}

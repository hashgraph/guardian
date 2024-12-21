import {Component, EventEmitter, Input, Output, SimpleChanges, ViewChild} from '@angular/core';
import {IStandardRegistryResponse} from '@guardian/interfaces';
import {OverlayPanel} from 'primeng/overlaypanel';

@Component({
    selector: 'app-standard-registry-card',
    templateUrl: './standard-registry-card.component.html',
    styleUrls: ['./standard-registry-card.component.scss'],
})
export class StandardRegistryCardComponent {
    @ViewChild('policiesOverlay') policiesOverlay!: OverlayPanel;
    @Input() registry!: IStandardRegistryResponse;
    @Input() isRegistrySelected!: boolean;
    @Output() registrySelected: EventEmitter<string> = new EventEmitter<string>();

    public fields: any[];

    private ignoreFields: string[] = ['@context', 'id', 'type'];

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.fields = [];
        if (this.registry?.vcDocument?.document) {
            let cs: any = this.registry.vcDocument.document.credentialSubject;
            if (Array.isArray(cs)) {
                cs = cs[0];
            }
            if (cs) {
                for (const [name, value] of Object.entries(cs)) {
                    if (
                        !this.ignoreFields.includes(name) &&
                        value &&
                        typeof value !== 'function' &&
                        typeof value !== 'object'
                    ) {
                        this.fields.push({name, value});
                    }
                }
            }
        }
    }

    onCardClick(): void {
        this.registrySelected.emit(this.registry.did);
    }

    stopPropagation(event: Event): void {
        event.stopPropagation();
    }

    getPoliciesLabel(policiesArrLength: number): string {
        return policiesArrLength === 1 ? 'policy' : 'policies';
    }

    get isPoliciesMenuOpened(): boolean {
        return this.policiesOverlay?.overlayVisible || false;
    }

    togglePoliciesMenu(event: Event): void {
        this.policiesOverlay.toggle(event);
    }
}

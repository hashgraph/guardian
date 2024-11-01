import { Component, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { MatLegacyMenuTrigger as MatMenuTrigger } from '@angular/material/legacy-menu';
import { DomSanitizer } from '@angular/platform-browser';
import { IStandardRegistryResponse } from '@guardian/interfaces';

@Component({
    selector: 'app-standard-registry-card',
    templateUrl: './standard-registry-card.component.html',
    styleUrls: ['./standard-registry-card.component.scss'],
})
export class StandardRegistryCardComponent {
    @ViewChild(MatMenuTrigger) policiesMenuTrigger!: MatMenuTrigger;
    @Input() registry!: IStandardRegistryResponse;
    @Input() isRegistrySelected!: boolean;
    @Output() registrySelected: EventEmitter<string> = new EventEmitter<string>();

    public fields: any[];

    private ignoreFields: string[] = ['@context', 'id', 'type'];

    constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
        this.matIconRegistry.addSvgIconLiteral(
            'chevron_down',
            this.domSanitizer.bypassSecurityTrustHtml(`
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M6 7.4L0 1.4L1.4 0L6 4.6L10.6 0L12 1.4L6 7.4Z" fill="#222222"/>
                </svg>
            `)
        );
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
                        this.fields.push({ name, value });
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
        return this.policiesMenuTrigger?.menuOpen || false;
    }
}

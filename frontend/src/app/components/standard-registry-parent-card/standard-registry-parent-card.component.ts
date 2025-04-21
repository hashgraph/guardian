import {Component, EventEmitter, Input, Output, SimpleChanges, ViewChild} from '@angular/core';
import {IStandardRegistryResponse} from '@guardian/interfaces';

@Component({
    selector: 'app-standard-registry-parent-card',
    templateUrl: './standard-registry-parent-card.component.html',
    styleUrls: ['./standard-registry-parent-card.component.scss'],
})
export class StandardRegistryParentCardComponent {
    @Input() registry!: IStandardRegistryResponse;
    @Input() active: boolean;
    @Output() registrySelected: EventEmitter<string> = new EventEmitter<string>();

    constructor() {
    }

    onMoreInfoClick(): void {
        this.registrySelected.emit(this.registry.did);
    }
}

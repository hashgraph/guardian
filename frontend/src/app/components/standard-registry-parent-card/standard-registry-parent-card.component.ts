import {Component, EventEmitter, Input, Output, SimpleChanges, ViewChild} from '@angular/core';
import {IStandardRegistryResponse} from '@guardian/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { OverlayPanel } from 'primeng/overlaypanel';
import { ProfileService } from 'src/app/services/profile.service';
import { ActiveStandardRegistryDialogComponent } from 'src/app/views/user-profile/active-standard-registry-dialog/active-standard-registry-dialog.component';

@Component({
    selector: 'app-standard-registry-parent-card',
    templateUrl: './standard-registry-parent-card.component.html',
    styleUrls: ['./standard-registry-parent-card.component.scss'],
})
export class StandardRegistryParentCardComponent {
    @Input() registry!: IStandardRegistryResponse;
    @Input() active: boolean;
    @Output() registrySelected: EventEmitter<string> = new EventEmitter<string>();
    @Output() setActive: EventEmitter<string> = new EventEmitter<string>();
    @Input() activeSr?: IStandardRegistryResponse;
    @ViewChild('overlay') overlay!: OverlayPanel;

    constructor(public dialogService: DialogService, private profileService: ProfileService) {
    }

    onMoreInfoClick(): void {
        this.registrySelected.emit(this.registry.did);
    }

    showOverlay(event: MouseEvent) {
        if (this.registry.policies?.length) {
            this.overlay.toggle(event);
        }
    }

    onSetActive() {
        this.dialogService.open(ActiveStandardRegistryDialogComponent, {
            styleClass: 'guardian-dialog',
            width: '640px',
            modal: true,
            showHeader: false,
            data: {
                title: 'Make active',
                currentActive: this.activeSr?.hederaAccountId,
                potentialActive: this.registry.hederaAccountId
            }
        }).onClose.subscribe((data) => {
            if(data?.update) {
                this.onChangeActiveSr();
            }
        });
    }

    onChangeActiveSr() {
        this.profileService.selectActiveStandartRegistry(this.registry.did).subscribe(() => {
            this.setActive.emit(this.registry.did);
        });
    }
}

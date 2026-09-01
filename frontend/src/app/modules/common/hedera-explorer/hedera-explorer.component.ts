import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService } from 'src/app/services/settings.service';
import { environment } from 'src/environments/environment';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'hedera-explorer',
    templateUrl: './hedera-explorer.component.html',
    styleUrls: ['./hedera-explorer.component.scss'],
    standalone: false
})
export class HederaExplorer implements OnInit, OnChanges, OnDestroy {
    /**
     * Explorer link, empty until the network is known - without it the link
     * would point at a nonexistent explorer page.
     */
    public url: string = '';

    @Input('type') type!: string;
    @Input('params') params!: string | null;
    @Input('subType') subType!: string;
    @Input('subParams') subParams!: string | null;

    private network: string = '';
    private subscription?: Subscription;

    constructor(
        private settingsService: SettingsService,
        private changeDetector: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        this.subscription = this.settingsService.getHederaNet().subscribe({
            next: (net: string) => {
                this.network = net;
                this.updateUrl();
                this.changeDetector.markForCheck();
            },
            // The link stays hidden while the network is unknown, so a failed
            // lookup needs no handling beyond keeping the stream from throwing.
            error: () => { }
        });
    }

    ngOnChanges(): void {
        this.updateUrl();
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private updateUrl(): void {
        const networkMap: any = environment.explorerSettings.networkMap;
        const typeMap: any = environment.explorerSettings.typeMap;
        if (!networkMap[this.network]) {
            this.url = '';
            return;
        }
        const network = '/' + networkMap[this.network];
        const type = typeMap[this.type] ? ('/' + typeMap[this.type]) : '';
        const params = this.params ? ('/' + this.params) : '';
        const subType = typeMap[this.subType] ? ('/' + typeMap[this.subType]) : '';
        const subParams = this.subParams ? ('/' + this.subParams) : '';
        this.url = environment.explorerSettings.url
            .replace('/${network}', network)
            .replace('/${type}', type)
            .replace('/${value}', params)
            .replace('/${subType}', subType)
            .replace('/${subValue}', subParams);
    }
}

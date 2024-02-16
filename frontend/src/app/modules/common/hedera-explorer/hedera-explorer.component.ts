import { Component, Input, SimpleChanges } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';
import { environment } from 'src/environments/environment';

/**
 * Hedera explorer.
 */
@Component({
    selector: 'hedera-explorer',
    templateUrl: './hedera-explorer.component.html',
    styleUrls: ['./hedera-explorer.component.scss']
})
export class HederaExplorer {
    url: string;

    @Input('type') type!: string;
    @Input('params') params!: string | null;
    @Input('subType') subType!: string;
    @Input('subParams') subParams!: string | null;

    constructor(private settingsService: SettingsService) {
        this.url = '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        const networkMap: any = environment.explorerSettings.networkMap;
        const typeMap: any = environment.explorerSettings.typeMap;
        this.settingsService.getHederaNet().subscribe((res: string) => {
            const network = networkMap[res] ? ('/' + networkMap[res]) : '';
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
        });
    }
}

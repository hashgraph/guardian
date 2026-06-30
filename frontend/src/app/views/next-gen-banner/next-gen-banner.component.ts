import { Component } from '@angular/core';
import { FeatureFlagsService } from '../../services/feature-flags.service';
import { SettingsService } from '../../services/settings.service';

const FEEDBACK_MAILTO_TEMPLATE =
    'mailto:guardian-feedback@hashgraph.com?subject=Re:%20Hedera%20Guardian%20Feedback%20or%20Request' +
    '&body=This%20is%20%5Bfeedback%20/%20support%20request%20/%20feature%20request%5D%0A%0A--%0A%0A' +
    'Add%20a%20summary%20here.%0A%0A%0AVersion:%20%5B{VERSION}%5D%0AOrigin:%20%5B{ORIGIN}%5D%0A---%0A';

@Component({
    selector: 'app-next-gen-banner',
    templateUrl: './next-gen-banner.component.html',
    styleUrls: ['./next-gen-banner.component.scss'],
    standalone: false
})
export class NextGenBannerComponent {
    public guardianVersion: string = '';

    constructor(
        private featureFlagsService: FeatureFlagsService,
        private settingsService: SettingsService,
    ) {
        this.settingsService.getAbout().subscribe((about) => {
            this.guardianVersion = about?.version || '';
        });
    }

    get enabled(): boolean {
        return this.featureFlagsService.isNextGenUiEnabled();
    }

    get feedbackMailto(): string {
        return FEEDBACK_MAILTO_TEMPLATE
            .replace('{VERSION}', encodeURIComponent(this.guardianVersion))
            .replace('{ORIGIN}', encodeURIComponent(window.location.href));
    }

    disableNewUi(): void {
        this.featureFlagsService.setNextGenUiEnabled(false);
    }
}

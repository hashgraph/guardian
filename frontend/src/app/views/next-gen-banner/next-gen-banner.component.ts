import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FeatureFlagsService } from '../../services/feature-flags.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { IUser, UserPermissions } from '@guardian/interfaces';

const FEEDBACK_MAILTO_TEMPLATE =
    'mailto:guardian-feedback@hashgraph.com?subject=Re:%20Hedera%20Guardian%20Feedback%20or%20Request%20-%20{ORIGIN}' +
    '&body=This%20is%20%5Bfeedback%20/%20support%20request%20/%20feature%20request%5D%0A%0A--%0A%0A' +
    'Add%20a%20summary%20here.%0A%0A%0AVersion:%20%5B{VERSION}%5D%0AOrigin:%20%5B{ORIGIN}%5D%0A---%0A';

@Component({
    selector: 'app-next-gen-banner',
    templateUrl: './next-gen-banner.component.html',
    styleUrls: ['./next-gen-banner.component.scss'],
    standalone: false
})
export class NextGenBannerComponent implements AfterViewChecked, OnDestroy {
    public guardianVersion: string = '';

    @ViewChild('bannerElement')
    private bannerElement?: ElementRef<HTMLElement>;

    private resizeObserver?: ResizeObserver;
    private publishedHeight: number = -1;

    constructor(
        private featureFlagsService: FeatureFlagsService,
        private settingsService: SettingsService,
        private auth: AuthService,
    ) {
        // Set the active role, then load the version only when the banner is enabled.
        this.auth.sessions().subscribe((user: IUser | null) => {
            const permissions = new UserPermissions(user);
            this.featureFlagsService.setRole(user ? permissions.role : null);
            if (this.enabled) {
                this.loadVersion();
            }
        });
    }

    private loadVersion(): void {
        this.settingsService.getAbout().subscribe((about) => {
            this.guardianVersion = about?.version || '';
        });
    }

    get enabled(): boolean {
        return this.featureFlagsService.isNextGenUiEnabled();
    }

    ngAfterViewChecked(): void {
        const element = this.bannerElement?.nativeElement;
        if (element) {
            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(() => this.publishHeight());
                this.resizeObserver.observe(element);
            }
        } else if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = undefined;
        }
        this.publishHeight();
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        this.setBannerHeight(0);
    }

    private publishHeight(): void {
        const element = this.bannerElement?.nativeElement;
        const height = element ? Math.round(element.getBoundingClientRect().height) : 0;
        this.setBannerHeight(height);
    }

    private setBannerHeight(height: number): void {
        if (height === this.publishedHeight) {
            return;
        }
        this.publishedHeight = height;
        document.documentElement.style.setProperty('--banner-height', `${height}px`);
    }

    get feedbackMailto(): string {
        return FEEDBACK_MAILTO_TEMPLATE
            .replaceAll('{VERSION}', encodeURIComponent(this.guardianVersion))
            .replaceAll('{ORIGIN}', encodeURIComponent(window.location.href));
    }

    turnOff(): void {
        this.featureFlagsService.setNextGenUiEnabled(false);
    }
}

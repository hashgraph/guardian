import { HttpClient } from '@angular/common/http';
import { AfterContentInit, AfterViewChecked, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';
import { MapService } from './services/map.service';
import { WebSocketService } from './services/web-socket.service';
import { BrandingService } from './services/branding.service';
import './modules/policy-engine/policy-lang-modes/policy-json-lang.mode';
import './modules/policy-engine/policy-lang-modes/policy-yaml-lang.mode';
import { globalLoaderActive } from './static/global-loader.function';
import { ActivatedRoute } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    public title = 'guardian';
    public innerWidth: any;

    get loader() {
        return globalLoaderActive
    };

    @ViewChild('contentContainer') contentContainer: ElementRef;

    public url: string;

    constructor(
        public authState: AuthStateService,
        public wsService: WebSocketService,
        public mapService: MapService,
        public httpClient: HttpClient,
        private brandingService: BrandingService,
        private activatedRoute: ActivatedRoute,
        private domSanitizer: DomSanitizer,
        private matIconRegistry: MatIconRegistry
    ) {
        const mapRequest = (value?: string) => {
            httpClient
                .jsonp(
                    `https://maps.googleapis.com/maps/api/js${value ? '?key=' + value : ''
                    }`,
                    'callback'
                )
                .subscribe();
        };
        mapService.getApiKey().subscribe(mapRequest, () => mapRequest());
        this.matIconRegistry.addSvgIconLiteral('policy-module', this.domSanitizer.bypassSecurityTrustHtml(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path style="fill:#e1933c" d="M 12,0.83007812 3.0507812,6 12,11.160156 20.949219,6 Z" />
                <path style="fill:#24bfe1" d="m 21.673828,7.25 -8.96289,5.169922 V 22.75 l 8.96289,-5.199219 z" />
                <path style="fill:#9e57f5" d="M 2.3261719,7.25 V 17.550781 L 11.279297,22.75 V 12.419922 Z" />
            </svg>
        `));
        this.matIconRegistry.addSvgIconLiteral('policy-tool', this.domSanitizer.bypassSecurityTrustHtml(`
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24">
                <path style="fill:#e1933c" d="M 12,0.83007812 3.0507812,6 12,11.160156 15.266636,9.2766003 11.8147,7.2852641 14.3213,5.878 17.736428,7.8525082 20.949219,6 Z" />
                <path style="fill:#e1933c" d="M 21.673828,7.25 18.5,9.076 v 4 c -0.806467,0.526344 -1.661691,0.973915 -2.5,1.447 l -4.61e-4,-4 -3.288601,1.896922 V 22.75 l 8.96289,-5.199219 z" />
                <path style="fill:#e1933c" d="M 11.279297,22.75 V 12.419922 L 2.3261719,7.25 V 17.550781 M 5.58267,15.641 7.96751,17.09534 v 1.89518 L 5.58267,17.53363 Z" />
            </svg>
        `));
        activatedRoute.url.subscribe(segs => {
            this.url = segs.pop()!.path;
        })
    }

    ngOnInit(): void {
        this.innerWidth = window.innerWidth;
        this.brandingService.loadBrandingData(this.innerWidth);
    }

    @HostListener('window:resize')
    onResize() {
        // update the --vh variable with the new viewport height
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    resizeMenu(type: 'COLLAPSE' | 'EXPAND' | 'NO_MARGIN') {
        const progressFooter = document.getElementById('block-progress-footer');
        switch (type) {
            case 'COLLAPSE': {
                document.getElementById('main-content')!.style.left = 'var(--header-width-collapse)';
                if (progressFooter) {
                    progressFooter.style.paddingLeft = 'calc(var(--header-width-collapse) + 48px)';
                }
                break;
            }
            case 'NO_MARGIN':
            default: {
                document.getElementById('main-content')!.style.left = '0';
                break;
            }
            case 'EXPAND': {
                document.getElementById('main-content')!.style.left = 'var(--header-width-expand)';
                if (progressFooter) {
                    progressFooter.style.paddingLeft = 'calc(var(--header-width-expand) + 48px)';
                }
                break;
            }
        }
    }
}

import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {AuthStateService} from './services/auth-state.service';
import {WebSocketService} from './services/web-socket.service';
import {BrandingService} from './services/branding.service';
import './modules/policy-engine/policy-lang-modes/block-code-lang.mode';
import './modules/policy-engine/policy-lang-modes/policy-json-lang.mode';
import './modules/policy-engine/policy-lang-modes/policy-yaml-lang.mode';
import './modules/common/models/lang-modes/formula-lang.mode';
import './modules/common/models/lang-modes/single-line';
import './modules/schema-engine/schema-lang-modes/schema-json-lang.mode';
import {globalLoaderActive} from './static/global-loader.function';
import {Router} from '@angular/router';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: [
        './app.component.scss',
        './themes/guardian/index.scss'
    ],
    standalone: false
})
export class AppComponent implements OnInit {
    public title = 'guardian';
    public innerWidth: any;

    get loader() {
        return globalLoaderActive
    };

    @ViewChild('contentContainer') contentContainer: ElementRef;

    constructor(
        public authState: AuthStateService,
        public wsService: WebSocketService,
        private brandingService: BrandingService,
        private router: Router,
        private domSanitizer: DomSanitizer,
    ) {}

    get isLoginPage(): boolean {
        return this.router.url.split('?')[0] === '/login';
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

    resizeMenu(type: 'COLLAPSE' | 'EXPAND' | 'NO_MARGIN' | 'HORIZONTAL') {
        const progressFooter = document.getElementById('block-progress-footer');
        switch (type) {
            case 'HORIZONTAL': {
                // Rail width is zeroed by the `layout-horizontal` root class, so the page
                // only needs its left gutter removed; the top offset comes from --header-height.
                document.body.style.setProperty('--header-width', '0px');
                document.getElementById('main-content')!.style.left = '0';
                document.getElementById('main-content')!.removeAttribute('main-collapse-menu');
                if (progressFooter) {
                    progressFooter.style.paddingLeft = '48px';
                }
                break;
            }
            case 'COLLAPSE': {
                document.body.style.setProperty('--header-width', 'var(--header-width-collapse)');
                document.getElementById('main-content')!.style.left = 'var(--header-width-collapse)';
                document.getElementById('main-content')!.setAttribute('main-collapse-menu', 'true');
                if (progressFooter) {
                    progressFooter.style.paddingLeft = 'calc(var(--header-width-collapse) + 48px)';
                }
                break;
            }
            case 'NO_MARGIN':
            default: {
                document.getElementById('main-content')!.style.left = '0';
                document.getElementById('main-content')!.removeAttribute('main-collapse-menu');
                break;
            }
            case 'EXPAND': {
                document.body.style.setProperty('--header-width', 'var(--header-width-expand)');
                document.getElementById('main-content')!.style.left = 'var(--header-width-expand)';
                document.getElementById('main-content')!.setAttribute('main-collapse-menu', 'false');
                if (progressFooter) {
                    progressFooter.style.paddingLeft = 'calc(var(--header-width-expand) + 48px)';
                }
                break;
            }
        }
    }
}

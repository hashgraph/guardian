import { Component, Input, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone, AfterViewChecked } from '@angular/core';
import { getMenuItems, NavbarMenuItem } from './menu.model';
import { IUser, UserCategory, UserPermissions, UserRole } from '@guardian/interfaces';
import { AuthStateService } from '../../services/auth-state.service';
import { AuthService } from '../../services/auth.service';
import { DemoService } from '../../services/demo.service';
import { NavigationEnd, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { WebSocketService } from '../../services/web-socket.service';
import { HeaderPropsService } from '../../services/header-props.service';
import { BrandingService } from '../../services/branding.service';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss'],
})
export class NewHeaderComponent implements OnInit, AfterViewChecked {
    public isLogin: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public username: string | null = null;
    public balance: string = '';
    public menuCollapsed: boolean = false;
    public smallMenuMode: boolean = false;
    public menuItems: NavbarMenuItem[];
    public activeLink: string = '';
    public activeLinkRoot: string = '';

    public policyRequests = 0;
    public newPolicyRequests = 0;

    private commonLinksDisabled: boolean = false;
    private balanceType: string;
    private balanceInit: boolean = false;
    private ws!: any;
    private authSubscription!: any;
    private policyRequestsSubscription = new Subscription();

    @Input() remoteContainerMethod: any;

    @ViewChild('usernameSpan', { static: false }) usernameSpanRef!: ElementRef;
    public isUsernameOverflowing: boolean = false;
    private usernameChecked = false;

    constructor(
        public authState: AuthStateService,
        public auth: AuthService,
        public otherService: DemoService,
        public router: Router,
        public profileService: ProfileService,
        public webSocketService: WebSocketService,
        public headerProps: HeaderPropsService,
        private brandingService: BrandingService,
        private externalPoliciesService: ExternalPoliciesService) {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.update();
            }
        })
        headerProps.isLoading$.subscribe(value => this.commonLinksDisabled = value);
        try {
            this.smallMenuMode = localStorage.getItem('MAIN_HEADER') === 'true';
            this.menuCollapsed = this.smallMenuMode;
        } catch (error) {
            console.error(error)
        }
    }

    ngOnInit(): void {
        this.update();
        this.ws = this.webSocketService.profileSubscribe((event) => {
            if (event.type === 'PROFILE_BALANCE') {
                if (event.data && event.data.balance) {
                    const b = parseFloat(event.data.balance);
                    this.balance = `${b.toFixed(3)} ${event.data.unit}`;
                } else {
                    this.balance = 'N\\A';
                    this.balanceType = '';
                }
            }
        }, () => {
            this.balance = 'N\\A';
            this.balanceType = '';
        });

        this.authSubscription = this.auth.subscribe((token) => {
            if (token) {
                this.getBalance();
            }
        });

        this.policyRequestsSubscription.add(
            this.webSocketService.requestSubscribe((message => {
                this.updateRemotePolicyRequests();
            }))
        );
    }

    ngAfterViewChecked(): void {
        if (!this.usernameChecked && this.usernameSpanRef?.nativeElement && this.username) {
            this.checkUsernameOverflow();
            this.usernameChecked = true;
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            if (!this.usernameSpanRef) {
            } else {
                this.checkUsernameOverflow();
            }
        });
    }

    ngOnDestroy(): void {
        if (this.ws) {
            this.ws.unsubscribe();
            this.ws = null;
        }
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
            this.authSubscription = null;
        }
        this.policyRequestsSubscription.unsubscribe();
    }

    private getBalance() {
        if (!this.isLogin) {
            return;
        }
        this.balanceInit = true;
        this.auth.balance().subscribe((balance: any) => {
            if (balance && balance.balance) {
                const b = parseFloat(balance.balance);
                if (b > 999) {
                    this.balance = `${b.toFixed(0)} ${balance.unit}`;
                } else if (b > 99) {
                    this.balance = `${b.toFixed(2)} ${balance.unit}`;
                } else if (b > 9) {
                    this.balance = `${b.toFixed(3)} ${balance.unit}`;
                } else {
                    this.balance = `${b.toFixed(4)} ${balance.unit}`;
                }
                if (b > 100) {
                    this.balanceType = 'normal';
                } else if (b > 20) {
                    this.balanceType = 'warn';
                } else {
                    this.balanceType = 'error';
                }
            } else {
                this.balance = 'N\\A';
                this.balanceType = '';
            }
        }, () => {
            this.balance = 'N\\A';
            this.balanceType = '';
        });
    }

    private async update() {
        if (this.activeLink === this.router.url) {
            return;
        }
        this.activeLink = this.router.url;
        this.activeLinkRoot = this.router.url.split('?')[0];
        this.auth.sessions().subscribe((user: IUser | null) => {
            const isLogin = !!user;
            this.setStatus(isLogin, user);
            this.authState.updateState(isLogin);
            if (!this.balanceInit) {
                this.getBalance();
            }
            if (!isLogin) {
                this.remoteContainerMethod('NO_MARGIN');
            } else {
                this.remoteContainerMethod(this.smallMenuMode ? 'COLLAPSE' : 'EXPAND');
            }
            this.updateRemotePolicyRequests();
            this.brandingService.getBrandingData().then(res => {
                const logo = document.getElementById('company-logo') as HTMLImageElement;
                if (logo) {
                    logo.src = res.companyLogoUrl;
                    if (res.companyLogoUrl) {
                        logo.style.display = 'block';
                    } else {
                        logo.style.display = 'none';
                    }
                }

                if (document.getElementById('company-name')) {
                    document.getElementById('company-name')!.innerText = res.companyName;
                }
            })

        }, () => {
            this.setStatus(false, null);
        });
    }

    private checkUsernameOverflow(): void {
        if (!this.usernameSpanRef) {
            return;
        }
        const el = this.usernameSpanRef.nativeElement;
        this.isUsernameOverflowing = el.scrollWidth > el.clientWidth;
    }

    private setStatus(isLogin: boolean, user: any) {
        const username = user ? user.username : null;
        if (this.isLogin !== isLogin || this.username !== username) {
            this.isLogin = isLogin;
            this.username = username;
            this.user = new UserPermissions(user);
            this.menuItems = getMenuItems(this.user);
        }

        setTimeout(() => this.checkUsernameOverflow());
    }

    public logOut() {
        this.auth.removeAccessToken();
        this.auth.removeUsername();
        this.authState.updateState(false);
        this.router.navigate(['/login']);
    }

    public toggleMenuMode() {
        this.smallMenuMode = !this.smallMenuMode;
        this.menuCollapsed = this.smallMenuMode;
        this.remoteContainerMethod(this.smallMenuMode ? 'COLLAPSE' : 'EXPAND');

        const fixedActionsContainer = document.getElementById('fixed-actions-container');
        if (fixedActionsContainer) {
            fixedActionsContainer.style.left = !this.smallMenuMode ?
                'var(--header-width-expand)' :
                'var(--header-width-collapse)'
        }

        try {
            localStorage.setItem('MAIN_HEADER', String(this.smallMenuMode));
        } catch (error) {
            console.error(error);
        }
    }

    public goToHomePage() {
        const home = this.auth.home(this.user.role);
        this.router.navigate([home]);
    }

    public goToBrandingPage(event: MouseEvent) {
        event.stopImmediatePropagation()
        this.router.navigate(['/branding']);
    }

    public isCurrent(barItem: any, activeLink: string): boolean {
        return !barItem.childItems && (
            activeLink.startsWith(barItem.routerLink)
        );
    }

    public onRouter(barItem: any) {
        if (barItem.childItems) {
            barItem.active = !barItem.active
        } else {
            this.router.navigate([barItem.routerLink]);
        }
    }

    private updateRemotePolicyRequests() {
        if (!this.isLogin) {
            return;
        }
        this.externalPoliciesService.getActionRequestsCount().subscribe((response) => {
            if (response?.body) {
                this.newPolicyRequests = response.body.requestsCount;
                this.policyRequests = response.body.total;
            }
        })
    }
}

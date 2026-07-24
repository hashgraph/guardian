import { Component, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, NgZone, AfterViewChecked } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { getMenuItems, NavbarMenuItem } from './menu.model';
import { formatBalance, getUserInitials } from '../../utils';
import { MenuLayout, MenuLayoutService } from '../../services/menu-layout.service';
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
import { DocWidgetService } from '../../services/doc-widget.service';
import { FirstStepsService } from '../../services/first-steps.service';

@Component({
    selector: 'app-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss'],
    standalone: false
})
export class NewHeaderComponent implements OnInit, OnDestroy, AfterViewChecked {
    public isLogin: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public username: string | null = null;
    public balance: string = '';
    public menuCollapsed: boolean = false;
    public smallMenuMode: boolean = false;
    public menuItems: NavbarMenuItem[];
    public horizontalModel: MenuItem[] = [];
    public layout: MenuLayout = 'vertical';
    public activeLink: string = '';
    public activeLinkRoot: string = '';

    public policyRequests = 0;
    public newPolicyRequests = 0;

    private commonLinksDisabled: boolean = false;
    private balanceType: string;
    private balanceInit: boolean = false;
    private lastToken: string | null = null;
    private ws!: any;
    private authSubscription!: any;
    private policyRequestsSubscription = new Subscription();
    private layoutSubscription = new Subscription();
    private brandingData: any = null;
    public companyName: string = '';
    public companyLogoUrl: string | null = '/assets/images/logo.png';

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
        private externalPoliciesService: ExternalPoliciesService,
        private docWidgetService: DocWidgetService,
        public firstSteps: FirstStepsService,
        public menuLayout: MenuLayoutService) {
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
        this.layout = this.menuLayout.layout;
        this.layoutSubscription.add(this.menuLayout.changes.subscribe((layout) => {
            this.layout = layout;
            if (this.isLogin) {
                this.applyContainerLayout();
                // the logo/name nodes are re-created when the layout template swaps
                setTimeout(() => this.applyBranding());
            }
        }));
    }

    ngOnInit(): void {
        this.update();
        this.docWidgetService.applyOnStartup();

        this.ws = this.webSocketService.profileSubscribe((event) => {
            if (event.type === 'PROFILE_BALANCE') {
                if (event.data && event.data.balance) {
                    this.balance = formatBalance(event.data.balance);
                } else {
                    this.balance = 'N\\A';
                    this.balanceType = '';
                }
            }
        }, () => {
            this.balance = 'N\\A';
            this.balanceType = '';
        });

        this.lastToken = this.auth.getAccessToken();
        this.authSubscription = this.auth.subscribe((token) => {
            if (token && !this.lastToken) {
                this.getBalance();
            }
            this.lastToken = token;
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
        this.layoutSubscription.unsubscribe();
    }

    private resetBalance() {
        this.balance = '';
        this.balanceType = '';
        this.balanceInit = false;
    }

    private getBalance() {
        if (!this.isLogin) {
            return;
        }
        this.balanceInit = true;
        this.auth.balance().subscribe((balance: any) => {
            if (balance && balance.balance) {
                const b = parseFloat(balance.balance);
                this.balance = formatBalance(b);
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
                this.applyContainerLayout();
            }
            this.syncActiveGroups();
            this.updateRemotePolicyRequests();
            this.applyBranding();

        }, () => {
            this.setStatus(false, null);
        });
    }

    private applyBranding() {
        // Branding doesn't change during a session, so fetch it once and keep the
        // values in component fields. The template binds them, so the name/logo
        // render whenever the header (re)appears — writing to the DOM nodes here
        // raced against them being created right after login and left the name empty.
        if (this.brandingData) {
            this.renderBranding(this.brandingData);
            return;
        }
        this.brandingService.getBrandingData().then(res => {
            this.brandingData = res;
            this.renderBranding(res);
        });
    }

    private renderBranding(res: any) {
        this.companyLogoUrl = res.companyLogoUrl || null;
        this.companyName = res.companyName || '';
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
            this.horizontalModel = this.buildHorizontalModel(this.menuItems);
            this.syncActiveGroups();
        }

        setTimeout(() => this.checkUsernameOverflow());
    }

    public logOut() {
        this.resetBalance();
        this.auth.removeAccessToken();
        this.auth.removeUsername();
        this.authState.updateState(false);
        this.router.navigate(['/login']);
    }

    private applyContainerLayout() {
        if (this.layout === 'horizontal') {
            this.remoteContainerMethod('HORIZONTAL');
        } else {
            this.remoteContainerMethod(this.smallMenuMode ? 'COLLAPSE' : 'EXPAND');
        }
    }

    /** Open the group whose child matches the current route, leaving other groups as-is. */
    private syncActiveGroups() {
        if (!this.menuItems) {
            return;
        }
        for (const item of this.menuItems) {
            if (item.childItems && this.hasActiveChild(item)) {
                item.active = true;
            }
        }
    }

    public hasActiveChild(barItem: NavbarMenuItem): boolean {
        return !!barItem.childItems?.some(
            (child) => !!child.routerLink && this.activeLink.startsWith(child.routerLink)
        );
    }

    private buildHorizontalModel(items: NavbarMenuItem[]): MenuItem[] {
        if (!items) {
            return [];
        }
        return items.map((item) => {
            const menuItem: MenuItem = {
                label: item.title,
                icon: item.icon || undefined
            };
            if (item.childItems?.length) {
                menuItem.items = this.buildHorizontalModel(item.childItems);
            } else if (item.routerLink) {
                menuItem.routerLink = item.routerLink;
            }
            return menuItem;
        });
    }

    public toggleMenuMode() {
        this.smallMenuMode = !this.smallMenuMode;
        this.menuCollapsed = this.smallMenuMode;
        // resizeMenu keeps the --header-width body variable in sync; fixed action bars
        // (e.g. Settings/Branding) read it via CSS, so no per-element style fix-ups here.
        this.remoteContainerMethod(this.smallMenuMode ? 'COLLAPSE' : 'EXPAND');

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

    public getInitials(username: string | null): string {
        return getUserInitials(username);
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

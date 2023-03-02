import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IUser, UserRole } from '@guardian/interfaces';
import { Observable, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { DemoService } from 'src/app/services/demo.service';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { ProfileService } from 'src/app/services/profile.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../services/auth.service';

/**
 * Header and Navigation
 */
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
    activeLink: string = "";
    activeLinkRoot: string = "";
    role: any = null;
    isLogin: boolean = false;
    username: string | null = null;
    commonLinksDisabled: boolean = false;
    menuIcon: 'expand_more' | 'account_circle' = 'expand_more';
    testUsers$: Observable<any[]>;
    balance: string;
    balanceType: string;
    ws!: any;
    authSubscription!: any;
    displayDemoAccounts: boolean = environment.displayDemoAccounts;
    hederaAccountID: string | undefined;
    profileData: IUser | null = null;

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public authState: AuthStateService,
        public auth: AuthService,
        public otherService: DemoService,
        public router: Router,
        public dialog: MatDialog,
        public profileService: ProfileService,
        public webSocketService: WebSocketService,
        public headerProps: HeaderPropsService
    ) {
        this.balance = 'N\\A';
        this.balanceType = '';
        this.testUsers$ = this.otherService.getAllUsers();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.update();
            }
        })
        headerProps.isLoading$.subscribe(value => this.commonLinksDisabled = value);
    }

    ngOnInit() {
        this.innerWidth = window.innerWidth;
        this.innerHeight = window.innerHeight;
        if (this.innerWidth <= 810) {
            document.documentElement.style.setProperty('--header-height', '75px');
        }
        this.activeLink = "";
        this.update();
        this.ws = this.webSocketService.profileSubscribe((event) => {
            if (event.type === 'PROFILE_BALANCE') {
                if (event.data && event.data.balance) {
                    const b = parseFloat(event.data.balance);
                    this.balance = `${b.toFixed(3)} ${event.data.unit}`;
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
            }
        }, () => {
            this.balance = 'N\\A';
            this.balanceType = '';
        });

        this.authSubscription = this.auth.subscribe((token) => {
            if (token) {
                this.getBallance();
            }
        })
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
    }

    getBallance() {
        this.auth.balance().subscribe((balance: any) => {
            if (balance && balance.balance) {
                const b = parseFloat(balance.balance);
                this.balance = `${b.toFixed(3)} ${balance.unit}`;
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

    async update() {
        if (this.activeLink == this.router.url) {
            return;
        }
        this.activeLink = this.router.url;
        this.activeLinkRoot = this.router.url.split('?')[0];
        this.auth.sessions().subscribe((user: IUser | null) => {
            const isLogin = !!user;
            const role = user ? user.role : null;
            const username = user ? user.username : null;
            this.setStatus(isLogin, role, username);
            this.authState.updateState(isLogin);
        }, () => {
            this.setStatus(false, null, null);
        });
    }

    setStatus(isLogin: boolean, role: any, username: any) {
        if (this.isLogin != isLogin || this.role != role) {
            this.isLogin = isLogin;
            this.role = role;
            this.username = username;
            this.menuIcon = this.isLogin ? 'account_circle' : 'expand_more';
        }
    }

    logIn() {
        this.router.navigate(['/login']);
    }

    profile() {
        this.router.navigate(['/user-profile']);
    }

    logOut() {
        this.auth.removeAccessToken();
        this.auth.removeUsername();
        this.authState.updateState(false);
        this.router.navigate(['/login']);
    }

    rout(link: any) {
        console.log(link, this);
        this.router.navigate([link.link]);
    }

    onHome() {
        this.router.navigate(['/']);
    }

    getPoliciesRolesLength(policyRoles: any) {
        return policyRoles.length;
    }

    getPoliciesRolesTooltip(policyRoles: any) {
        return policyRoles.map((item: any) => {
            return `${item.name} (${item.version}): ${item.role}`
        }).join('\r\n');
    }

    doBranding() {
        this.router.navigate(['/branding']);
    }

    public isActiveLink(type: string): boolean {
        switch (type) {
            case 'SR_UP':
                return this.activeLinkRoot === '/config';
            case 'SR_TOKENS':
                return (
                    this.activeLinkRoot === '/tokens' ||
                    this.activeLinkRoot === '/contracts' ||
                    this.activeLinkRoot === '/contracts/pairs'
                );
            case 'SR_POLICIES':
                return (
                    this.activeLinkRoot === '/schemas' ||
                    this.activeLinkRoot === '/artifacts' ||
                    this.activeLinkRoot === '/modules' ||
                    this.activeLinkRoot === '/policy-viewer' ||
                    this.activeLinkRoot === '/policy-configuration' ||
                    this.activeLinkRoot === '/compare' ||
                    /^\/policy-configuration\/\w+/.test(this.activeLinkRoot) ||
                    this.activeLinkRoot === 'policy-configuration'
                );
            case 'SR_ADMIN':
                return (
                    this.activeLinkRoot === '/admin/settings' ||
                    this.activeLinkRoot === '/admin/logs' ||
                    this.activeLinkRoot === '/admin/status'
                );
            case 'SR_TOKENS_LIST':
                return this.activeLinkRoot === '/tokens';
            case 'SR_CONTRACTS':
                return this.activeLinkRoot === '/contracts';
            case 'SR_CONTRACTS_PAIRS':
                return this.activeLinkRoot === '/contracts/pairs';
            case 'SR_SCHEMAS':
                return this.activeLinkRoot === '/schemas';
            case 'SR_ARTIFACTS':
                return this.activeLinkRoot === '/artifacts';
            case 'SR_MODULES':
                return this.activeLinkRoot === '/modules';
            case 'SR_POLICIES_LIST':
                return this.activeLinkRoot === '/policy-viewer';
            case 'SR_VIEWER':
                return /^\/policy-viewer\/\w+/.test(this.activeLinkRoot);
            case 'SR_EDITOR':
                return this.activeLinkRoot === '/policy-configuration';
            case 'SR_COMPARE':
                return this.activeLinkRoot === '/compare';
            case 'SR_SETTINGS':
                return this.activeLinkRoot === '/admin/settings';
            case 'SR_LOGS':
                return this.activeLinkRoot === '/admin/logs';
            case 'SR_STATUS':
                return this.activeLinkRoot === '/admin/status';

            case 'USER_TOKENS':
                return this.activeLink === '/user-profile?tab=tokens';
            case 'USER_RETIRE':
                return this.activeLink === '/user-profile?tab=retire';
            case 'USER_UP':
                return (this.activeLinkRoot === '/user-profile' && (
                    this.activeLink !== '/user-profile?tab=tokens' &&
                    this.activeLink !== '/user-profile?tab=retire'
                ));
            case 'USER_POLICIES':
                return this.activeLinkRoot === '/policy-viewer';

            case 'AUDITOR_UP':
                return this.activeLinkRoot === '/audit';
            case 'AUDITOR_TRUST_CHAIN':
                return this.activeLinkRoot === '/trust-chain';



        }
        return false;
    }

    public routActive(type: string): boolean {
        if (this.innerWidth <= 810) {
            this.closeNav()
        }
        switch (type) {
            case 'SR_UP':
                this.router.navigate(['/config']);
                return true;
            case 'SR_TOKENS':
                return false;
            case 'SR_POLICIES':
                return false;
            case 'SR_ADMIN':
                return false;
            case 'SR_TOKENS_LIST':
                this.router.navigate(['/tokens']);
                return true;
            case 'SR_CONTRACTS':
                this.router.navigate(['/contracts']);
                return true;
            case 'SR_CONTRACTS_PAIRS':
                return false;
            case 'SR_SCHEMAS':
                this.router.navigate(['/schemas']);
                return true;
            case 'SR_ARTIFACTS':
                this.router.navigate(['/artifacts']);
                return true;
            case 'SR_MODULES':
                this.router.navigate(['/modules']);
                return true;
            case 'SR_POLICIES_LIST':
                this.router.navigate(['/policy-viewer']);
                return true;
            case 'SR_VIEWER':
                return false;
            case 'SR_EDITOR':
                return false;
            case 'SR_COMPARE':
                return false;
            case 'SR_SETTINGS':
                this.router.navigate(['/admin/settings']);
                return true;
            case 'SR_LOGS':
                this.router.navigate(['/admin/logs']);
                return true;
            case 'SR_STATUS':
                this.router.navigate(['/admin/status']);
                return true;

            case 'USER_TOKENS':
                this.router.navigate(['/user-profile'], {
                    queryParams: { tab: 'tokens' }
                });
                return true;
            case 'USER_RETIRE':
                this.router.navigate(['/user-profile'], {
                    queryParams: { tab: 'retire' }
                });
                return true;
            case 'USER_UP':
                this.router.navigate(['/user-profile']);
                return true;
            case 'USER_POLICIES':
                this.router.navigate(['/policy-viewer']);
                return true;

            case 'AUDITOR_UP':
                this.router.navigate(['/audit']);
                return true;
            case 'AUDITOR_TRUST_CHAIN':
                this.router.navigate(['/trust-chain']);
                return true;
        }
        return false;
    }

    openNav() {
        document.getElementById("menu-backdrop")!.style.display = "flex";
        document.getElementById("menu-backdrop")!.style.zIndex = "1000";
        document.getElementById("nav-items")!.style.width = "250px";
        document.getElementById("nav-items")!.style.zIndex = "1001";
        document.getElementById("footer")!.style.display = "block";
        document.getElementById("footer")!.style.width = "210px";
        document.getElementById("footer")!.style.zIndex = "1001";

        this.profileService.getProfile().subscribe(
            (profile: IUser) => {
              this.profileData = profile;
              this.hederaAccountID = this.profileData.hederaAccountId;
            },
            (error) => {
              console.error('Failed to get profile data:', error);
            }
        );
    }

    closeNav() {
        document.getElementById("menu-backdrop")!.style.display = "none";
        document.getElementById("nav-items")!.style.width = "0";
        document.getElementById("footer")!.style.display = "none";
    }

    openSubMenu(subMenuID: string) {
        let content = document.getElementById('subMenu' + subMenuID)!;
        let userInfo = document.getElementById("user-info")!;
        for (let i = 1; i < 4; i++) {
            if (i == parseInt(subMenuID)) {
                continue
            } else {
                let dialog = document.getElementById('subMenu' + i)!;
                dialog.style.maxHeight = '';
                setTimeout(function () {
                    dialog.style.margin = "0";
                }, 200);
                dialog.style.overflow = "hidden";
            }
        }
        if (content.style.maxHeight) {
            // Submenu is open
            content.style.maxHeight = '';
            setTimeout(function () {
                content.style.margin = "0";
            }, 200);
            content.style.overflow = "hidden";
            userInfo.style.display = "block";
            userInfo.style.maxHeight = '';
        } else {
            // Submenu is closed
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.margin = "0 auto 20px 35px";
            content.style.overflow = "visible";
            userInfo.style.display = "none";
            userInfo.style.maxHeight = content.scrollHeight + "px";
        } 
    }
}

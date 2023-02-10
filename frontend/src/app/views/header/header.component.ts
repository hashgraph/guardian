import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IUser, UserRole } from '@guardian/interfaces';
import { Observable, Subscription } from 'rxjs';
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
    links: any = null;
    activeLink: string = "";
    activeLinkRoot: string = "";
    role: any = null;
    isLogin: boolean = false;
    username: string | null = null;
    linksConfig: any = {
        default: null
    };
    commonLinksDisabled: boolean = false;

    menuIcon: 'expand_more' | 'account_circle' = 'expand_more';
    testUsers$: Observable<any[]>;
    balance: string;
    balanceType: string;
    ws!: any;
    authSubscription!: any;
    displayDemoAccounts: boolean = environment.displayDemoAccounts;

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

        this.linksConfig[UserRole.USER] = [{
            name: "Profile",
            disabled: false,
            link: '/user-profile'
        }, {
            name: "Policies",
            disabled: false,
            link: '/policy-viewer'
        }];
        this.linksConfig[UserRole.STANDARD_REGISTRY] = [{
            name: "Profile",
            disabled: false,
            link: '/config'
        }, {
            name: "Schemas",
            disabled: false,
            link: '/schemas'
        }, {
            name: "Tokens",
            disabled: false,
            link: '/tokens'
        },
        {
            name: "Contracts",
            disabled: false,
            link: '/contracts',
            links: [
                '/contracts/pairs'
            ]
        },
        {
            name: "Artifacts",
            disabled: false,
            link: '/artifacts'
        },
        {
            name: "Policies",
            disabled: false,
            link: '/policy-viewer',
            pattern: new RegExp('^\/policy-viewer\/\\w+')
        }, {
            name: "Policy Editor",
            disabled: false,
            link: '/policy-configuration',
            hidden: true,
        }, {
            name: "Compare",
            disabled: false,
            link: '/compare',
            hidden: true,
        },
        {
            name: "Admin",
            disabled: false,
            link: '/admin/settings',
            links: [
                '/admin/settings',
                '/admin/logs',
                '/admin/status'
            ]
        }];
        this.linksConfig[UserRole.AUDITOR] = [{
            name: "Audit",
            disabled: false,
            link: '/audit'
        }, {
            name: "Trust Chain",
            disabled: false,
            link: '/trust-chain'
        }];

        this.links = this.linksConfig.default;
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.update();
            }
        })
        headerProps.isLoading$.subscribe(value => this.commonLinksDisabled = value);
    }

    ngOnInit() {
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

        this.getBallance();
        this.authSubscription = this.auth.subscribe(() => {
            this.getBallance();
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

            if (this.isLogin) {
                this.links = this.linksConfig[this.role];
            } else {
                this.links = this.linksConfig.default;
            }
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
        this.router.navigate([link.link]);
    }

    isActive(link: any) {
        if (this.activeLink == link.link || this.activeLinkRoot == link.link) {
            return true;
        }
        if (link.links) {
            return link.links.indexOf(this.activeLink) !== -1 || link.links.indexOf(this.activeLinkRoot) !== -1;
        }
        if (link.pattern) {
            return link.pattern.test(this.activeLink);
        }
        return this.activeLink == link.link || this.activeLinkRoot == link.link;
    }

    isHidden(link: any) {
        return link.hidden && !this.isActive(link);
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
}

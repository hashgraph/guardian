import { Injectable, NgModule } from '@angular/core';
import { CanActivate, Router, RouterModule, Routes } from '@angular/router';
import { IUser, UserRole } from '@guardian/interfaces';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuditComponent } from './views/audit/audit.component';
import { HomeComponent } from './views/home/home.component';
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { SchemaConfigComponent } from './views/schemas/schemas.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { AuthService } from './services/auth.service';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-view.component';
import { ServiceStatusComponent } from './views/admin/service-status/service-status.component';
import { InfoComponent } from './components/info/info/info.component';
import { WebSocketService } from './services/web-socket.service';
import { BrandingComponent } from './views/branding/branding.component';
import { SuggestionsConfigurationComponent } from './views/suggestions-configuration/suggestions-configuration.component';
import { AsyncProgressComponent } from './modules/common/async-progress/async-progress.component';
import { NotificationsComponent } from './views/notifications/notifications.component';
//Modules
import { PoliciesComponent } from './modules/policy-engine/policies/policies.component';
import { PolicyConfigurationComponent } from './modules/policy-engine/policy-configuration/policy-configuration/policy-configuration.component';
import { PolicyViewerComponent } from './modules/policy-engine/policy-viewer/policy-viewer/policy-viewer.component';
import { ArtifactConfigComponent } from './modules/artifact-engine/artifact-config/artifact-config.component';
import { CompareComponent } from './modules/analytics/compare/compare.component';
import { ModulesListComponent } from './modules/policy-engine/modules-list/modules-list.component';
import { ToolsListComponent } from './modules/policy-engine/tools-list/tools-list.component';
import { SearchPoliciesComponent } from './modules/analytics/search-policies/search-policies.component';
import { AboutViewComponent } from './views/admin/about-view/about-view.component';
import { PolicySearchComponent } from './views/policy-search/policy-search.component';
import { ListOfTokensUserComponent } from './views/list-of-tokens-user/list-of-tokens-user.component';
import { RecordResultsComponent } from './modules/policy-engine/record/record-results/record-results.component';
import { ContractConfigComponent } from './modules/contract-engine/configs/contract-config/contract-config.component';
import { UserContractConfigComponent } from './modules/contract-engine/configs/user-contract-config/user-contract-config.component';
import { AnnotationBlockComponent } from './modules/project-comparison/component/annotation-block/annotation-block.component';
import { ProjectsComparisonTableComponent } from './modules/project-comparison/component/projects-comparison-table/projects-comparison-table.component';
import { RolesViewComponent } from './views/roles/roles-view.component';
import { UsersViewComponent } from './views/users/users-view.component';

const USER_IS_NOT_RA = "Page is avaliable for admin only";

class Guard {
    private router: Router;
    private auth: AuthService;
    private roles: UserRole[];
    private defaultPage: string;

    constructor(
        router: Router,
        auth: AuthService,
        roles: UserRole | UserRole[],
        defaultPage: string
    ) {
        this.router = router;
        this.auth = auth
        this.roles = Array.isArray(roles) ? roles : [roles];
        this.defaultPage = defaultPage
    }

    canActivate() {
        return this.auth.sessions().pipe(
            map((res: IUser | null) => {
                if (res) {
                    if (!res.role || this.roles.indexOf(res.role) === -1) {
                        this.router.navigate(['/info'],
                            {
                                skipLocationChange: true,
                                queryParams: {
                                    message: USER_IS_NOT_RA
                                }
                            }
                        );
                        return false;
                    }
                    return true;
                } else {
                    return this.router.parseUrl(this.defaultPage);
                }
            }),
            catchError(() => {
                return of(this.router.parseUrl(this.defaultPage));
            })
        )
    }

    canActivateChild() {
        return this.auth.sessions().pipe(
            map((res: IUser | null) => {
                if (res) {
                    if (!res.role || this.roles.indexOf(res.role) === -1) {
                        this.router.navigate(['/info'],
                            {
                                skipLocationChange: true,
                                queryParams: {
                                    message: USER_IS_NOT_RA
                                }
                            }
                        );
                        return false;
                    }
                    return true;
                } else {
                    return this.router.parseUrl(this.defaultPage);
                }
            }),
            catchError(() => {
                return of(this.router.parseUrl(this.defaultPage));
            })
        )
    }
}

@Injectable({
    providedIn: 'root'
})
export class UserGuard extends Guard implements CanActivate {
    constructor(router: Router, auth: AuthService) {
        super(router, auth, UserRole.USER, '/login');
    }
}

@Injectable({
    providedIn: 'root'
})
export class StandardRegistryGuard extends Guard implements CanActivate {
    constructor(router: Router, auth: AuthService) {
        super(router, auth, [UserRole.STANDARD_REGISTRY, UserRole.WORKER], '/login');
    }
}

@Injectable({
    providedIn: 'root'
})
export class AuditorGuard extends Guard implements CanActivate {
    constructor(router: Router, auth: AuthService) {
        super(router, auth, UserRole.AUDITOR, '/login');
    }
}

@Injectable({
    providedIn: 'root'
})
export class ServicesStatusGuard implements CanActivate {
    constructor(
        private router: Router,
        private status: WebSocketService
    ) {
    }

    canActivate() {
        return true;
        // return this.status.IsServicesReady();
    }
}

const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'task/:id', component: AsyncProgressComponent },
    { path: 'notifications', component: NotificationsComponent },

    { path: 'user-profile', component: UserProfileComponent, canActivate: [UserGuard, ServicesStatusGuard] },
    { path: 'policy-search', component: PolicySearchComponent, canActivate: [UserGuard, ServicesStatusGuard] },
    { path: 'tokens-user', component: ListOfTokensUserComponent, canActivate: [UserGuard, ServicesStatusGuard] },
    { path: 'retirement-user', component: UserContractConfigComponent, canActivate: [UserGuard, ServicesStatusGuard] },

    { path: 'config', component: RootConfigComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'tokens', component: TokenConfigComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'contracts', component: ContractConfigComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'schemas', component: SchemaConfigComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'artifacts', component: ArtifactConfigComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    {
        path: 'admin', component: AdminHeaderComponent, canActivate: [StandardRegistryGuard], canActivateChild: [StandardRegistryGuard],
        children: [
            { path: 'status', component: ServiceStatusComponent },
            { path: 'settings', component: SettingsViewComponent },
            { path: 'logs', component: LogsViewComponent },
            { path: 'about', component: AboutViewComponent }
        ]
    },
    { path: 'status', component: ServiceStatusComponent },
    { path: 'settings', component: SettingsViewComponent },
    { path: 'audit', component: AuditComponent, canActivate: [AuditorGuard, ServicesStatusGuard] },
    { path: 'trust-chain', component: TrustChainComponent, canActivate: [AuditorGuard, ServicesStatusGuard] },

    { path: 'policy-viewer', component: PoliciesComponent, canActivate: [ServicesStatusGuard] },
    { path: 'policy-viewer/:id', component: PolicyViewerComponent, canActivate: [ServicesStatusGuard] },
    { path: 'policy-configuration', component: PolicyConfigurationComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'modules', component: ModulesListComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'tools', component: ToolsListComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'suggestions', component: SuggestionsConfigurationComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },

    { path: 'compare', component: CompareComponent, canActivate: [ServicesStatusGuard] },
    { path: 'search', component: SearchPoliciesComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },
    { path: 'record-results', component: RecordResultsComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },

    { path: 'branding', component: BrandingComponent, canActivate: [StandardRegistryGuard, ServicesStatusGuard] },

    { path: 'projects', component: AnnotationBlockComponent, data: { title: 'GUARDIAN / Project Overview' } },
    { path: 'projects/comparison', component: ProjectsComparisonTableComponent, data: { title: 'GUARDIAN / Project Comparison' } },

    { path: 'roles', component: RolesViewComponent },
    { path: 'users', component: UsersViewComponent },

    { path: '', component: HomeComponent },
    { path: 'info', component: InfoComponent },
    { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: false })],
    exports: [RouterModule]
})
export class AppRoutingModule {
}

import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterModule, RouterStateSnapshot, Routes, UrlTree } from '@angular/router';
import { IUser, Permissions, UserRole } from '@guardian/interfaces';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuditComponent } from './views/audit/audit.component';
import { HomeComponent } from './views/home/home.component';
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { RegisterComponent } from './views/register/register.component';
import { RootProfileComponent } from './views/root-profile/root-profile.component';
import { SchemaConfigComponent } from './views/schemas/schemas.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { AuthService } from './services/auth.service';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-view.component';
import { ServiceStatusComponent } from './views/admin/service-status/service-status.component';
import { InfoComponent } from './components/info/info/info.component';
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
import { UsersManagementComponent } from './views/user-management/user-management.component';
import { UsersManagementDetailComponent } from './views/user-management-detail/user-management-detail.component';
import { WorkerTasksComponent } from './views/worker-tasks/worker-tasks.component';

@Injectable({
    providedIn: 'root'
})
export class PermissionsGuard {
    constructor(
        private readonly router: Router,
        private readonly auth: AuthService
    ) {
    }

    private goToInfo(): boolean {
        this.router.navigate(['/info'], {
            skipLocationChange: true,
            queryParams: {
                title: 'Access Restricted',
                message: 'You don\'t have permission to view this page.'
            }
        });
        return false;
    }

    private goToDefault(defaultPage: string | undefined): UrlTree {
        return this.router.parseUrl(defaultPage || '/login');
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const roles: string[] | undefined = route.data.roles;
        const permissions: string[] | undefined = route.data.permissions;
        const defaultPage: string | undefined = route.data.defaultPage;
        return this.auth.sessions().pipe(
            map((user: IUser | null) => {
                if (user) {
                    if (roles) {
                        if (!user.role || roles.indexOf(user.role) === -1) {
                            return this.goToInfo();
                        }
                    }
                    if (permissions) {
                        if (user.permissions) {
                            for (const permission of user.permissions) {
                                if (permissions.indexOf(permission) !== -1) {
                                    return true;
                                }
                            }
                        }
                        return this.goToInfo();
                    }
                    return true;
                } else {
                    return this.goToDefault(defaultPage);
                }
            }),
            catchError(() => {
                return of(this.goToDefault(defaultPage));
            })
        )
    }

    canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        return this.canActivate(route, state);
    }
}

const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'task/:id', component: AsyncProgressComponent },
    { path: 'notifications', component: NotificationsComponent },
    {path: 'worker-tasks', component: WorkerTasksComponent},

    {
        path: 'user-profile',
        component: UserProfileComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.USER]
        }
    },

    {
        path: 'policy-search',
        component: PolicySearchComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.USER]
        }
    },
    {
        path: 'tokens-user',
        component: ListOfTokensUserComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.USER
            ],
            permissions: [
                Permissions.TOKENS_TOKEN_EXECUTE
            ]
        }
    },
    {
        path: 'retirement-user',
        component: UserContractConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.USER],
            permissions: [Permissions.CONTRACTS_CONTRACT_READ]
        }
    },

    {
        path: 'config',
        component: RootProfileComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY]
        }
    },
    {
        path: 'tokens',
        component: TokenConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.TOKENS_TOKEN_READ
            ]
        }
    },
    {
        path: 'contracts',
        component: ContractConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY, UserRole.USER],
            permissions: [
                Permissions.CONTRACTS_CONTRACT_READ,
                Permissions.CONTRACTS_CONTRACT_CREATE,
                Permissions.CONTRACTS_CONTRACT_DELETE,
                Permissions.CONTRACTS_WIPE_REQUEST_READ,
                Permissions.CONTRACTS_WIPE_REQUEST_UPDATE,
                Permissions.CONTRACTS_WIPE_REQUEST_REVIEW,
                Permissions.CONTRACTS_WIPE_REQUEST_DELETE,
                Permissions.CONTRACTS_WIPE_ADMIN_CREATE,
                Permissions.CONTRACTS_WIPE_ADMIN_DELETE,
                Permissions.CONTRACTS_WIPE_MANAGER_CREATE,
                Permissions.CONTRACTS_WIPE_MANAGER_DELETE,
                Permissions.CONTRACTS_WIPER_CREATE,
                Permissions.CONTRACTS_WIPER_DELETE,
                Permissions.CONTRACTS_POOL_UPDATE,
                Permissions.CONTRACTS_POOL_DELETE
            ]
        }
    },
    {
        path: 'schemas',
        component: SchemaConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.SCHEMAS_SCHEMA_READ,
                Permissions.SCHEMAS_SYSTEM_SCHEMA_READ
            ]
        }
    },
    {
        path: 'artifacts',
        component: ArtifactConfigComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.ARTIFACTS_FILE_READ
            ]
        }

    },
    {
        path: 'admin', component: AdminHeaderComponent,
        canActivate: [PermissionsGuard],
        canActivateChild: [PermissionsGuard],
        children: [
            { path: 'status', component: ServiceStatusComponent },
            { path: 'settings', component: SettingsViewComponent },
            { path: 'logs', component: LogsViewComponent },
            { path: 'about', component: AboutViewComponent }
        ],
        data: {
            roles: [UserRole.STANDARD_REGISTRY],
            permissions: [
                Permissions.SETTINGS_SETTINGS_READ,
                Permissions.LOG_LOG_READ
            ]
        }
    },
    {
        path: 'status',
        component: ServiceStatusComponent
    },
    {
        path: 'settings',
        component: SettingsViewComponent
    },
    {
        path: 'audit',
        component: AuditComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.AUDITOR]
        }
    },
    {
        path: 'trust-chain',
        component: TrustChainComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.AUDITOR]
        }
    },

    {
        path: 'policy-viewer',
        component: PoliciesComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY, UserRole.USER],
            permissions: [
                Permissions.POLICIES_POLICY_READ,
                Permissions.POLICIES_POLICY_EXECUTE
            ]
        }
    },
    {
        path: 'policy-viewer/:id',
        component: PolicyViewerComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY, UserRole.USER],
            permissions: [
                Permissions.POLICIES_POLICY_EXECUTE
            ]
        }
    },
    {
        path: 'policy-configuration',
        component: PolicyConfigurationComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.POLICIES_POLICY_UPDATE
            ]
        }
    },
    {
        path: 'module-configuration',
        component: PolicyConfigurationComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.MODULES_MODULE_UPDATE
            ]
        }
    },
    {
        path: 'tool-configuration',
        component: PolicyConfigurationComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.TOOLS_TOOL_READ
            ]
        }
    },
    {
        path: 'modules',
        component: ModulesListComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.MODULES_MODULE_READ
            ]
        }
    },
    {
        path: 'tools',
        component: ToolsListComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.TOOLS_TOOL_READ
            ]
        }
    },
    {
        path: 'suggestions',
        component: SuggestionsConfigurationComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY],
            permissions: [Permissions.SUGGESTIONS_SUGGESTIONS_READ]
        }
    },

    {
        path: 'compare',
        component: CompareComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY, UserRole.USER]
        }
    },
    {
        path: 'search',
        component: SearchPoliciesComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY],
            permissions: [Permissions.POLICIES_POLICY_READ]
        }
    },
    {
        path: 'record-results',
        component: RecordResultsComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY],
            permissions: [Permissions.POLICIES_RECORD_ALL]
        }
    },

    {
        path: 'branding',
        component: BrandingComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [UserRole.STANDARD_REGISTRY],
            permissions: [Permissions.BRANDING_CONFIG_UPDATE]
        }
    },

    {
        path: 'projects',
        component: AnnotationBlockComponent,
        data: { title: 'GUARDIAN / Project Overview' }
    },
    {
        path: 'projects/comparison',
        component: ProjectsComparisonTableComponent,
        data: { title: 'GUARDIAN / Project Comparison' }
    },

    {
        path: 'roles',
        component: RolesViewComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.PERMISSIONS_ROLE_CREATE,
                Permissions.PERMISSIONS_ROLE_UPDATE,
                Permissions.PERMISSIONS_ROLE_DELETE,
            ]
        }
    },
    {
        path: 'user-management',
        component: UsersManagementComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.DELEGATION_ROLE_MANAGE,
                Permissions.PERMISSIONS_ROLE_MANAGE
            ]
        }
    },
    {
        path: 'user-management/:id',
        component: UsersManagementDetailComponent,
        canActivate: [PermissionsGuard],
        data: {
            roles: [
                UserRole.STANDARD_REGISTRY,
                UserRole.USER
            ],
            permissions: [
                Permissions.DELEGATION_ROLE_MANAGE,
                Permissions.PERMISSIONS_ROLE_MANAGE
            ]
        }
    },

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

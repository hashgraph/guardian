import { Injectable, NgModule } from '@angular/core';
import { CanActivate, Router, RouterModule, Routes } from '@angular/router';
import { ISession, IUser, UserRole } from 'interfaces';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PolicyConfigurationComponent } from './policy-engine/policy-configuration/policy-configuration/policy-configuration.component';
import { PolicyViewerComponent } from './policy-engine/policy-viewer/policy-viewer/policy-viewer.component';
import { AuditComponent } from './views/audit/audit.component';
import { HomeComponent } from './views/home/home.component';
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { SchemaConfigComponent } from './views/schema-config/schema-config.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { AuthService } from './services/auth.service';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-viewcomponent';


class Guard {
  private router: Router;
  private auth: AuthService;
  private role: UserRole;
  private defaultPage: string;

  constructor(
    router: Router,
    auth: AuthService,
    role: UserRole,
    defaultPage: string
  ) {
    this.router = router;
    this.auth = auth
    this.role = role;
    this.defaultPage = defaultPage
  }

  canActivate() {
    return this.auth.sessions().pipe(
      map((res: IUser | null) => {
        if (res) {
          return res.role == this.role;
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
          return res.role == this.role;
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
export class RootAuthorityGuard extends Guard implements CanActivate {
  constructor(router: Router, auth: AuthService) {
    super(router, auth, UserRole.ROOT_AUTHORITY, '/login');
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

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'user-profile', component: UserProfileComponent, canActivate: [UserGuard] },

  { path: 'config', component: RootConfigComponent, canActivate: [RootAuthorityGuard] },
  { path: 'tokens', component: TokenConfigComponent, canActivate: [RootAuthorityGuard] },
  { path: 'schemes', component: SchemaConfigComponent, canActivate: [RootAuthorityGuard] },
  { path: 'admin', component: AdminHeaderComponent, canActivate: [RootAuthorityGuard], canActivateChild: [RootAuthorityGuard],
    children: [
      { path: 'settings', component: SettingsViewComponent },
      { path: 'logs', component: LogsViewComponent }
    ]
  },
  
  { path: 'audit', component: AuditComponent, canActivate: [AuditorGuard] },
  { path: 'trust-chain', component: TrustChainComponent, canActivate: [AuditorGuard] },

  { path: 'policy-viewer', component: PolicyViewerComponent },
  { path: 'policy-configuration', component: PolicyConfigurationComponent },

  { path: '', component: HomeComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule {
}

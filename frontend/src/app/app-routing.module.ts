import { Injectable, NgModule } from '@angular/core';
import { CanActivate, Router, RouterModule, Routes } from '@angular/router';
import { ISession, UserRole } from 'interfaces';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ListenersLogComponent } from './listeners-log/listeners-log.component';
import { PolicyConfigurationComponent } from './policy-engine/policy-configuration/policy-configuration/policy-configuration.component';
import { PolicyViewerComponent } from './policy-engine/policy-viewer/policy-viewer/policy-viewer.component';
import { AuthService } from './services/auth.service';
import { AuditComponent } from './views/audit/audit.component';
import { HomeComponent } from './views/home/home.component';
import { InstallerProfileComponent } from './views/installer-profile/installer-profile.component';
import { LoginComponent } from './views/login/login.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { SchemaConfigComponent } from './views/schema-config/schema-config.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';

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
    return this.auth.getCurrentUser().pipe(
      map((res: ISession | null) => {
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
export class InstallerGuard extends Guard implements CanActivate {
  constructor(router: Router, auth: AuthService) {
    super(router, auth, UserRole.INSTALLER, '/login');
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

@Injectable({
  providedIn: 'root'
})
export class OriginatorGuard extends Guard implements CanActivate {
  constructor(router: Router, auth: AuthService) {
    super(router, auth, UserRole.ORIGINATOR, '/login');
  }
}

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'installer-profile', component: InstallerProfileComponent, canActivate: [InstallerGuard] },
  { path: 'originator-profile', component: InstallerProfileComponent, canActivate: [OriginatorGuard] },

  { path: 'config', component: RootConfigComponent, canActivate: [RootAuthorityGuard] },
  { path: 'tokens', component: TokenConfigComponent, canActivate: [RootAuthorityGuard] },
  { path: 'schemes', component: SchemaConfigComponent, canActivate: [RootAuthorityGuard] },
  
  { path: 'audit', component: AuditComponent, canActivate: [AuditorGuard] },
  { path: 'trust-chain', component: TrustChainComponent, canActivate: [AuditorGuard] },

  { path: 'listeners-log', component: ListenersLogComponent },
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

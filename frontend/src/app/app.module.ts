import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule, AuditorGuard, UserGuard, RootAuthorityGuard } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor, AuthService } from "./services/auth.service";
import { ProfileService } from "./services/profile.service";
import { TokenService } from './services/token.service';
import { SchemaService } from './services/schema.service';
import { HandleErrorsService } from "./services/handle-errors.service";
import { AuditService } from './services/audit.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { HomeComponent } from './views/home/home.component';
import { HeaderComponent } from './views/header/header.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { SchemaConfigComponent } from './views/schema-config/schema-config.component';
import { TokenDialog } from './components/token-dialog/token-dialog.component';
import { AuditComponent } from './views/audit/audit.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { NewPolicyDialog } from './policy-engine/helpers/new-policy-dialog/new-policy-dialog.component';
import { DemoService } from './services/demo.service';
import { PolicyHelper } from './services/policy-helper.service';
import { MaterialModule } from './material.module';
import { PolicyEngineModule } from './policy-engine/policy-engine.module';
import { IPFSService } from './services/ipfs.service';
import { SettingsService } from './services/settings.service';
import { LoggerService } from './services/logger.service';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-viewcomponent';
import { IconPreviewDialog } from './components/icon-preview-dialog/icon-preview-dialog.component';

@NgModule({
    declarations: [
        AppComponent,
        UserProfileComponent,
        LoginComponent,
        HomeComponent,
        HeaderComponent,
        RegisterComponent,
        RootConfigComponent,
        TokenConfigComponent,
        TokenDialog,
        SchemaConfigComponent,
        AuditComponent,
        TrustChainComponent,
        NewPolicyDialog,
        LogsViewComponent,
        SettingsViewComponent,
        AdminHeaderComponent,
        IconPreviewDialog
    ],
    imports: [
        BrowserModule,
        CommonModule,
        MaterialModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        ToastrModule.forRoot(),
        PolicyEngineModule
    ],
    exports: [],
    providers: [
        UserGuard,
        RootAuthorityGuard,
        AuditorGuard,
        AuthService,
        ProfileService,
        TokenService,
        SchemaService,
        AuditService,
        PolicyEngineService,
        PolicyHelper,
        IPFSService,
        SettingsService,
        LoggerService,
        DemoService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HandleErrorsService,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {

}

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientJsonpModule, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule, AuditorGuard, StandardRegistryGuard, UserGuard } from './app-routing.module';
import { AppComponent } from './app.component';
import { SchemaHelper } from '@guardian/interfaces';
//Services
import { AuthInterceptor, AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { TokenService } from './services/token.service';
import { SchemaService } from './services/schema.service';
import { HandleErrorsService } from './services/handle-errors.service';
import { AuditService } from './services/audit.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { DemoService } from './services/demo.service';
import { PolicyHelper } from './services/policy-helper.service';
import { IPFSService } from './services/ipfs.service';
import { SettingsService } from './services/settings.service';
import { LoggerService } from './services/logger.service';
import { TasksService } from './services/tasks.service';
import { ArtifactService } from './services/artifact.service';
import { ContractService } from './services/contract.service';
import { WebSocketService } from './services/web-socket.service';
import { MessageTranslationService } from './services/message-translation-service/message-translation-service';
import { AnalyticsService } from './services/analytics.service';
import { ModulesService } from './services/modules.service';
import { TagsService } from './services/tag.service';
import { MapService } from './services/map.service';
import { WizardService } from './modules/policy-engine/services/wizard.service';
import { NotificationService } from './services/notify.service';
//Views
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { HomeComponent } from './views/home/home.component';
import { HeaderComponent } from './views/header/header.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { AuditComponent } from './views/audit/audit.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-view.component';
import { DetailsLogDialog } from './views/admin/details-log-dialog/details-log-dialog.component';
import { ServiceStatusComponent } from './views/admin/service-status/service-status.component';
import { SchemaConfigComponent } from './views/schemas/schemas.component';
import { BrandingDialogComponent } from './components/branding-dialog/branding-dialog.component';
import { NotificationsComponent } from './views/notifications/notifications.component';
//Components
import { InfoComponent } from './components/info/info/info.component';
import { BrandingComponent } from './views/branding/branding.component';
import { StandardRegistryCardComponent } from './components/standard-registry-card/standard-registry-card.component';
import { SuggestionsConfigurationComponent } from './views/suggestions-configuration/suggestions-configuration.component';
import { NotificationComponent } from './components/notification/notification.component';
//Modules
import { MaterialModule } from './modules/common/material.module';
import { PolicyEngineModule } from './modules/policy-engine/policy-engine.module';
import { CompareModule } from './modules/analytics/analytics.module';
import { CommonComponentsModule } from './modules/common/common-components.module';
import { TagEngineModule } from './modules/tag-engine/tag-engine.module';
import { SchemaEngineModule } from './modules/schema-engine/schema-engine.module'
import { ThemeService } from './services/theme.service';
import { ContractEngineModule } from './modules/contract-engine/contract-engine.module';
// Injectors
import { GET_SCHEMA_NAME } from './injectors/get-schema-name.injector';
import { BLOCK_TYPE_TIPS, BLOCK_TYPE_TIPS_VALUE, } from './injectors/block-type-tips.injector';
import { SuggestionsService } from './services/suggestions.service';
import { QrCodeDialogComponent } from './components/qr-code-dialog/qr-code-dialog.component';
import { QRCodeModule } from 'angularx-qrcode';
import { MeecoVCSubmitDialogComponent } from './components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';
import { AboutViewComponent } from './views/admin/about-view/about-view.component';
import { CompareStorage } from './services/compare-storage.service';
import { ToolsService } from './services/tools.service';

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
        AuditComponent,
        TrustChainComponent,
        LogsViewComponent,
        SettingsViewComponent,
        AboutViewComponent,
        AdminHeaderComponent,
        DetailsLogDialog,
        ServiceStatusComponent,
        InfoComponent,
        SchemaConfigComponent,
        BrandingComponent,
        BrandingDialogComponent,
        SuggestionsConfigurationComponent,
        StandardRegistryCardComponent,
        NotificationComponent,
        NotificationsComponent,
        QrCodeDialogComponent,
        MeecoVCSubmitDialogComponent,
    ],
    imports: [
        BrowserModule,
        CommonModule,
        CommonComponentsModule,
        MaterialModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        SchemaEngineModule,
        PolicyEngineModule,
        TagEngineModule,
        CompareModule,
        ToastrModule.forRoot(),
        HttpClientJsonpModule,
        QRCodeModule,
    ],
    exports: [],
    providers: [
        WebSocketService,
        UserGuard,
        StandardRegistryGuard,
        AuditorGuard,
        AuthService,
        ProfileService,
        TokenService,
        SchemaService,
        AnalyticsService,
        AuditService,
        PolicyEngineService,
        PolicyHelper,
        IPFSService,
        ArtifactService,
        SettingsService,
        LoggerService,
        DemoService,
        MessageTranslationService,
        TasksService,
        ContractService,
        ModulesService,
        ToolsService,
        MapService,
        TagsService,
        ThemeService,
        WizardService,
        SuggestionsService,
        NotificationService,
        CompareStorage,
        {
            provide: GET_SCHEMA_NAME,
            useValue: SchemaHelper.getSchemaName
        },
        {
            provide: BLOCK_TYPE_TIPS,
            useValue: BLOCK_TYPE_TIPS_VALUE
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HandleErrorsService,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true,
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }

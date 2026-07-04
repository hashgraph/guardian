import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withJsonpSupport } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule, PermissionsGuard } from './app-routing.module';
import { AppComponent } from './app.component';
import { SchemaHelper } from '@guardian/interfaces';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DrawerModule } from 'primeng/drawer';
import { ClipboardModule } from '@angular/cdk/clipboard';
//Services
import { AuthInterceptor, AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { TokenService } from './services/token.service';
import { SchemaService } from './services/schema.service';
import { HandleErrorsService } from './services/handle-errors.service';
import { AuditService } from './services/audit.service';
import { CredentialsService } from './services/credentials.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { PolicyStatisticsService } from './services/policy-statistics.service';
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
import { PermissionsService } from './services/permissions.service';
import { WorkerTasksService } from './services/worker-tasks.service';
import { SchemaRulesService } from './services/schema-rules.service';
import { PolicyLabelsService } from './services/policy-labels.service';
import { FormulasService } from './services/formulas.service';
import { CommentsService } from './services/comments.service';
//Views
import { UserProfileComponent } from './views/user-profile/user-profile.component';
import { LoginComponent } from './views/login/login.component';
import { ChangePasswordComponent } from './views/login/change-password/change-password.component';
import { HomeComponent } from './views/home/home.component';
import { HeaderComponent } from './views/header/header.component';
import { RegisterComponent } from './views/register/register.component';
import { RootProfileComponent } from './views/root-profile/root-profile.component';
import { NextGenBannerComponent } from './views/next-gen-banner/next-gen-banner.component';
import { FirstStepsPanelComponent } from './views/first-steps-panel/first-steps-panel.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { AuditComponent } from './views/audit/audit.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { AdminHeaderComponent } from './views/admin/admin-header/admin-panel.component';
import { LogsViewComponent } from './views/admin/logs-view/logs-view.component';
import { SettingsViewComponent } from './views/admin/settings-view/settings-view.component';
import { DetailsLogDialog } from './views/admin/details-log-dialog/details-log-dialog.component';
import { ServiceStatusComponent } from './views/admin/service-status/service-status.component';
import { SchemaConfigComponent } from './views/schemas/schemas.component';
import { NotificationsComponent } from './views/notifications/notifications.component';
import { RolesViewComponent } from './views/roles/roles-view.component';
import { UsersManagementComponent } from './views/user-management/user-management.component';
import { UsersManagementDetailComponent } from './views/user-management-detail/user-management-detail.component';
import { OtpDialogComponent } from './views/login/otp-dialog/otp-dialog.component';
import { OtpConfigDialogComponent } from './views/login/otp-config-dialog/otp-config-dialog.component';
import { OtpDisableDialogComponent } from './views/login/otp-disable-dialog/otp-disable-dialog.component';
import { OtpCodesDialogComponent } from './views/login/otp-codes-dialog/otp-codes-dialog.component';
//Components
import { InfoComponent } from './components/info/info/info.component';
import { BrandingComponent } from './views/branding/branding.component';
import { StandardRegistryCardComponent } from './components/standard-registry-card/standard-registry-card.component';
import { SuggestionsConfigurationComponent } from './views/suggestions-configuration/suggestions-configuration.component';
import { NotificationComponent } from './components/notification/notification.component';
import { TokenDialogComponent } from './components/token-dialog/token-dialog.component';
import { NewRelayerAccountDialog } from './components/new-relayer-account-dialog/new-relayer-account-dialog.component';
import { RelayerAccountDetailsDialog } from './components/relayer-account-details-dialog/relayer-account-details-dialog.component';
//Modules
import { MaterialModule } from './modules/common/material.module';
import { PolicyEngineModule } from './modules/policy-engine/policy-engine.module';
import { CompareModule } from './modules/analytics/analytics.module';
import { CommonComponentsModule } from './modules/common/common-components.module';
import { TagEngineModule } from './modules/tag-engine/tag-engine.module';
import { SchemaEngineModule } from './modules/schema-engine/schema-engine.module'
import { ThemeService } from './services/theme.service';
import { AppThemeService } from './services/app-theme.service';
import { RecordService } from './services/record.service';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { FormulasModule } from './modules/formulas/formulas.module';
// Injectors
import { GET_SCHEMA_NAME } from './injectors/get-schema-name.injector';
import { BLOCK_TYPE_TIPS, BLOCK_TYPE_TIPS_VALUE, } from './injectors/block-type-tips.injector';
import { SuggestionsService } from './services/suggestions.service';
import { QrCodeDialogComponent } from './components/qr-code-dialog/qr-code-dialog.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { MeecoVCSubmitDialogComponent } from './components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';
import { CompareStorage } from './services/compare-storage.service';
import { ToolsService } from './services/tools.service';
import { NewHeaderComponent } from './views/new-header/new-header.component';
import { SearchResultCardComponent } from './components/search-result-card/search-result-card.component';
import { PolicyAISearchComponent } from './views/policy-search/policy-ai-search/policy-ai-search.component';
import { PolicyGuidedSearchComponent } from './views/policy-search/policy-guided-search/policy-guided-search.component';
import { PolicySearchComponent } from './views/policy-search/policy-search.component';
import { ListOfTokensUserComponent } from './views/list-of-tokens-user/list-of-tokens-user.component';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { StepperModule } from 'primeng/stepper';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AISearchService } from './services/ai-search.service';
import { DndModule } from 'ngx-drag-drop';
import { PasswordModule } from 'primeng/password';
import { RegisterDialogComponent } from './views/login/register-dialogs/register-dialog/register-dialog.component';
import { AccountTypeSelectorDialogComponent } from './views/login/register-dialogs/account-type-selector-dialog/account-type-selector-dialog.component';
import { ForgotPasswordDialogComponent } from './views/login/forgot-password-dialog/forgot-password-dialog.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DatePickerModule } from 'primeng/datepicker';
import { Textarea as InputTextareaModule } from 'primeng/textarea';
import { ContractEngineModule } from './modules/contract-engine/contract-engine.module';
import { ProjectComparisonService } from './services/project-comparison.service';
import { ProjectComparisonModule } from './modules/project-comparison/project-comparison.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
// Prototypes
import '../prototypes/date-prototype';
import { OnlyForDemoDirective } from './directives/onlyfordemo.directive';
import { UseWithServiceDirective } from './directives/use-with-service.directive';
import { WorkerTasksComponent } from './views/worker-tasks/worker-tasks.component';
import { ExternalPoliciesService } from './services/external-policy.service';
import { UserKeysDialog } from './components/user-keys-dialog/user-keys-dialog.component';
import { GeoJsonService } from './services/geo-json.service';
import { PolicyRepositoryService } from './services/policy-repository.service';
import { RelayerAccountsService } from './services/relayer-accounts.service';
import { RelayerAccountsComponent } from './views/relayer-accounts/relayer-accounts.component';
import { TreeTableModule } from 'primeng/treetable';
import { MenubarModule } from 'primeng/menubar';
import { CredentialsPanelComponent } from './components/credentials/credentials-panel/credentials-panel.component';

const GuardianPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{blue.50}', 100: '{blue.100}', 200: '{blue.200}', 300: '{blue.300}',
            400: '{blue.400}', 500: '{blue.500}', 600: '{blue.600}', 700: '{blue.700}',
            800: '{blue.800}', 900: '{blue.900}', 950: '{blue.950}'
        },
        colorScheme: {
            light: {
                primary: { color: 'var(--primary-color)', contrastColor: 'var(--guardian-on-primary-color)',
                    hoverColor: 'var(--button-primary-color-hover)', activeColor: 'var(--button-primary-color-hover)' },
                content: { background: 'var(--guardian-background)', hoverBackground: 'var(--guardian-hover)',
                    borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)', hoverColor: 'var(--guardian-font-color)' },
                formField: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)',
                    color: 'var(--guardian-font-color)', placeholderColor: 'var(--guardian-grid-color)', iconColor: 'var(--guardian-grid-color)' },
                text: { color: 'var(--guardian-font-color)', mutedColor: 'var(--guardian-grid-color)' },
                overlay: {
                    select: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' },
                    popover: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' },
                    modal: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' }
                },
                list: { option: { color: 'var(--guardian-font-color)', focusBackground: 'var(--guardian-hover)', focusColor: 'var(--guardian-font-color)' } }
            },
            dark: {
                primary: { color: 'var(--primary-color)', contrastColor: 'var(--guardian-on-primary-color)',
                    hoverColor: 'var(--button-primary-color-hover)', activeColor: 'var(--button-primary-color-hover)' },
                content: { background: 'var(--guardian-background)', hoverBackground: 'var(--guardian-hover)',
                    borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)', hoverColor: 'var(--guardian-font-color)' },
                formField: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)',
                    color: 'var(--guardian-font-color)', placeholderColor: 'var(--guardian-grid-color)', iconColor: 'var(--guardian-grid-color)' },
                text: { color: 'var(--guardian-font-color)', mutedColor: 'var(--guardian-grid-color)' },
                overlay: {
                    select: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' },
                    popover: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' },
                    modal: { background: 'var(--guardian-background)', borderColor: 'var(--guardian-border-color)', color: 'var(--guardian-font-color)' }
                },
                list: { option: { color: 'var(--guardian-font-color)', focusBackground: 'var(--guardian-hover)', focusColor: 'var(--guardian-font-color)' } }
            }
        }
    }
});

@NgModule({
    declarations: [
        AppComponent,
        UserProfileComponent,
        LoginComponent,
        ChangePasswordComponent,
        HomeComponent,
        HeaderComponent,
        RegisterComponent,
        RootProfileComponent,
        NextGenBannerComponent,
        FirstStepsPanelComponent,
        TokenConfigComponent,
        AuditComponent,
        TrustChainComponent,
        LogsViewComponent,
        SettingsViewComponent,
        AdminHeaderComponent,
        DetailsLogDialog,
        ServiceStatusComponent,
        InfoComponent,
        SchemaConfigComponent,
        BrandingComponent,
        SuggestionsConfigurationComponent,
        StandardRegistryCardComponent,
        NotificationComponent,
        NotificationsComponent,
        QrCodeDialogComponent,
        MeecoVCSubmitDialogComponent,
        NewHeaderComponent,
        PolicySearchComponent,
        PolicyGuidedSearchComponent,
        PolicyAISearchComponent,
        SearchResultCardComponent,
        ListOfTokensUserComponent,
        RegisterDialogComponent,
        AccountTypeSelectorDialogComponent,
        ForgotPasswordDialogComponent,
        OnlyForDemoDirective,
        TokenDialogComponent,
        NewRelayerAccountDialog,
        RelayerAccountDetailsDialog,
        UseWithServiceDirective,
        RolesViewComponent,
        UsersManagementComponent,
        RelayerAccountsComponent,
        UsersManagementDetailComponent,
        WorkerTasksComponent,
        UserKeysDialog,
        CredentialsPanelComponent,
        OtpDialogComponent,
        OtpConfigDialogComponent,
        OtpDisableDialogComponent,
        OtpCodesDialogComponent
    ],
    exports: [],
    bootstrap: [AppComponent],
    imports: [BrowserModule,
        CommonModule,
        CommonComponentsModule,
        MaterialModule,
        AppRoutingModule,
        FormsModule,
        SchemaEngineModule,
        PolicyEngineModule,
        StatisticsModule,
        FormulasModule,
        TagEngineModule,
        CompareModule,
        ToastrModule.forRoot(),
        QRCodeComponent,
        ButtonModule,
        InputTextModule,
        ClipboardModule,
        SelectButtonModule,
        SelectModule,
        ButtonModule,
        DialogModule,
        TagModule,
        TableModule,
        TooltipModule,
        StepperModule,
        ProgressBarModule,
        TabsModule,
        DynamicDialogModule,
        ColorPickerModule,
        ProgressSpinnerModule,
        PasswordModule,
        MultiSelectModule,
        RadioButtonModule,
        DatePickerModule,
        InputTextareaModule,
        ContractEngineModule,
        ProjectComparisonModule,
        DndModule,
        CheckboxModule,
        CardModule,
        ToggleSwitchModule,
        DrawerModule,
        AngularSvgIconModule.forRoot(),
        TreeTableModule,
        MenubarModule
    ],
    providers: [
        WebSocketService,
        AuthService,
        ProfileService,
        TokenService,
        SchemaService,
        AnalyticsService,
        AuditService,
        CredentialsService,
        PolicyEngineService,
        PolicyStatisticsService,
        SchemaRulesService,
        PolicyLabelsService,
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
        WorkerTasksService,
        AISearchService,
        RecordService,
        CompareStorage,
        GeoJsonService,
        ProjectComparisonService,
        FormulasService,
        ExternalPoliciesService,
        PermissionsService,
        PermissionsGuard,
        CommentsService,
        RelayerAccountsService,
        PolicyRepositoryService,
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
        providePrimeNG({
            theme: {
                preset: GuardianPreset,
                options: {
                    cssLayer: {
                        name: 'primeng',
                        order: 'app-styles, primeng'
                    },
                    darkModeSelector: '.guardian-theme-dark'
                }
            }
        }),
        provideHttpClient(withInterceptorsFromDi(), withJsonpSupport())
    ]
})
export class AppModule {
    constructor(appThemeService: AppThemeService) {
        appThemeService.getCurrentTheme();
    }
}

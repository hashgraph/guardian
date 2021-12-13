import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTreeModule } from '@angular/material/tree';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule, AuditorGuard, InstallerGuard, RootAuthorityGuard } from './app-routing.module';
import { AppComponent } from './app.component';

import { AuthInterceptor, AuthService } from "./services/auth.service";
import { ProfileService } from "./services/profile.service";
import { RootConfigService } from './services/root-config.service';
import { TokenService } from './services/token.service';
import { SchemaService } from './services/schema.service';
import { HandleErrorsService } from "./services/handle-errors.service";
import { AuditService } from './services/audit.service';
import { PolicyEngineService } from './services/policy-engine.service';

import { InstallerProfileComponent } from './views/installer-profile/installer-profile.component';
import { LoginComponent } from './views/login/login.component';
import { HomeComponent } from './views/home/home.component';
import { HeaderComponent } from './components/header/header.component';
import { RegisterComponent } from './views/register/register.component';
import { RootConfigComponent } from './views/root-config/root-config.component';
import { TokenConfigComponent } from './views/token-config/token-config.component';
import { SchemaConfigComponent } from './views/schema-config/schema-config.component';
import { TokenDialog } from './components/dialogs/token-dialog/token-dialog.component';
import { JsonDialog } from './components/dialogs/vc-dialog/vc-dialog.component';
import { SchemaDialog } from './components/dialogs/schema-dialog/schema-dialog.component';
import { SchemaFormComponent } from './components/schema-form/schema-form.component';
import { SchemaConfigurationComponent } from './components/schema-configuration/schema-configuration.component';
import { AuditComponent } from './views/audit/audit.component';
import { TrustChainComponent } from './views/trust-chain/trust-chain.component';
import { ListenersLogComponent } from './listeners-log/listeners-log.component';
import { PolicyViewerComponent } from './policy-engine/policy-viewer/policy-viewer/policy-viewer.component';
import { CommonPropertiesComponent } from './policy-engine/policy-configuration/common-properties/common-properties.component';
import { DocumentSourceComponent } from './policy-engine/policy-configuration/document-source/document-source.component';
import { ActionConfigComponent } from './policy-engine/policy-configuration/action-config/action-config.component';
import { PolicyConfigurationComponent } from './policy-engine/policy-configuration/policy-configuration/policy-configuration.component';
import { DialogBlock } from './policy-engine/policy-viewer/dialog-block/dialog-block.component';
import { RequestDocumentBlockComponent } from './policy-engine/policy-viewer/request-document-block/request-document-block.component';
import { DocumentsSourceBlockComponent } from './policy-engine/policy-viewer/documents-source-block/documents-source-block.component';
import { ContainerBlockComponent } from './policy-engine/policy-viewer/container-block/container-block.component';
import { InformationBlockComponent } from './policy-engine/policy-viewer/information-block/information-block.component';
import { RenderBlockComponent } from './policy-engine/policy-viewer/render-block/render-block.component.ts';
import { ContainerConfigComponent } from './policy-engine/policy-configuration/container-config/container-config.component';
import { RequestConfigComponent } from './policy-engine/policy-configuration/request-config/request-config.component';
import { PolicyPropertiesComponent } from './policy-engine/policy-configuration/policy-properties/policy-properties.component';
import { NewPolicyDialog } from './policy-engine/new-policy-dialog/new-policy-dialog.component';
import { ActionBlockComponent } from './policy-engine/policy-viewer/action-block/action-block.component';
import { DocumentDialogBlock } from './policy-engine/policy-viewer/document-dialog-block/document-dialog-block.component';
import { StepBlockComponent } from './policy-engine/policy-viewer/step-block/step-block.component';
import { MintConfigComponent } from './policy-engine/policy-configuration/mint-config/mint-config.component';
import { SendConfigComponent } from './policy-engine/policy-configuration/send-config/send-config.component';
import { ExternalDataConfigComponent } from './policy-engine/policy-configuration/external-data-config/external-data-config.component';
import { HelpIconDialog } from './policy-engine/help-icon/help-icon.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImportSchemaDialog } from './components/dialogs/import-schema/import-schema-dialog.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TreeFlatOverview } from './components/tree-flat-overview/tree-flat-overview';
import { AggregateConfigComponent } from './policy-engine/policy-configuration/aggregate-config/aggregate-config.component';
import { InformationConfigComponent } from './policy-engine/policy-configuration/information-config/information-config.component';
import { ExportPolicyDialog } from './policy-engine/export-import-dialog/export-import-dialog.component';

@NgModule({
    declarations: [
        AppComponent,
        InstallerProfileComponent,
        LoginComponent,
        HomeComponent,
        HeaderComponent,
        RegisterComponent,
        RootConfigComponent,
        TokenConfigComponent,
        TokenDialog,
        JsonDialog,
        SchemaConfigComponent,
        SchemaDialog,
        SchemaFormComponent,
        SchemaConfigurationComponent,
        AuditComponent,
        TrustChainComponent,
        ListenersLogComponent,
        ActionBlockComponent,
        RequestDocumentBlockComponent,
        ContainerBlockComponent,
        DocumentsSourceBlockComponent,
        PolicyViewerComponent,
        RenderBlockComponent,
        DialogBlock,
        DocumentDialogBlock,
        InformationBlockComponent,
        PolicyConfigurationComponent,
        DocumentSourceComponent,
        CommonPropertiesComponent,
        ActionConfigComponent,
        ContainerConfigComponent,
        RequestConfigComponent,
        PolicyPropertiesComponent,
        NewPolicyDialog,
        StepBlockComponent,
        MintConfigComponent,
        SendConfigComponent,
        ExternalDataConfigComponent,
        HelpIconDialog,
        ImportSchemaDialog,
        TreeFlatOverview,
        AggregateConfigComponent,
        InformationConfigComponent,
        ExportPolicyDialog
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatTabsModule,
        MatStepperModule,
        MatExpansionModule,
        MatIconModule,
        ReactiveFormsModule,
        MatInputModule,
        MatButtonModule,
        MatTableModule,
        MatDialogModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatMenuModule,
        HttpClientModule,
        MatDividerModule,
        MatListModule,
        MatProgressBarModule,
        MatSelectModule,
        MatCheckboxModule,
        FormsModule,
        CommonModule,
        MatTreeModule,
        MatTooltipModule,
        DragDropModule,
        ToastrModule.forRoot()
    ],
    exports: [],
    providers: [
        InstallerGuard,
        RootAuthorityGuard,
        AuditorGuard,
        AuthService,
        ProfileService,
        RootConfigService,
        TokenService,
        SchemaService,
        AuditService,
        PolicyEngineService,
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

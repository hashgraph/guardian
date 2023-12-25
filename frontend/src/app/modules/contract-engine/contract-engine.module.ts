// Modules
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonComponentsModule } from '../common/common-components.module';
import { MaterialModule } from '../common/material.module';
import { TagEngineModule } from '../tag-engine/tag-engine.module';
import { AppRoutingModule } from 'src/app/app-routing.module';
// Components
import { RefreshBtnComponent } from './components/refresh-btn/refresh-btn.component';
// Configs
import { ContractConfigComponent } from './configs/contract-config/contract-config.component';
// Dialogs
import { DialogWrapperComponent } from './dialogs/dialog-wrapper/dialog-wrapper.component';
import { SetPoolDialogComponent } from './dialogs/set-pool-dialog/set-pool-dialog.component';
import { RetirePoolsDialogComponent } from './dialogs/retire-pools-dialog/retire-pools-dialog.component';
import { RetireRequestsDialogComponent } from './dialogs/retire-requests-dialog/retire-requests-dialog.component';
import { WipeRequestsDialogComponent } from './dialogs/wipe-requests-dialog/wipe-requests-dialog.component';
import { UserRetirePoolsDialogComponent } from './dialogs/user-retire-pools-dialog/user-retire-pools-dialog.component';
import { UserRetireRequestsDialogComponent } from './dialogs/user-retire-requests-dialog/user-retire-requests-dialog.component';
// Pipes
import { TokenCount } from './pipes/token-count.pipe';
import { UserContractConfigComponent } from './configs/user-contract-config/user-contract-config.component';

@NgModule({
    declarations: [
        ContractConfigComponent,
        SetPoolDialogComponent,
        DialogWrapperComponent,
        RetirePoolsDialogComponent,
        RetireRequestsDialogComponent,
        WipeRequestsDialogComponent,
        RefreshBtnComponent,
        TokenCount,
        UserRetirePoolsDialogComponent,
        UserRetireRequestsDialogComponent,
        UserContractConfigComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CommonComponentsModule,
        MaterialModule,
        TagEngineModule,
        AppRoutingModule,
    ],
    exports: [],
})
export class ContractEngineModule {}

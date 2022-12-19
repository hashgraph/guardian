import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from '../app-routing.module';
import { NgxFileDropModule } from 'ngx-file-drop';
import { CompareComponent } from './compare/compare.component';
import { ComparePolicyComponent } from './compare-policy/compare-policy.component';

@NgModule({
    declarations: [
        CompareComponent,
        ComparePolicyComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        AppRoutingModule,
        NgxFileDropModule
    ],
    exports: [
        CompareComponent,
        ComparePolicyComponent
    ]
})
export class CompareModule { }

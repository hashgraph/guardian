import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/modules/common/material.module';
import { FormsModule } from '@angular/forms';
// import { AppRoutingModule } from '../app-routing.module';
import { CompareComponent } from './compare/compare.component';
import { ComparePolicyComponent } from './compare-policy/compare-policy.component';
import { CompareSchemaComponent } from './compare-schema/compare-schema.component';

@NgModule({
    declarations: [
        CompareComponent,
        CompareSchemaComponent,
        ComparePolicyComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        // AppRoutingModule
    ],
    exports: [
        CompareComponent,
        CompareSchemaComponent,
        ComparePolicyComponent
    ]
})
export class CompareModule { }

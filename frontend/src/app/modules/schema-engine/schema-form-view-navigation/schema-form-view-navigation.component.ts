import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { IFieldControl } from '../schema-form-model/field-form';

export interface NavItem {
    title: string;
    accordionId: string;
    children?: NavItem[];
    count?: number;
}
@Component({
    selector: 'app-schema-form-view-navigation',
    templateUrl: './schema-form-view-navigation.component.html',
    styleUrls: ['./schema-form-view-navigation.component.scss'],
})
export class SchemaFormViewNavigationComponent {
    @Input() schemaFields: IFieldControl<any>[] | null;
    @Output() selectEvent = new EventEmitter<string>();
    @Output() hasItemsChangeEvent = new EventEmitter<boolean>(); 

    public expanded = new Set<string>();

 
    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges): void {
    }
}

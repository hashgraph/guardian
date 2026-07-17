import { Injectable, Type } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * DialogService that restores the pre-PrimeNG-20 default of showing the dialog
 * close (X) icon. PrimeNG 20 changed DynamicDialogConfig.closable to default
 * false; this wrapper defaults it back to true when the caller did not set it.
 */
@Injectable()
export class GuardianDialogService extends DialogService {
    override open<T, DataType = any, InputValuesType extends Record<string, any> = {}>(
        componentType: Type<T>,
        config: DynamicDialogConfig<DataType, InputValuesType>
    ): DynamicDialogRef<T> | null {
        if (config && config.closable === undefined) {
            config.closable = true;
        }
        return super.open(componentType, config);
    }
}

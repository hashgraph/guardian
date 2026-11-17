import { CanDeactivateFn } from '@angular/router';
import { SchemasConfigurationComponent } from './schemas-configuration.component';

/** Asks before leaving the schema editor with unsaved changes. */
export const schemasConfigurationLeaveGuard: CanDeactivateFn<SchemasConfigurationComponent> =
    (component) => component.canLeave();

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BooleanProperty } from '../modules/policy-engine/structures/storage/boolean-prop';
import { LAST_USER_STORAGE_KEY } from './app-theme.service';

export const FIELD_METADATA_STORAGE_KEY = 'SCHEMA_FORM_FIELD_METADATA';

/**
 * Per-user schema form preferences shared by every form host.
 */
@Injectable({
    providedIn: 'root'
})
export class SchemaFormPreferencesService {
    private property: BooleanProperty;

    public readonly showFieldMetadata$: BehaviorSubject<boolean>;

    constructor() {
        this.property = this.createProperty();
        this.showFieldMetadata$ = new BehaviorSubject<boolean>(this.property.load());
    }

    private createProperty(): BooleanProperty {
        const userId = localStorage.getItem(LAST_USER_STORAGE_KEY);
        const key = userId ? `${FIELD_METADATA_STORAGE_KEY}:${userId}` : FIELD_METADATA_STORAGE_KEY;
        return new BooleanProperty(key, false);
    }

    /**
     * Re-reads the flag when another user signed in since the service was created.
     */
    public reload(): void {
        const property = this.createProperty();
        if (property.name === this.property.name) {
            return;
        }
        this.property = property;
        this.showFieldMetadata$.next(property.load());
    }

    public get showFieldMetadata(): boolean {
        return this.showFieldMetadata$.value;
    }

    public setShowFieldMetadata(value: boolean): void {
        this.property.value = value;
        this.property.save();
        this.showFieldMetadata$.next(value);
    }
}

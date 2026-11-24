import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BooleanProperty } from '../modules/policy-engine/structures/storage/boolean-prop';
import { StringProperty } from '../modules/policy-engine/structures/storage/string-prop';
import { LAST_USER_STORAGE_KEY } from './app-theme.service';

export const FIELD_METADATA_STORAGE_KEY = 'SCHEMA_FORM_FIELD_METADATA';
export const COMMENTS_WIDTH_STORAGE_KEY = 'SCHEMA_FORM_COMMENTS_WIDTH';

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

    private userKey(base: string): string {
        let userId: string | null = null;
        try {
            userId = localStorage.getItem(LAST_USER_STORAGE_KEY);
        } catch {
            // storage can be unavailable; the shared key is fine
        }
        return userId ? `${base}:${userId}` : base;
    }

    private createProperty(): BooleanProperty {
        return new BooleanProperty(this.userKey(FIELD_METADATA_STORAGE_KEY), false);
    }

    /**
     * The saved width of the discussions panel, or null when none is saved.
     */
    public getCommentsWidth(): number | null {
        const saved = new StringProperty(this.userKey(COMMENTS_WIDTH_STORAGE_KEY)).load();
        const width = Number(saved);
        return saved && Number.isFinite(width) ? width : null;
    }

    public setCommentsWidth(width: number): void {
        const property = new StringProperty(this.userKey(COMMENTS_WIDTH_STORAGE_KEY));
        property.value = String(width);
        property.save();
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

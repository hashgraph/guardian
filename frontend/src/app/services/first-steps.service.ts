import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserRole } from '@guardian/interfaces';

// Both the enabled flag and the drawer open/close are stored per role so each role
// keeps its own state (the "2 stores" per concept), e.g.
// FIRST_STEPS_ENABLED_STANDARD_REGISTRY / FIRST_STEPS_OPEN_STANDARD_REGISTRY and the
// matching USER keys.
const ENABLED_KEY_PREFIX = 'FIRST_STEPS_ENABLED_';
const OPEN_KEY_PREFIX = 'FIRST_STEPS_OPEN_';
const PANEL_OPEN_CLASS = 'first-steps-open';

// Roles that are always enabled because their profile has no First Steps toggle to
// turn it off. The default user has no toggle, so First Steps is always on for them;
// Standard Registry stays toggleable from its profile Configuration card.
const ALWAYS_ENABLED_ROLES: string[] = [UserRole.USER];

@Injectable({
    providedIn: 'root'
})
export class FirstStepsService {
    // Feature on/off for the active role. Toggleable roles persist it (see setEnabled
    // / readStoredEnabled); always-enabled roles are true regardless.
    private readonly enabled$ = new BehaviorSubject<boolean>(false);

    // Drawer visibility for the active role. Persisted per role (see setRole /
    // persistOpen), in memory here.
    private readonly open$ = new BehaviorSubject<boolean>(false);

    // The signed-in role that has a First Steps page, or null when the current user
    // has none. Set by the panel once the role is known; it gates the drawer + menu
    // item and selects which per-role enabled/open stores are used.
    private role: string | null = null;

    public isEnabled(): boolean {
        return this.enabled$.value;
    }

    public setEnabled(value: boolean): void {
        // Always-enabled roles (default user) have no toggle and cannot be turned off.
        if (this.role === null || this.isAlwaysEnabled(this.role) || value === this.enabled$.value) {
            return;
        }
        try {
            localStorage.setItem(ENABLED_KEY_PREFIX + this.role, String(value));
        } catch (error) {
            console.error(error);
        }
        this.enabled$.next(value);
        // Enabling opens the drawer for the active role; disabling closes it.
        this.setOpen(value);
    }

    // Whether First Steps applies to the current user's role (has a page).
    public isAvailable(): boolean {
        return this.role !== null;
    }

    public isOpen(): boolean {
        return this.role !== null && this.enabled$.value && this.open$.value;
    }

    public setOpen(value: boolean): void {
        if (this.role === null || value === this.open$.value) {
            return;
        }
        this.open$.next(value);
        this.persistOpen();
        this.applyPanelClass();
    }

    public toggle(): void {
        this.setOpen(!this.open$.value);
    }

    // Called by the panel when the session resolves. `role` is the role's First
    // Steps key (a FIRST_STEPS_PAGES key) or null when the user has no page. Loads
    // that role's enabled + open state (open defaults to true so the drawer opens by
    // default the first time and remembers the choice afterwards).
    public setRole(role: string | null): void {
        this.role = role;
        this.enabled$.next(role !== null && this.readStoredEnabled(role));
        this.open$.next(role !== null && this.readStoredOpen(role));
        this.applyPanelClass();
    }

    private isAlwaysEnabled(role: string): boolean {
        return ALWAYS_ENABLED_ROLES.includes(role);
    }

    private persistOpen(): void {
        if (this.role === null) {
            return;
        }
        try {
            localStorage.setItem(OPEN_KEY_PREFIX + this.role, String(this.open$.value));
        } catch (error) {
            console.error(error);
        }
    }

    private readStoredOpen(role: string): boolean {
        try {
            const stored = localStorage.getItem(OPEN_KEY_PREFIX + role);
            // Default to open the first time this role sees First Steps.
            return stored === null ? true : stored === 'true';
        } catch {
            return true;
        }
    }

    private readStoredEnabled(role: string): boolean {
        // Always-enabled roles (default user) ignore any stored value.
        if (this.isAlwaysEnabled(role)) {
            return true;
        }
        try {
            return localStorage.getItem(ENABLED_KEY_PREFIX + role) === 'true';
        } catch {
            return false;
        }
    }

    private applyPanelClass(): void {
        document.documentElement.classList.toggle(PANEL_OPEN_CLASS, this.isOpen());
    }
}

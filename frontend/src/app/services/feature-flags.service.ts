import { Injectable } from '@angular/core';
import { UserRole } from '@guardian/interfaces';

// Experimental UI (next-gen) enable state is stored per role so an admin turning it
// on/off does not affect other roles on the same browser.
const NEXT_GEN_UI_KEY_PREFIX = 'NEXT_GEN_UI_ENABLED_';

// Roles for which experimental UI is forced off for now (they have no profile
// toggle). The default user does not get the experimental UI / banner.
const ALWAYS_DISABLED_ROLES: string[] = [UserRole.USER];

@Injectable({
    providedIn: 'root'
})
export class FeatureFlagsService {
    // Active role, set once the session resolves. Selects the per-role store and
    // whether experimental UI is allowed at all.
    private role: string | null = null;

    public setRole(role: string | null): void {
        this.role = role;
    }

    public isNextGenUiEnabled(): boolean {
        if (this.role === null || this.isAlwaysDisabled(this.role)) {
            return false;
        }
        try {
            return localStorage.getItem(NEXT_GEN_UI_KEY_PREFIX + this.role) === 'true';
        } catch {
            return false;
        }
    }

    public setNextGenUiEnabled(value: boolean): void {
        // Always-disabled roles (default user) have no toggle and stay off.
        if (this.role === null || this.isAlwaysDisabled(this.role)) {
            return;
        }
        try {
            localStorage.setItem(NEXT_GEN_UI_KEY_PREFIX + this.role, String(value));
        } catch (error) {
            console.error(error);
        }
    }

    private isAlwaysDisabled(role: string): boolean {
        return ALWAYS_DISABLED_ROLES.includes(role);
    }
}

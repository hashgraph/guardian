import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const FIRST_STEPS_ENABLED_KEY = 'FIRST_STEPS_ENABLED';
const PANEL_OPEN_CLASS = 'first-steps-open';

@Injectable({
    providedIn: 'root'
})
export class FirstStepsService {
    private readonly enabled$ = new BehaviorSubject<boolean>(this.readStoredEnabled());
    private readonly open$ = new BehaviorSubject<boolean>(this.enabled$.value);

    // Whether First Steps is available for the current user's role. The enabled
    // flag lives in localStorage (shared per browser across accounts), so the
    // drawer must additionally be gated by role — set from the panel once the
    // user's role is known. Until then it stays unavailable (drawer hidden).
    private available: boolean = false;

    public isEnabled(): boolean {
        return this.enabled$.value;
    }

    public setEnabled(value: boolean): void {
        if (value === this.enabled$.value) {
            return;
        }
        try {
            localStorage.setItem(FIRST_STEPS_ENABLED_KEY, String(value));
        } catch (error) {
            console.error(error);
        }
        this.enabled$.next(value);
        // Enabling opens the drawer by default; disabling closes it.
        this.setOpen(value);
    }

    public isOpen(): boolean {
        return this.available && this.open$.value;
    }

    public setOpen(value: boolean): void {
        if (value === this.open$.value) {
            return;
        }
        this.open$.next(value);
        this.applyPanelClass();
    }

    public setAvailable(available: boolean): void {
        if (available === this.available) {
            return;
        }
        this.available = available;
        this.applyPanelClass();
    }

    private readStoredEnabled(): boolean {
        try {
            return localStorage.getItem(FIRST_STEPS_ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    }

    private applyPanelClass(): void {
        document.documentElement.classList.toggle(PANEL_OPEN_CLASS, this.available && this.open$.value);
    }
}

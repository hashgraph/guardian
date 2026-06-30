import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FeatureFlagsService {
    private readonly NEXT_GEN_UI_KEY = 'NEXT_GEN_UI_ENABLED';

    public isNextGenUiEnabled(): boolean {
        try {
            return localStorage.getItem(this.NEXT_GEN_UI_KEY) === 'true';
        } catch {
            return false;
        }
    }

    public setNextGenUiEnabled(value: boolean): void {
        try {
            localStorage.setItem(this.NEXT_GEN_UI_KEY, String(value));
        } catch (error) {
            console.error(error);
        }
    }
}

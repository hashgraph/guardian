import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DocWidgetService {
    public readonly available: boolean = window.location.protocol === 'https:';

    private pending: boolean = false;

    public isEnabled(): boolean {
        try {
            return localStorage.getItem('SHOW_DOC_WIDGET') !== 'false';
        } catch {
            return true;
        }
    }

    public setEnabled(value: boolean): void {
        try {
            localStorage.setItem('SHOW_DOC_WIDGET', String(value));
        } catch (error) {
            console.error(error);
        }
        this.apply();
    }

    public applyOnStartup(): void {
        this.apply();
    }

    /**
     * The stored value is read when the widget is actually available, so a
     * pending call cannot overwrite a newer choice made while it was waiting.
     */
    private apply(): void {
        this.whenReady((gitBook) => {
            if (this.isEnabled()) {
                gitBook('show');
            } else {
                gitBook('close');
                gitBook('hide');
            }
        });
    }

    /**
     * The GitBook script is loaded asynchronously from index.html, so it may not
     * be available yet when the application bootstraps.
     */
    private whenReady(callback: (gitBook: any) => void): void {
        const gitBook = (window as any).GitBook;
        if (gitBook) {
            callback(gitBook);
            return;
        }
        if (!this.available || this.pending) {
            return;
        }
        this.pending = true;
        const interval = setInterval(() => {
            const loaded = (window as any).GitBook;
            if (loaded) {
                this.stopWaiting(interval);
                callback(loaded);
            }
        }, 100);
        setTimeout(() => this.stopWaiting(interval), 30000);
    }

    private stopWaiting(interval: any): void {
        clearInterval(interval);
        this.pending = false;
    }
}

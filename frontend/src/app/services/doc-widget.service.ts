import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DocWidgetService {
    public readonly available: boolean = window.location.protocol === 'https:';

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
        const gitBook = (window as any).GitBook;
        if (gitBook) {
            if (value) {
                gitBook('show');
            } else {
                gitBook('close');
                gitBook('hide');
            }
        }
    }

    public applyOnStartup(): void {
        if (!this.isEnabled()) {
            const gitBook = (window as any).GitBook;
            if (gitBook) {
                gitBook('hide');
            }
        }
    }
}

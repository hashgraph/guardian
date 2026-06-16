import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type MenuLayout = 'vertical' | 'horizontal';

export interface MenuLayoutOption {
    label: string;
    value: MenuLayout;
    icon: string;
}

const MENU_LAYOUT_STORAGE_KEY = 'MAIN_HEADER_LAYOUT';
const HORIZONTAL_CLASS = 'layout-horizontal';

@Injectable({
    providedIn: 'root'
})
export class MenuLayoutService {
    public readonly layouts: MenuLayoutOption[] = [
        { label: 'Vertical', value: 'vertical', icon: 'pi-bars' },
        { label: 'Horizontal', value: 'horizontal', icon: 'pi-window-maximize' }
    ];

    private readonly layout$ = new BehaviorSubject<MenuLayout>(this.readStoredLayout());

    constructor() {
        this.applyLayoutClass(this.layout$.value);
    }

    public get layout(): MenuLayout {
        return this.layout$.value;
    }

    public get changes(): Observable<MenuLayout> {
        return this.layout$.asObservable();
    }

    public setLayout(layout: MenuLayout): void {
        const resolved = this.findLayout(layout).value;
        try {
            localStorage.setItem(MENU_LAYOUT_STORAGE_KEY, resolved);
        } catch (error) {
            console.error(error);
        }
        this.applyLayoutClass(resolved);
        this.layout$.next(resolved);
    }

    public toggle(): void {
        this.setLayout(this.layout$.value === 'vertical' ? 'horizontal' : 'vertical');
    }

    private readStoredLayout(): MenuLayout {
        try {
            return this.findLayout(localStorage.getItem(MENU_LAYOUT_STORAGE_KEY)).value;
        } catch (error) {
            console.error(error);
            return this.layouts[0].value;
        }
    }

    private applyLayoutClass(layout: MenuLayout): void {
        document.documentElement.classList.toggle(HORIZONTAL_CLASS, layout === 'horizontal');
    }

    private findLayout(layout: string | null): MenuLayoutOption {
        return this.layouts.find((item) => item.value === layout) || this.layouts[0];
    }
}

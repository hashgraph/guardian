import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PolicyBlock, Theme, ThemeRule, ThemeSettings } from '../modules/policy-engine/structures';
import { byRolesTheme } from '../modules/policy-engine/themes/by-roles';
import { defaultTheme } from '../modules/policy-engine/themes/default';
import { byApiTheme } from '../modules/policy-engine/themes/by-api';
import { API_BASE_URL } from './api';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly url: string = `${API_BASE_URL}/themes`;
    private storage: ThemeSettings;

    constructor(private http: HttpClient) {
        this.storage = new ThemeSettings([
            defaultTheme,
            byRolesTheme,
            byApiTheme
        ]);
        this.storage.load();
    }

    public load(): Observable<any[]> {
        this.storage.load();
        return this.http.get<any>(`${this.url}/`);
    }

    public create(theme: Theme): Observable<any> {
        return this.http.post<any>(`${this.url}/`, theme.toJson());
    }

    public delete(theme: Theme): Observable<any> {
        return this.http.delete<boolean>(`${this.url}/${theme.id}`);
    }

    public update(theme: Theme): Observable<any> {
        return this.http.put<any>(`${this.url}/${theme.id}`, theme.toJson());
    }

    public export(id: string): Observable<ArrayBuffer> {
        return this.http.get(`${this.url}/${id}/export/file`, {
            responseType: 'arraybuffer'
        });
    }

    public import(file: any): Observable<any> {
        return this.http.post<any[]>(`${this.url}/import/file`, file, {
            headers: {
                'Content-Type': 'binary/octet-stream'
            }
        });
    }

    public getThemes(): Theme[] {
        return this.storage.themes;
    }

    public setThemes(json: any[]): void {
        if (Array.isArray(json)) {
            const themes = json.map(t => Theme.from(t));
            this.storage.set(themes);
        } else {
            this.storage.set([]);
        }
    }

    public addTheme(json: any): void {
        const theme = Theme.from(json);
        this.storage.add(theme);
    }

    public setCurrent(theme: Theme) {
        this.storage.currentTheme = theme;
    }

    public getCurrent(): Theme {
        return this.storage.currentTheme;
    }

    public deleteTheme(theme: Theme): void {
        this.storage.delete(theme);
    }

    public saveTheme() {
        this.storage.save();
    }

    public getStyle(item: PolicyBlock): any {
        return this.storage.currentTheme.getStyle(item);
    }

    public getStyleByIndex(index: number): any {
        return this.storage.currentTheme.getStyleByIndex(index);
    }

    public getStyleByRule(item: ThemeRule): any {
        return item.style;
    }

    // public import(json: any): Theme {
    //     const theme = Theme.from(json);
    //     theme.readonly = false;
    //     this.storage.add(theme);
    //     return theme;
    // }
}

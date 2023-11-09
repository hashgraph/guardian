

import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Injectable()
export class CompareStorage {
    private readonly name: string = 'COMPARE_IDS';
    private subject: Subject<unknown>;

    constructor() {
        this.subject = new Subject();
    }

    public subscribe(
        next?: ((id: any) => void),
        error?: ((error: any) => void),
        complete?: (() => void)
    ): Subscription {
        return this.subject.subscribe(next, error, complete);
    }

    public load(): string[] {
        try {
            const text = localStorage.getItem(this.name);
            if (text) {
                const ids = JSON.parse(text);
                if (Array.isArray(ids)) {
                    return ids;
                } else {
                    return [];
                }
            } else {
                return [];
            }
        } catch (error) {
            return [];
        }
    }

    public save(ids: string[]): void {
        try {
            localStorage.setItem(this.name, JSON.stringify(ids));
            this.subject.next(ids);
        } catch (error) {
            console.error(error);
        }
    }

    public remove(id: string): void {
        let ids = this.load();
        ids = ids.filter(i => i !== id);
        this.save(ids);
    }
}

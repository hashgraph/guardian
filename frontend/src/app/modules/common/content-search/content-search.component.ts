import {
    Component,
    Input,
    OnDestroy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import Mark from 'mark.js';

const HIGHLIGHT_CLASS = 'content-search-highlight';
const ACTIVE_CLASS = 'content-search-highlight-active';

@Component({
    selector: 'content-search',
    templateUrl: './content-search.component.html',
    styleUrls: ['./content-search.component.scss'],
    standalone: false
})
export class ContentSearchComponent implements OnDestroy {
    @Input() searchContainer!: HTMLElement;
    @Input() placeholder: string = 'Quick Search by keyword';
    @Input() debounce: number = 300;

    public query: string = '';
    public matchCount: number = 0;
    public currentIndex: number = -1;

    private destroy$ = new Subject<void>();
    private search$ = new Subject<string>();
    private highlights: HTMLElement[] = [];
    private markInstance!: Mark;

    constructor() {
        this.search$
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((query) => this.performSearch(query));
    }

    ngOnDestroy(): void {
        this.markInstance?.unmark();
        this.destroy$.next();
        this.destroy$.complete();
    }

    public onInput(value: string): void {
        this.query = value;
        this.search$.next(value.trim().toLowerCase());
    }

    public onClear(): void {
        this.query = '';
        this.search$.next('');
    }

    public goToNext(): void {
        if (this.matchCount === 0) {
            return;
        }
        this.currentIndex = (this.currentIndex + 1) % this.matchCount;
        this.scrollToCurrent();
    }

    public goToPrevious(): void {
        if (this.matchCount === 0) {
            return;
        }
        this.currentIndex =
            (this.currentIndex - 1 + this.matchCount) % this.matchCount;
        this.scrollToCurrent();
    }

    public onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) {
                this.goToPrevious();
            } else {
                this.goToNext();
            }
        }
        if (event.key === 'Escape') {
            this.onClear();
        }
    }

    private performSearch(query: string): void {
        this.highlights = [];
        this.matchCount = 0;
        this.currentIndex = -1;

        if (!this.searchContainer) {
            return;
        }

        if (!this.markInstance) {
            this.markInstance = new Mark(this.searchContainer);
        }

        this.markInstance.unmark({
            done: () => {
                if (!query) {
                    return;
                }
                this.markInstance.mark(query, {
                    className: HIGHLIGHT_CLASS,
                    acrossElements: true,
                    separateWordSearch: false,
                    exclude: ['input', 'textarea', 'select'],
                    each: (element: HTMLElement) => {
                        this.highlights.push(element);
                    },
                    done: (count: number) => {
                        this.matchCount = this.highlights.length;
                        if (this.matchCount > 0) {
                            this.currentIndex = 0;
                            this.scrollToCurrent();
                        }
                    },
                });
            },
        });
    }

    private scrollToCurrent(): void {
        this.highlights.forEach((el) => el.classList.remove(ACTIVE_CLASS));

        if (
            this.currentIndex >= 0 &&
            this.currentIndex < this.highlights.length
        ) {
            const active = this.highlights[this.currentIndex];
            active.classList.add(ACTIVE_CLASS);
            active.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }
}
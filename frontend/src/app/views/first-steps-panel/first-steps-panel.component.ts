import { Component, HostListener, OnInit } from '@angular/core';
import { IUser, UserPermissions } from '@guardian/interfaces';
import { environment } from 'src/environments/environment';
import { FirstStepsService } from '../../services/first-steps.service';
import { AuthService } from '../../services/auth.service';
import { renderFirstStepsMarkdown } from './first-steps-markdown';
import { FIRST_STEPS_PAGES } from './first-steps-pages';

const CONTENT_BASE = `https://raw.githubusercontent.com/hashgraph/guardian/${environment.githubRef}/docs/first-steps/`;

const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 640;
const DEFAULT_PANEL_WIDTH = 380;
const PANEL_WIDTH_KEY = 'FIRST_STEPS_PANEL_WIDTH';
const PANEL_WIDTH_VAR = '--first-steps-panel-width';
const RESIZING_CLASS = 'first-steps-resizing';

@Component({
    selector: 'app-first-steps-panel',
    templateUrl: './first-steps-panel.component.html',
    styleUrls: ['./first-steps-panel.component.scss'],
    standalone: false
})
export class FirstStepsPanelComponent implements OnInit {
    public contentHtml: string = '';
    public loadFailed: boolean = false;

    private resizing: boolean = false;
    private resizeStartX: number = 0;
    private resizeStartWidth: number = 0;

    constructor(
        public firstSteps: FirstStepsService,
        private auth: AuthService
    ) {
        this.restoreWidth();
    }

    ngOnInit(): void {
        // Hide until the current user's role is confirmed. The service is a
        // singleton, so the role/open state can be stale from a previous account
        // on the same browser session; reset it before the new role resolves.
        this.firstSteps.setRole(null);
        this.auth.sessions().subscribe((user: IUser | null) => {
            const permissions = new UserPermissions(user);
            const page = FIRST_STEPS_PAGES[permissions.role];
            // Gate by role, and select that role's per-role open/close store.
            this.firstSteps.setRole(page ? permissions.role : null);
            if (page) {
                this.loadContent(CONTENT_BASE + page);
            }
        });
    }

    private loadContent(url: string): void {
        this.loadFailed = false;
        // Use the native fetch (not Angular HttpClient) so the app's AuthInterceptor
        // does not attach an Authorization header. A plain cross-origin GET with no
        // custom headers stays a "simple request", so the browser skips the CORS
        // preflight that raw.githubusercontent.com rejects (403 on OPTIONS).
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            })
            .then((markdown) => {
                this.contentHtml = renderFirstStepsMarkdown(markdown);
            })
            .catch(() => {
                this.loadFailed = true;
            });
    }

    get open(): boolean {
        return this.firstSteps.isOpen();
    }

    hide(): void {
        // The header X hides the drawer but keeps First Steps enabled, so the
        // user can reopen it from the "First Steps" side-menu item. Disabling
        // the feature stays in the profile Configuration card.
        this.firstSteps.setOpen(false);
    }

    onResizeStart(event: MouseEvent): void {
        event.preventDefault();
        this.resizing = true;
        this.resizeStartX = event.clientX;
        this.resizeStartWidth = this.currentWidth();
        document.documentElement.classList.add(RESIZING_CLASS);
        document.body.style.userSelect = 'none';
    }

    @HostListener('document:mousemove', ['$event'])
    onDocumentMouseMove(event: MouseEvent): void {
        if (!this.resizing) {
            return;
        }
        // Right-side drawer: dragging the handle left widens it.
        const delta = this.resizeStartX - event.clientX;
        const width = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, this.resizeStartWidth + delta));
        document.documentElement.style.setProperty(PANEL_WIDTH_VAR, `${width}px`);
    }

    @HostListener('document:mouseup')
    onDocumentMouseUp(): void {
        if (!this.resizing) {
            return;
        }
        this.resizing = false;
        document.documentElement.classList.remove(RESIZING_CLASS);
        document.body.style.userSelect = '';
        try {
            localStorage.setItem(PANEL_WIDTH_KEY, String(this.currentWidth()));
        } catch (error) {
            console.error(error);
        }
    }

    private currentWidth(): number {
        const value = getComputedStyle(document.documentElement).getPropertyValue(PANEL_WIDTH_VAR);
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : DEFAULT_PANEL_WIDTH;
    }

    private restoreWidth(): void {
        try {
            const stored = localStorage.getItem(PANEL_WIDTH_KEY);
            if (!stored) {
                return;
            }
            const width = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, parseInt(stored, 10)));
            if (Number.isFinite(width)) {
                document.documentElement.style.setProperty(PANEL_WIDTH_VAR, `${width}px`);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

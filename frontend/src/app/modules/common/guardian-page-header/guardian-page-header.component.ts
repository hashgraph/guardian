import { Component, Input } from '@angular/core';
import { PAGE_HELP_TEXT } from './page-help-text';

/**
 * Page title with optional help text underneath explaining what the page is for.
 * Pass `helpKey` to pull the copy from PAGE_HELP_TEXT, or `description` to set it
 * directly. Anything projected as content is rendered inside the title row.
 *
 * The title input is `pageTitle`, not `title`: a static `title` attribute is also
 * written to the host element by Angular, which would show a native tooltip over
 * the whole header.
 */
@Component({
    selector: 'guardian-page-header',
    templateUrl: './guardian-page-header.component.html',
    styleUrls: ['./guardian-page-header.component.scss'],
    standalone: false
})
export class GuardianPageHeader {
    @Input('pageTitle') pageTitle: string = '';
    @Input('description') description: string = '';
    @Input('helpKey') helpKey: string = '';

    get helpText(): string {
        return this.description || PAGE_HELP_TEXT[this.helpKey] || '';
    }
}

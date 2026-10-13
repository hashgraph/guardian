import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { convertLatexToMarkup } from 'mathlive';
import { isSafeHref } from '../schema-engine/rich-text-editor/rich-text-sanitizer';

const REMOVED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK', 'META', 'BASE', 'FORM']);

/**
 * Renders LaTeX as static MathLive markup (needs mathlive/static.css).
 * Angular's [innerHTML] sanitizer strips the style attributes MathLive relies on,
 * so the markup is scrubbed here and written directly.
 */
@Directive({
    selector: '[latexMarkup]',
    standalone: false
})
export class LatexMarkupDirective implements OnChanges {
    private static readonly cache = new Map<string, string | null>();

    @Input('latexMarkup') latex: string | null | undefined = '';

    constructor(private el: ElementRef<HTMLElement>) {
    }

    ngOnChanges(): void {
        const latex = this.latex || '';
        const html = LatexMarkupDirective.toMarkup(latex);
        if (html === null) {
            this.el.nativeElement.textContent = latex;
        } else {
            this.el.nativeElement.innerHTML = html;
        }
    }

    private static toMarkup(latex: string): string | null {
        if (!latex) {
            return '';
        }
        if (LatexMarkupDirective.cache.has(latex)) {
            return LatexMarkupDirective.cache.get(latex)!;
        }
        let result: string | null;
        try {
            result = LatexMarkupDirective.scrub(convertLatexToMarkup(latex));
        } catch {
            result = null;
        }
        LatexMarkupDirective.cache.set(latex, result);
        return result;
    }

    private static scrub(html: string): string {
        const inert = document.implementation.createHTMLDocument('');
        inert.body.innerHTML = html;
        const walk = (node: Element) => {
            for (const child of Array.from(node.children)) {
                if (REMOVED_TAGS.has(child.tagName.toUpperCase())) {
                    child.remove();
                    continue;
                }
                for (const attr of Array.from(child.attributes)) {
                    if (attr.name.toLowerCase().startsWith('on')) {
                        child.removeAttribute(attr.name);
                    }
                }
                if (child.tagName.toUpperCase() === 'A') {
                    const href = child.getAttribute('href');
                    if (href !== null && !(/^https?:/i.test(href.trim()) && isSafeHref(href))) {
                        child.removeAttribute('href');
                    }
                }
                walk(child);
            }
        };
        walk(inert.body);
        return inert.body.innerHTML;
    }
}

import { ElementRef } from '@angular/core';
import { LatexMarkupDirective } from './latex-markup.directive';

function render(latex: string): HTMLElement {
    const host = document.createElement('span');
    const directive = new LatexMarkupDirective(new ElementRef(host));
    directive.latex = latex;
    directive.ngOnChanges();
    return host;
}

describe('LatexMarkupDirective', () => {
    it('renders plain LaTeX as markup', () => {
        const host = render('x^2');
        expect(host.querySelector('.ML__latex')).not.toBeNull();
    });

    it('shows LaTeX with CSS-injecting commands as plain text', () => {
        const cases = [
            '\\htmlStyle{position:fixed;background:url(https://evil.example/x.png)}{x}',
            '\\class{evil}{x}',
            '\\cssId{evil}{x}',
            '\\htmlData{a=b}{x}',
            '\\style{color:red}{x}',
        ];
        for (const latex of cases) {
            const host = render(latex);
            expect(host.children.length).withContext(latex).toBe(0);
            expect(host.textContent).withContext(latex).toBe(latex);
        }
    });
});

import { SchemaFormViewComponent } from './schema-form-view.component';

describe('SchemaFormViewComponent', () => {

    function createComponent(): any {
        return Object.create(SchemaFormViewComponent.prototype);
    }

    function makeField(overrides: any = {}): any {
        return {
            type: 'string',
            customType: undefined,
            format: undefined,
            ...overrides,
        };
    }

    describe('isRichText', () => {

        it('should recognise a Rich Text field', () => {
            const component = createComponent();
            expect(component.isRichText(makeField({ customType: 'richText' }))).toBeTrue();
        });

        it('should not recognise a plain string or another custom type', () => {
            const component = createComponent();
            expect(component.isRichText(makeField())).toBeFalse();
            expect(component.isRichText(makeField({ customType: 'table' }))).toBeFalse();
        });
    });

    describe('isInput', () => {

        it('should not claim a Rich Text field', () => {
            const component = createComponent();
            expect(component.isInput(makeField({ customType: 'richText' }))).toBeFalse();
        });

        it('should claim a string carrying a custom type it does not know', () => {
            const component = createComponent();
            expect(component.isInput(makeField({ customType: 'markdown' }))).toBeTrue();
        });

        it('should still claim a plain string, number and integer', () => {
            const component = createComponent();
            expect(component.isInput(makeField())).toBeTrue();
            expect(component.isInput(makeField({ type: 'number' }))).toBeTrue();
            expect(component.isInput(makeField({ type: 'integer' }))).toBeTrue();
        });

        it('should still refuse the types it refused before', () => {
            const component = createComponent();
            expect(component.isInput(makeField({ customType: 'table' }))).toBeFalse();
            expect(component.isInput(makeField({ format: 'date' }))).toBeFalse();
            expect(component.isInput(makeField({ format: 'time' }))).toBeFalse();
            expect(component.isInput(makeField({ format: 'date-time' }))).toBeFalse();
        });
    });

    describe('onRichTextLinkClick', () => {

        function clickOn(html: string): any {
            const host = document.createElement('div');
            host.innerHTML = html;
            const target = host.querySelector('a') || host;
            const event: any = new MouseEvent('click');
            Object.defineProperty(event, 'target', { value: target });
            return event;
        }

        it('should open a safe link in a new tab and cancel the default navigation', () => {
            const component = createComponent();
            const openSpy = spyOn(window, 'open');
            const event = clickOn('<a href="https://example.com">link</a>');
            spyOn(event, 'preventDefault');

            component.onRichTextLinkClick(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
        });

        it('should not open an unsafe href', () => {
            const component = createComponent();
            const openSpy = spyOn(window, 'open');

            component.onRichTextLinkClick(clickOn('<a href="javascript:alert(1)">link</a>'));

            expect(openSpy).not.toHaveBeenCalled();
        });

        it('should do nothing when the click is not on a link', () => {
            const component = createComponent();
            const openSpy = spyOn(window, 'open');

            component.onRichTextLinkClick(clickOn('<span>text</span>'));

            expect(openSpy).not.toHaveBeenCalled();
        });
    });

    describe('getRichTextValue', () => {

        it('should render the stored Markdown as HTML', () => {
            const component = createComponent();
            expect(component.getRichTextValue('# Title')).toBe('<h1>Title</h1>');
            expect(component.getRichTextValue('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
        });

        it('should mark a link for a new tab', () => {
            const component = createComponent();
            const result = component.getRichTextValue('[text](https://example.com)');
            expect(result).toContain('target="_blank"');
            expect(result).toContain('rel="noopener noreferrer"');
        });

        it('should return an empty string for a value that is not a string', () => {
            const component = createComponent();
            expect(component.getRichTextValue(null)).toBe('');
            expect(component.getRichTextValue(undefined)).toBe('');
            expect(component.getRichTextValue(42)).toBe('');
        });

        it('should not let markup inside the value become markup', () => {
            const component = createComponent();
            expect(component.getRichTextValue('<img src="x">')).toBe('<p>&lt;img src="x"&gt;</p>');
        });
    });
});

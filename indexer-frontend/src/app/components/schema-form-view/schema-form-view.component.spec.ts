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

    describe('rich text images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';
        const dataUrl = 'data:image/jpg;base64,AAAA';
        const markdown = `Before\n\n![Site photo](${reference})`;

        const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

        function createLoadingComponent(result: Promise<string>): any {
            const component = createComponent();
            component.resolvedImages = new Map();
            component.pendingImages = new Map();
            component.hide = {};
            component.changeDetector = { markForCheck: jasmine.createSpy('markForCheck') };
            component.entitiesService = {
                getImageByLink: jasmine.createSpy('getImageByLink').and.returnValue(result),
            };
            return component;
        }

        const richTextField = (name: string) => ({
            name,
            type: 'string',
            customType: 'richText',
            isArray: false,
            isRef: false,
        });

        it('should fetch a reference in the value and render it as src', async () => {
            const component = createLoadingComponent(Promise.resolve(dataUrl));
            component.values = { field0: markdown };

            component.update([richTextField('field0')]);
            await flush();

            expect(component.entitiesService.getImageByLink).toHaveBeenCalledWith(reference);
            const html = component.getRichTextValue(markdown);
            expect(html).toContain(`src="${dataUrl}"`);
            expect(html).toContain('Before');
        });

        it('should fetch one reference once when two fields share it', async () => {
            const component = createLoadingComponent(Promise.resolve(dataUrl));
            component.values = { field0: markdown, field1: markdown };

            component.update([richTextField('field0'), richTextField('field1')]);
            await flush();

            expect(component.entitiesService.getImageByLink).toHaveBeenCalledTimes(1);
        });

        it('should keep the text and leave src empty when the fetch fails', async () => {
            const component = createLoadingComponent(Promise.reject(new Error('404')));
            component.values = { field0: markdown };

            component.update([richTextField('field0')]);
            await flush();
            component.update([richTextField('field0')]);
            await flush();

            expect(component.entitiesService.getImageByLink).toHaveBeenCalledTimes(1);
            const html = component.getRichTextValue(markdown);
            expect(html).toContain('Before');
            expect(html).toContain('src=""');
        });

        it('should fetch nothing for a value with no image', async () => {
            const component = createLoadingComponent(Promise.resolve(dataUrl));
            component.values = { field0: 'Just text' };

            component.update([richTextField('field0')]);
            await flush();

            expect(component.entitiesService.getImageByLink).not.toHaveBeenCalled();
        });
    });
});

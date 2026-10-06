import { SchemaFormViewComponent } from './schema-form-view.component';
import { IPFSService } from 'src/app/services/ipfs.service';

describe('SchemaFormViewComponent', () => {
    let component: SchemaFormViewComponent;
    let ipfs: any;
    let dialogService: any;
    let cdr: any;

    beforeEach(() => {
        ipfs = {
            getImageByLink: jasmine.createSpy('getImageByLink').and.returnValue(Promise.resolve('')),
            getImageFromDryRunStorage: jasmine.createSpy('getImageFromDryRunStorage').and.returnValue(Promise.resolve('')),
            getImageWithDryRunFallback: IPFSService.prototype.getImageWithDryRunFallback,
        };
        dialogService = {
            open: jasmine.createSpy('open').and.returnValue({ onClose: { subscribe: jasmine.createSpy() } }),
        };
        cdr = { detectChanges: jasmine.createSpy('detectChanges') };
        component = new SchemaFormViewComponent(ipfs as any, dialogService as any, cdr as any);
        component.hide = {};
        component.values = {};
    });

    describe('loadImg caching', () => {
        const makeItem = () => ({ value: 'ipfs://cid1', loading: false, imgSrc: '' } as any);

        it('fetches a link once and serves later renders from cache', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.resolve('data:image/png;base64,AAA'));

            const first = makeItem();
            await (component as any).loadImg(first);
            const second = makeItem();
            await (component as any).loadImg(second);

            expect(ipfs.getImageByLink).toHaveBeenCalledTimes(1);
            expect(first.imgSrc).toBe('data:image/png;base64,AAA');
            expect(second.imgSrc).toBe('data:image/png;base64,AAA');
            expect(second.loading).toBe(false);
        });

        it('does not re-request a link that failed to resolve', async () => {
            component.dryRun = true;
            ipfs.getImageFromDryRunStorage.and.returnValue(Promise.reject(new Error('404')));

            const first = makeItem();
            await (component as any).loadImg(first);
            await (component as any).loadImg(makeItem());
            await (component as any).loadImg(makeItem());

            expect(ipfs.getImageFromDryRunStorage).toHaveBeenCalledTimes(1);
            expect(first.imgSrc).toBe('');
            expect(first.loading).toBe(false);
        });

        it('shares a single request between fields loaded concurrently', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.resolve('data:image/png;base64,BBB'));

            const items = [makeItem(), makeItem(), makeItem()];
            await Promise.all(items.map((item) => (component as any).loadImg(item)));

            expect(ipfs.getImageByLink).toHaveBeenCalledTimes(1);
            expect(items.every((item) => item.imgSrc === 'data:image/png;base64,BBB')).toBe(true);
        });

        it('keeps dry-run and live lookups in separate cache entries', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.resolve('live'));
            ipfs.getImageFromDryRunStorage.and.returnValue(Promise.resolve('dry'));

            const live = makeItem();
            await (component as any).loadImg(live);
            component.dryRun = true;
            const dry = makeItem();
            await (component as any).loadImg(dry);

            expect(live.imgSrc).toBe('live');
            expect(dry.imgSrc).toBe('dry');
            expect(ipfs.getImageByLink).toHaveBeenCalledTimes(1);
            expect(ipfs.getImageFromDryRunStorage).toHaveBeenCalledTimes(1);
        });
    });

    describe('getRichTextValue', () => {
        it('renders the stored markdown and opens its link in a new tab', () => {
            expect(component.getRichTextValue('[Example](https://example.com)'))
                .toBe('<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a></p>');
        });

        it('does not let markup inside the value become markup', () => {
            expect(component.getRichTextValue('<img src="x">')).toBe('<p>&lt;img src="x"&gt;</p>');
        });

        it('returns an empty string for a non-string value', () => {
            expect(component.getRichTextValue(null)).toBe('');
        });
    });

    describe('rich text images', () => {
        const reference = 'ipfs://bafkreiabcdef123456';
        const dataUrl = 'data:image/jpg;base64,AAAA';
        const markdown = `Before\n\n![Site photo](${reference})\n\nAfter`;

        const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

        const richTextField = (name: string) => ({
            name,
            title: name,
            description: '',
            type: 'string',
            customType: 'richText',
            isArray: false,
            isRef: false
        } as any);

        it('resolves a reference inside the value and renders it as src', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.resolve(dataUrl));
            component.values = { field0: markdown };

            (component as any).update([richTextField('field0')]);
            await flush();

            expect(ipfs.getImageByLink).toHaveBeenCalledWith(reference);
            const html = component.getRichTextValue(markdown);
            expect(html).toContain(`src="${dataUrl}"`);
            expect(html).toContain('Before');
        });

        it('fetches one reference once when two fields share it', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.resolve(dataUrl));
            component.values = { field0: markdown, field1: markdown };

            (component as any).update([richTextField('field0'), richTextField('field1')]);
            await flush();

            expect(ipfs.getImageByLink).toHaveBeenCalledTimes(1);
        });

        it('leaves src empty when the fetch fails and does not request it again', async () => {
            ipfs.getImageByLink.and.returnValue(Promise.reject(new Error('404')));
            component.values = { field0: markdown };

            (component as any).update([richTextField('field0')]);
            await flush();
            (component as any).update([richTextField('field0')]);
            await flush();

            expect(ipfs.getImageByLink).toHaveBeenCalledTimes(1);
            expect(component.getRichTextValue(markdown)).toContain('src=""');
        });

        it('falls back to ipfs when the dry-run store has no such file', async () => {
            component.dryRun = true;
            ipfs.getImageFromDryRunStorage.and.returnValue(Promise.reject(new Error('404')));
            ipfs.getImageByLink.and.returnValue(Promise.resolve(dataUrl));
            component.values = { field0: markdown };

            (component as any).update([richTextField('field0')]);
            await flush();

            expect(ipfs.getImageFromDryRunStorage).toHaveBeenCalledWith(reference);
            expect(component.getRichTextValue(markdown)).toContain(`src="${dataUrl}"`);
        });

        it('does not fetch anything for a value with no image', async () => {
            component.values = { field0: 'Just text' };

            (component as any).update([richTextField('field0')]);
            await flush();

            expect(ipfs.getImageByLink).not.toHaveBeenCalled();
        });
    });

    describe('onRichTextLinkClick', () => {
        it('opens a safe link in a new tab', () => {
            const link = document.createElement('a');
            link.setAttribute('href', 'https://example.com');
            const event = new MouseEvent('click', { cancelable: true });
            Object.defineProperty(event, 'target', { value: link });
            const openSpy = spyOn(window, 'open');

            component.onRichTextLinkClick(event);

            expect(event.defaultPrevented).toBeTrue();
            expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
        });

        it('does not open an unsafe link', () => {
            const link = document.createElement('a');
            link.setAttribute('href', 'javascript:alert(1)');
            const event = new MouseEvent('click', { cancelable: true });
            Object.defineProperty(event, 'target', { value: link });
            const openSpy = spyOn(window, 'open');

            component.onRichTextLinkClick(event);

            expect(event.defaultPrevented).toBeFalse();
            expect(openSpy).not.toHaveBeenCalled();
        });
    });
});

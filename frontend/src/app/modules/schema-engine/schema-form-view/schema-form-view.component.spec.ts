import { SchemaFormViewComponent } from './schema-form-view.component';

describe('SchemaFormViewComponent', () => {
    let component: SchemaFormViewComponent;
    let ipfs: any;
    let dialogService: any;
    let cdr: any;

    beforeEach(() => {
        ipfs = {
            getImageByLink: jasmine.createSpy('getImageByLink').and.returnValue(Promise.resolve('')),
            getImageFromDryRunStorage: jasmine.createSpy('getImageFromDryRunStorage').and.returnValue(Promise.resolve('')),
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
        it('adds new-tab attributes to an existing link without changing its text', () => {
            expect(component.getRichTextValue('<p><a href="https://example.com">Example</a></p>'))
                .toBe('<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a></p>');
        });

        it('returns an empty string for a non-string value', () => {
            expect(component.getRichTextValue(null)).toBe('');
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

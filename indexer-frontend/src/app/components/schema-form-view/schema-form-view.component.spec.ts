import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EntitiesService } from '@services/entities.service';
import { ArtifactsService } from '@services/artifacts.service';
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
        const cid = 'bafkreiabcdef123456';
        const reference = 'ipfs://' + cid;
        const markdown = `Before\n\n![Site photo](${reference})`;
        const png = Uint8Array.from(atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII='
        ), character => character.charCodeAt(0));

        function componentFor(getFileBlob: jasmine.Spy): any {
            const component = createComponent();
            component.resolvedImages = new Map();
            component.pendingImages = new Map();
            component.hide = {};
            component.analytics = { richTextImages: { [cid]: 'grid-image' } };
            component.artifacts = { getFileBlob };
            component.changeDetector = { markForCheck: jasmine.createSpy('markForCheck') };
            component.entitiesService = {
                getImageByLink: jasmine.createSpy('getImageByLink').and.callFake(() => {
                    throw new Error('Unsafe whole-file route was used');
                }),
            };
            return component;
        }

        const field = (name: string, isArray = false) => ({
            name, type: 'string', customType: 'richText', isArray, isRef: false,
        });

        it('reads a cached image above 1 MB and renders it inline without a file download', async () => {
            const body = new Blob([png, new Uint8Array(2 * 1024 * 1024)], { type: 'text/csv' });
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of({ body }));
            const component = componentFor(getFileBlob);
            const click = spyOn(HTMLAnchorElement.prototype, 'click');
            const source = await component.loadImage(reference);

            expect(body.size).toBeGreaterThan(1024 * 1024);
            expect(getFileBlob).toHaveBeenCalledOnceWith('grid-image');
            expect(component.entitiesService.getImageByLink).not.toHaveBeenCalled();
            expect(click).not.toHaveBeenCalled();
            const host = document.createElement('div');
            host.innerHTML = component.getRichTextValue(markdown);
            expect(host.querySelector('img')?.getAttribute('src')).toBe(source);
            expect(host.querySelector('button')).toBeNull();
            expect(host.textContent).toContain('Before');
            const image = new Image();
            image.src = source;
            await image.decode();
            expect(image.naturalWidth).toBe(1);
        });

        it('shares a pending image read and reuses the resolved data', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of({ body: new Blob([png]) }));
            const component = componentFor(getFileBlob);
            const [first, second] = await Promise.all([
                component.loadImage(reference), component.loadImage(reference),
            ]);
            expect(first).toBe(second);
            expect(await component.loadImage(reference)).toBe(first);
            expect(getFileBlob).toHaveBeenCalledTimes(1);
        });

        it('does not fall back when the sync has not prepared the image yet', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob');
            const component = componentFor(getFileBlob);
            component.analytics = {};
            expect(await component.loadImage(reference)).toBeNull();
            expect(getFileBlob).not.toHaveBeenCalled();
            expect(component.entitiesService.getImageByLink).not.toHaveBeenCalled();
            component.analytics = { richTextImages: { [cid]: 'grid-image' } };
            getFileBlob.and.returnValue(of({ body: new Blob([png]) }));
            expect(await component.loadImage(reference)).toContain('data:image/jpeg;base64,');
        });

        it('keeps text after a failed fetch and retries on the next field update', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(throwError(() => new Error('404')));
            const component = componentFor(getFileBlob);
            expect(await component.loadImage(reference)).toBeNull();
            expect(component.getRichTextValue(markdown)).toContain('Before');
            expect(component.getRichTextValue(markdown)).toContain('src=""');
            getFileBlob.and.returnValue(of({ body: new Blob([png]) }));
            expect(await component.loadImage(reference)).toContain('data:image/jpeg;base64,');
            expect(getFileBlob).toHaveBeenCalledTimes(2);
        });

        it('retries an empty response instead of remembering a broken image forever', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of({ body: null }));
            const component = componentFor(getFileBlob);
            expect(await component.loadImage(reference)).toBeNull();
            getFileBlob.and.returnValue(of({ body: new Blob([png]) }));
            expect(await component.loadImage(reference)).not.toBeNull();
        });

        it('loads array field images from the shared analytics map', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of({ body: new Blob([png]) }));
            const component = componentFor(getFileBlob);
            component.values = { photos: [markdown, markdown] };
            component.update([field('photos', true)]);
            await component.loadImage(reference);
            expect(getFileBlob).toHaveBeenCalledOnceWith('grid-image');
            expect(component.fields[0].list.length).toBe(2);
        });

        it('fetches nothing for text or an ordinary IPFS link', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob');
            const component = componentFor(getFileBlob);
            component.values = { note: `Just [a file](${reference})` };
            component.update([field('note')]);
            expect(getFileBlob).not.toHaveBeenCalled();
        });
    });

    describe('geo field', () => {
        const geoValue = {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [36, -1] } }],
            geoFile: { name: 'site.kml', format: 'kml', cid: 'bafy-geo' },
        };

        const analytics = { geoFiles: { 'bafy-geo': 'grid-geo', 'bafy-kmz': 'grid-kmz' } };

        async function gzip(text: string): Promise<Blob> {
            const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Response(stream).blob();
        }

        function createDownloadComponent(getFileBlob: jasmine.Spy): any {
            const component = createComponent();
            component.loadingGeoFiles = new Set();
            component.geoFileErrors = new Map();
            component.changeDetector = { markForCheck: jasmine.createSpy('markForCheck') };
            component.artifacts = { getFileBlob };
            component.analytics = analytics;
            return component;
        }

        function captureDownload(): { blobs: Blob[]; names: string[] } {
            const result = { blobs: [] as Blob[], names: [] as string[] };
            spyOn(URL, 'createObjectURL').and.callFake((blob: any) => {
                result.blobs.push(blob);
                return 'blob:geo';
            });
            spyOn(URL, 'revokeObjectURL');
            spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
                result.names.push(this.download);
            });
            return result;
        }

        it('should size the box to the JSON and stop at ten rows', () => {
            const component = createComponent();
            expect(component.getGeoRows({ a: 1 })).toBe(3);
            expect(component.getGeoRows(geoValue)).toBe(10);
        });

        it('should download a gzipped original through the chunked artifacts endpoint, unzipped, under its own name', async () => {
            const text = '<kml><Placemark/></kml>';
            const getFileBlob = jasmine.createSpy('getFileBlob').and.returnValue(of({ body: await gzip(text) }));
            const component = createDownloadComponent(getFileBlob);
            const download = captureDownload();

            await component.downloadGeoFile(geoValue.geoFile);

            expect(getFileBlob).toHaveBeenCalledWith('grid-geo');
            expect(download.names).toEqual(['site.kml']);
            expect(await download.blobs[0].text()).toBe(text);
            expect(component.isGeoFileLoading(geoValue.geoFile)).toBeFalse();
            expect(component.getGeoFileError(geoValue.geoFile)).toBeUndefined();
        });

        it('should download a file that is not gzipped as it is', async () => {
            const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01]);
            const component = createDownloadComponent(
                jasmine.createSpy('getFileBlob').and.returnValue(of({ body: new Blob([bytes]) }))
            );
            const download = captureDownload();

            await component.downloadGeoFile({ name: 'site.kmz', format: 'kmz', cid: 'bafy-kmz' });

            expect(download.names).toEqual(['site.kmz']);
            expect(new Uint8Array(await download.blobs[0].arrayBuffer())).toEqual(bytes);
        });

        it('should show an error and allow a retry when the file cannot be loaded', async () => {
            const component = createDownloadComponent(
                jasmine.createSpy('getFileBlob').and.returnValue(throwError(() => new Error('500')))
            );
            const download = captureDownload();

            await component.downloadGeoFile(geoValue.geoFile);

            expect(download.names).toEqual([]);
            expect(component.getGeoFileError(geoValue.geoFile)).toBe('Failed to download the original file.');
            expect(component.isGeoFileLoading(geoValue.geoFile)).toBeFalse();
        });

        it('should request nothing without an IPFS file or before the Indexer has saved it', async () => {
            const getFileBlob = jasmine.createSpy('getFileBlob');
            const component = createDownloadComponent(getFileBlob);

            await component.downloadGeoFile({ name: 'site.kml', fileId: 'dry-run-only' });
            await component.downloadGeoFile({ name: 'site.kml', cid: 'bafy-not-synced' });
            await component.downloadGeoFile(undefined);

            expect(getFileBlob).not.toHaveBeenCalled();
            expect(component.getGeoFileId({ cid: 'bafy-not-synced' })).toBeUndefined();
            expect(component.getGeoFileId(geoValue.geoFile)).toBe('grid-geo');
        });

        describe('layout', () => {
            const geoField = (overrides: any = {}) => ({
                name: 'location',
                description: 'Location',
                type: '#GeoJSON',
                customType: 'geo',
                isRef: true,
                isArray: false,
                fields: [],
                ...overrides,
            });

            function render(field: any, values: any, fileAnalytics: any = analytics): HTMLElement {
                TestBed.configureTestingModule({
                    imports: [SchemaFormViewComponent],
                    providers: [
                        { provide: EntitiesService, useValue: {} },
                        { provide: ArtifactsService, useValue: {} },
                    ],
                });
                const fixture = TestBed.createComponent(SchemaFormViewComponent);
                fixture.componentRef.setInput('fields', [field]);
                fixture.componentRef.setInput('values', values);
                fixture.componentRef.setInput('analytics', fileAnalytics);
                fixture.componentInstance.ngOnChanges();
                fixture.detectChanges();
                return fixture.nativeElement;
            }

            it('should show a single geo value as a plain field, not as a nested form', () => {
                const element = render(geoField(), { location: geoValue });
                const textarea = element.querySelector('textarea.geo-field-json') as HTMLTextAreaElement;

                expect(textarea.closest('.form-field-group')).toBeNull();
                expect(textarea.closest('.form-field-array-item')).toBeNull();
                expect(textarea.rows).toBe(10);
                expect(JSON.parse(textarea.value)).toEqual(geoValue);
                expect(element.querySelector('.geo-field-file-name')?.textContent?.trim()).toBe('site.kml');
                const button = element.querySelector('.geo-field-file button') as HTMLButtonElement;
                expect(button.textContent?.trim()).toBe('Download original file');
                expect(button.disabled).toBeFalse();
                expect(element.querySelector('.geo-field-note')).toBeNull();
            });

            it('should disable the button and say so while the Indexer has not saved the file yet', () => {
                const element = render(geoField(), { location: geoValue }, {});
                const button = element.querySelector('.geo-field-file button') as HTMLButtonElement;

                expect(button.disabled).toBeTrue();
                expect(element.querySelector('.geo-field-note')?.textContent?.trim())
                    .toBe('The file is still being prepared. Refresh the page in a minute.');
            });

            it('should not offer a download for drawn shapes without a stored file', () => {
                const { geoFile, ...drawn } = geoValue;
                const element = render(geoField(), { location: drawn });

                expect(element.querySelector('textarea.geo-field-json')).not.toBeNull();
                expect(element.querySelector('.geo-field-file')).toBeNull();
            });

            it('should show each value of a geo array without the nested form indent', () => {
                const element = render(geoField({ isArray: true }), { location: [geoValue, geoValue] });
                const textareas = Array.from(element.querySelectorAll('textarea.geo-field-json'));

                expect(textareas.length).toBe(2);
                expect(textareas.every((textarea) => !textarea.closest('.form-field-group'))).toBeTrue();
            });
        });
    });
});

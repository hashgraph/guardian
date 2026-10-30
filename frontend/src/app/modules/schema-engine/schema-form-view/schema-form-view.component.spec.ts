import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { DialogService } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
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

    describe('sections in a calculation preview', () => {
        const render = (preview: boolean, array = false) => {
            const fields = [{
                name: 'section', fullPath: 'section', description: 'Section', type: '#Section',
                isRef: true, isArray: array,
                fields: [{ name: 'details', fullPath: 'section.details', description: 'Details', type: '#Details', isRef: true, isArray: false,
                    fields: [{ name: 'amount', fullPath: 'section.details.amount', description: 'Amount', type: 'number', isRef: false, isArray: false }] }],
            }];
            TestBed.configureTestingModule({
                declarations: [SchemaFormViewComponent],
                imports: [CommonModule],
                providers: [
                    { provide: IPFSService, useValue: ipfs },
                    { provide: DialogService, useValue: dialogService },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(SchemaFormViewComponent);
            fixture.componentRef.setInput('private-fields', {});
            fixture.componentRef.setInput('fields', fields);
            fixture.componentRef.setInput('values', { section: array ? [{ details: { amount: 3 } }] : { details: { amount: 3 } } });
            fixture.componentRef.setInput('preview', preview);
            fixture.detectChanges();
            return fixture;
        };

        for (const array of [false, true]) {
            it(`reports loading before rendering a Preview section with array ${array}`, fakeAsync(() => {
                const fixture = render(true, array);
                const view = fixture.componentInstance;
                const changes = spyOn(view.previewLoadingChange, 'emit');
                fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', 0);
                fixture.detectChanges();
                expect(changes).toHaveBeenCalledOnceWith(true);
                expect(fixture.debugElement.queryAll(By.directive(SchemaFormViewComponent)).length).toBe(0);
                tick(16);
                expect(view.fields![0].previewReady).not.toBeTrue();
                tick(16);
                fixture.detectChanges();
                const child = fixture.debugElement.query(By.directive(SchemaFormViewComponent));
                expect(child).not.toBeNull();
                expect(changes.calls.allArgs()).toEqual([[true]]);
                child.componentInstance.previewLoadingChange.emit(true);
                expect(changes.calls.allArgs()).toEqual([[true], [true]]);
                child.componentInstance.previewLoadingChange.emit(false);
                tick(16);
                expect(changes.calls.allArgs()).toEqual([[true], [true], [false], [false]]);
            }));
        }

        it('keeps ordinary section opening immediate without loading notifications or frames', fakeAsync(() => {
            const fixture = render(false);
            const view = fixture.componentInstance;
            const changes = spyOn(view.previewLoadingChange, 'emit');
            fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', 0);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.directive(SchemaFormViewComponent))).not.toBeNull();
            expect(view.fields![0].previewReady).toBeUndefined();
            expect(changes).not.toHaveBeenCalled();
            tick(64);
            expect(changes).not.toHaveBeenCalled();
        }));

        it('prepares Preview sections opened from navigation', fakeAsync(() => {
            const fixture = render(true);
            const view = fixture.componentInstance;
            const changes = spyOn(view.previewLoadingChange, 'emit');
            view.openAccordion('section');
            expect(changes).toHaveBeenCalledOnceWith(true);
            tick(48);
            expect(view.fields![0].previewReady).toBeTrue();
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        }));

        for (const action of ['close', 'destroy', 'replace']) {
            it(`balances Preview loading when interrupted by ${action}`, fakeAsync(() => {
                const fixture = render(true);
                const view = fixture.componentInstance;
                const changes = spyOn(view.previewLoadingChange, 'emit');
                view.openAccordion('section');
                if (action === 'close') {
                    fixture.debugElement.query(By.css('p-accordion')).triggerEventHandler('valueChange', null);
                } else if (action === 'destroy') {
                    fixture.destroy();
                } else {
                    fixture.componentRef.setInput('fields', []);
                    fixture.detectChanges();
                }
                tick(64);
                expect(changes.calls.allArgs()).toEqual([[true], [false]]);
            }));
        }
    });

    describe('tables in a calculation preview', () => {
        const table = {
            name: 'rows',
            description: 'Rows',
            type: '#Row',
            isArray: true,
            isRef: true,
            fullPath: 'rows',
            fields: [{ name: 'value', description: 'Value', type: 'string', isArray: false, isRef: false, fullPath: 'rows.value' }]
        } as any;
        const values = { rows: Array.from({ length: 30 }, (_, index) => ({ value: `row ${index}` })) };

        const render = (preview: boolean) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [SchemaFormViewComponent],
                imports: [TableModule],
                providers: [
                    { provide: IPFSService, useValue: ipfs },
                    { provide: DialogService, useValue: dialogService },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(SchemaFormViewComponent);
            fixture.componentRef.setInput('private-fields', {});
            fixture.componentRef.setInput('values', values);
            fixture.componentRef.setInput('fields', [table]);
            fixture.componentRef.setInput('preview', preview);
            fixture.detectChanges();
            return fixture;
        };

        it('builds the rows once and shows them 25 per page', () => {
            const fixture = render(true);
            const view = fixture.componentInstance;
            const item = view.fields![0];
            expect(view.getTableRows(item)).toBe(view.getTableRows(item));
            expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(25);
            expect(fixture.nativeElement.querySelector('.p-paginator')).not.toBeNull();
        });

        it('builds the rows again for another list', () => {
            const fixture = render(true);
            const view = fixture.componentInstance;
            const item = view.fields![0];
            const rows = view.getTableRows(item);
            item.list = values.rows.slice(0, 2) as any;
            expect(view.getTableRows(item)).not.toBe(rows);
            expect(view.getTableRows(item).length).toBe(2);
        });

        it('keeps the ordinary view unchanged', () => {
            const fixture = render(false);
            const view = fixture.componentInstance;
            const item = view.fields![0];
            expect(view.getTableRows(item)).not.toBe(view.getTableRows(item));
            expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(30);
            expect(fixture.nativeElement.querySelector('.p-paginator')).toBeNull();
        });
    });
});

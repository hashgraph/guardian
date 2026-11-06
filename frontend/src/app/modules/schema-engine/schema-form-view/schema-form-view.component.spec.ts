import { NO_ERRORS_SCHEMA } from '@angular/core';
import { UnitSystem } from '@guardian/interfaces';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaFormViewComponent } from './schema-form-view.component';
import { SchemaFormPreferencesService } from 'src/app/services/schema-form-preferences.service';
import { BehaviorSubject } from 'rxjs';
import { IPFSService } from 'src/app/services/ipfs.service';

describe('SchemaFormViewComponent', () => {
    let component: SchemaFormViewComponent;
    let ipfs: any;
    let dialogService: any;
    let cdr: any;
    let preferences: any;

    beforeEach(() => {
        ipfs = {
            getImageByLink: jasmine.createSpy('getImageByLink').and.returnValue(Promise.resolve('')),
            getImageFromDryRunStorage: jasmine.createSpy('getImageFromDryRunStorage').and.returnValue(Promise.resolve('')),
            getImageWithDryRunFallback: IPFSService.prototype.getImageWithDryRunFallback,
        };
        dialogService = {
            open: jasmine.createSpy('open').and.returnValue({ onClose: { subscribe: jasmine.createSpy() } }),
        };
        cdr = { detectChanges: jasmine.createSpy('detectChanges'), markForCheck: jasmine.createSpy('markForCheck') };
        preferences = { showFieldMetadata$: new BehaviorSubject<boolean>(false) };
        component = new SchemaFormViewComponent(ipfs as any, dialogService as any, cdr as any, preferences as any);
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

    /** A schema field the way the schema model builds it. */
    const field = (name: string, extra: any = {}, parent = ''): any => ({
        name,
        title: name,
        description: name[0].toUpperCase() + name.slice(1),
        type: 'string',
        isArray: false,
        isRef: false,
        fullPath: parent ? `${parent}.${name}` : name,
        ...extra,
    });

    const render = (
        fields: any[],
        values: any,
        inputs: { [name: string]: any } = {}
    ): ComponentFixture<SchemaFormViewComponent> => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            declarations: [SchemaFormViewComponent],
            imports: [CommonModule],
            providers: [
                { provide: IPFSService, useValue: ipfs },
                { provide: DialogService, useValue: dialogService },
                { provide: SchemaFormPreferencesService, useValue: preferences },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(SchemaFormViewComponent);
        fixture.componentRef.setInput('private-fields', inputs['private-fields'] || {});
        for (const [name, value] of Object.entries(inputs)) {
            if (name !== 'private-fields') {
                fixture.componentRef.setInput(name, value);
            }
        }
        fixture.componentRef.setInput('fields', fields);
        fixture.componentRef.setInput('values', values);
        fixture.detectChanges();
        return fixture;
    };

    const texts = (fixture: ComponentFixture<SchemaFormViewComponent>, selector: string): string[] =>
        Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector)).map((node) => node.textContent!.replace(/\s+/g, ' ').trim());

    describe('values', () => {
        it('shows false and 0 and says "No" for a boolean that is false', () => {
            const fixture = render(
                [field('count', { type: 'number' }), field('flag', { type: 'boolean' })],
                { count: 0, flag: false }
            );
            expect(texts(fixture, '.sf-ro-value')).toEqual(['0', 'No']);
            expect(fixture.nativeElement.querySelector('.sf-empty')).toBeNull();
        });

        it('shows "Not provided" for an empty value, an empty list and an unset boolean', () => {
            const fixture = render(
                [field('a'), field('b', { isArray: true }), field('c', { type: 'boolean' })],
                { a: '', b: [] }
            );
            expect(texts(fixture, '.sf-empty')).toEqual(['Not provided', 'Not provided', 'Not provided']);
        });

        it('leaves out a field hidden by a failed condition and a private field', () => {
            const hidden = field('hidden', { notCorrespondCondition: true });
            const fixture = render(
                [field('shown'), hidden, field('secret')],
                { shown: 'a', hidden: 'b', secret: 'c' },
                { 'private-fields': { secret: true } }
            );
            expect(texts(fixture, '.sf-ro-lt')).toEqual(['Shown']);
        });

        it('formats dates and shows a boolean as Yes or No', () => {
            const fixture = render(
                [
                    field('day', { format: 'date' }),
                    field('moment', { format: 'date-time' }),
                    field('ok', { type: 'boolean' }),
                ],
                { day: '2024-03-05', moment: '2024-03-05T10:20:00Z', ok: true }
            );
            const values = texts(fixture, '.sf-ro-value');
            expect(values[0]).toBe('Mar 5, 2024');
            expect(values[1]).toContain('Mar 5, 2024');
            expect(values[2]).toBe('Yes');
        });

        it('does not throw on a date that cannot be parsed', () => {
            const fixture = render([field('day', { format: 'date' })], { day: 'soon' });
            expect(texts(fixture, '.sf-ro-value')).toEqual(['soon']);
        });

        it('shows a unit before or after the value', () => {
            const fixture = render(
                [field('a', { type: 'number', unit: '$', unitSystem: UnitSystem.Prefix }), field('b', { type: 'number', unit: 'kg', unitSystem: UnitSystem.Postfix })],
                { a: 5, b: 6 }
            );
            expect(texts(fixture, '.sf-ro-value')).toEqual(['$5', '6kg']);
        });

        it('shows a link for a URL and a mailto link for an email', () => {
            const fixture = render(
                [field('site', { format: 'url' }), field('mail', { format: 'email' })],
                { site: 'https://example.com', mail: 'a@b.com' }
            );
            const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a.sf-ro-a')).map((a) => a.getAttribute('href'));
            expect(links).toEqual(['https://example.com', 'mailto:a@b.com']);
        });

        it('shows an IPFS file with its CID and an Open link', () => {
            const cid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            const fixture = render(
                [field('file', { pattern: '^ipfs://.+', customType: 'file' })],
                { file: `ipfs://${cid}` }
            );
            expect(texts(fixture, '.sf-ro-url')).toEqual([`ipfs://${cid}`]);
            expect(fixture.nativeElement.querySelector('a.sf-ro-open').getAttribute('href')).toBe(`https://ipfs.io/ipfs/${cid}`);
            const copies = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-ro-file-links sf-copy'));
            expect(copies.map((node) => node.getAttribute('tip'))).toEqual(['Copy link', 'Copy CID']);
        });

        it('lists files without bullets', () => {
            const fixture = render(
                [field('files', { isArray: true, pattern: '^ipfs://.+', customType: 'file' })],
                { files: ['ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'] }
            );
            expect(fixture.nativeElement.querySelector('.sf-ro-list').classList).toContain('sf-ro-plain');
        });

        it('shows short list values as chips and long ones as a list', () => {
            const fixture = render(
                [field('tags', { isArray: true }), field('notes', { isArray: true })],
                { tags: ['a', 'b'], notes: ['x'.repeat(60)] }
            );
            expect(texts(fixture, '.sf-ro-chip')).toEqual(['a', 'b']);
            expect(fixture.nativeElement.querySelectorAll('.sf-ro-list li').length).toBe(1);
        });

        it('shows a warning and the stored value when a list holds a single value', () => {
            const fixture = render([field('tags', { isArray: true })], { tags: 'solo' });
            expect(texts(fixture, '.sf-ro-warn')[0]).toContain("Value doesn't match the schema type (expected a list)");
            expect(texts(fixture, '.sf-ro-raw')).toEqual(['solo']);
        });

        it('shows "Not added" for a sub-schema that has no value', () => {
            const sub = field('sub', { isRef: true, fields: [field('x', {}, 'sub')] });
            const fixture = render([sub], {});
            expect(texts(fixture, '.sf-sub-head')).toEqual(['SubNot added']);
            expect(fixture.debugElement.query(By.directive(SchemaFormViewComponent))).toBeNull();
        });

        it('spans the full row for long values and a single column for short ones', () => {
            const fixture = render(
                [field('text'), field('num', { type: 'number' }), field('other', { type: 'number' }), field('rich', { customType: 'richText' })],
                { text: 'a', num: 1, other: 2, rich: 'b' }
            );
            const full = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-ro-cell')).map((cell) => cell.classList.contains('sf-full'));
            expect(full).toEqual([true, false, false, true]);
        });
    });

    describe('sub-schemas and records', () => {
        const rowFields = [field('name', {}, 'rows'), field('size', { type: 'number' }, 'rows')];
        const rows = field('rows', { isArray: true, isRef: true, fields: rowFields });
        const values = { rows: [{ name: 'North', size: 4 }, { name: 'South', size: 7 }] };

        it('shows a sub-schema always open', () => {
            const sub = field('sub', { isRef: true, fields: [field('x', {}, 'sub')] });
            const fixture = render([sub], { sub: { x: 'inner' } });
            const child = fixture.debugElement.query(By.directive(SchemaFormViewComponent));
            expect(child).not.toBeNull();
            expect(texts(fixture, '.sf-ro-value')).toEqual(['inner']);
            expect(child.componentInstance.pathPrefix).toBe('sub.');
        });

        it('titles a record by the text of a rich text field, not its markup', () => {
            const richRows = field('rows', { isArray: true, isRef: true, fields: [field('note', { customType: 'richText' }, 'rows')] });
            const fixture = render([richRows], { rows: [{ note: '# Heading\n\nSome **bold** text' }] });
            expect(texts(fixture, '.sf-record-text')).toEqual(['Heading Some bold text']);
        });

        it('judges the conditions of an array by each row', () => {
            const conditional = field('rows', {
                isArray: true,
                isRef: true,
                fields: [field('kind', {}, 'rows'), field('area', { type: 'number' }, 'rows'), field('other', {}, 'rows')],
                conditions: [{
                    ifCondition: { field: { name: 'kind' }, fieldValue: 'land' },
                    thenFields: [{ name: 'area' }],
                    elseFields: [{ name: 'other' }],
                }],
            });
            const fixture = render([conditional], { rows: [{ kind: 'land', area: 5 }, { kind: 'sea', other: 'x' }] });
            (fixture.nativeElement.querySelector('.sf-ro-recbar-actions .sf-link') as HTMLElement).click();
            fixture.detectChanges();
            const bodies = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-record-body'));
            const labels = bodies.map((body) => Array.from(body.querySelectorAll('.sf-ro-lt')).map((node) => node.textContent!.trim()));
            expect(labels).toEqual([['Kind', 'Area'], ['Kind', 'Other']]);
        });

        it('keeps each card on its own row when paging back and forth', () => {
            const many = Array.from({ length: 30 }, (_, i) => ({ name: `row-${i}`, size: i }));
            const fixture = render([rows], { rows: many });
            const component = fixture.componentInstance;
            const item = component.fields![0];
            const page = (index: number) => {
                component.onPage(item, { pageIndex: index, pageSize: 25 });
                (component as any).changeDetector.markForCheck();
                fixture.detectChanges();
            };
            const expandAll = () => {
                (fixture.nativeElement.querySelector('.sf-ro-recbar-actions .sf-link') as HTMLElement).click();
                fixture.detectChanges();
            };
            expandAll();
            page(1);
            expandAll();
            page(0);
            const first = fixture.nativeElement.querySelector('.sf-record') as HTMLElement;
            expect(first.querySelector('.sf-record-text b')!.textContent).toBe('row-0');
            expect(first.querySelector('.sf-record-body .sf-ro-value')!.textContent!.trim()).toBe('row-0');
        });

        it('lists a record per row with a count and expands a card on click', () => {
            const fixture = render([rows], values);
            expect(texts(fixture, '.sf-ro-muted')).toEqual(['2 items']);
            expect(texts(fixture, '.sf-record-text')).toEqual(['North4', 'South7']);
            expect(fixture.nativeElement.querySelector('.sf-record-body')).toBeNull();
            (fixture.nativeElement.querySelectorAll('.sf-record-toggle')[1] as HTMLElement).click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.sf-record-body').length).toBe(1);
            expect(texts(fixture, '.sf-record-body .sf-ro-value')).toEqual(['South', '7']);
        });

        it('expands and collapses every card', () => {
            const fixture = render([rows], values);
            const [expand, collapse] = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sf-ro-recbar button'));
            expand.click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.sf-record-body').length).toBe(2);
            collapse.click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.sf-record-body').length).toBe(0);
        });

        it('opens the cards of an array that a field link points to', () => {
            const fixture = render([rows], values);
            fixture.componentInstance.openField('rows');
            fixture.detectChanges();
            expect(fixture.componentInstance.fields![0].openRows!.size).toBe(2);
        });

        it('pages the rows 25 at a time', () => {
            const many = { rows: Array.from({ length: 30 }, (_, index) => ({ name: `n${index}`, size: index })) };
            const fixture = render([rows], many);
            expect(fixture.nativeElement.querySelectorAll('.sf-record').length).toBe(25);
            expect(fixture.nativeElement.querySelector('app-paginator')).not.toBeNull();
        });
    });

    describe('field actions', () => {
        it('shows the formulas of a field inline', () => {
            const item = { uuid: 'f1', type: 'text', name: 'Total', value: 'a + b', relationshipItems: [] };
            const link = { tree: { get: () => [item] }, schema: 's', path: 'amount' };
            const fixture = render([field('amount', { type: 'number' })], { amount: 3 }, { formulas: { amount: link } });
            const card = fixture.nativeElement.querySelector('app-field-formulas.sf-ro-formulas') as any;
            expect(card).not.toBeNull();
            expect(card.items).toEqual([item]);
            expect(card.source).toBe(link);
        });

        it('keeps the payload of the discussion output', () => {
            const fixture = render(
                [field('amount', { type: 'number', title: 'Amount' })],
                { amount: 3 },
                { 'discussion-view': true, discussion: { amount: 2 }, 'discussion-action': true }
            );
            const events: any[] = [];
            fixture.componentInstance.discussionActionEvent.subscribe((event) => events.push(event));
            expect(texts(fixture, '.sf-ro-cm .icon-count')).toEqual(['2']);
            (fixture.nativeElement.querySelector('.sf-ro-cm') as HTMLElement).click();
            const buttons = fixture.nativeElement.querySelectorAll('.sf-ro-act');
            (buttons[buttons.length - 1] as HTMLElement).click();
            expect(events).toEqual([
                { type: 'open', field: 'amount', fieldName: 'Amount' },
                { type: 'link', field: 'amount', fieldName: 'Amount' },
            ]);
        });

        it('shows a comment button without a count when there are no comments', () => {
            const fixture = render([field('amount', { type: 'number' })], { amount: 3 }, { 'discussion-view': true, discussion: {} });
            const button = fixture.nativeElement.querySelector('.sf-ro-cm') as HTMLElement;
            expect(button.classList.contains('zero')).toBeTrue();
            expect(button.querySelector('.icon-count')).toBeNull();
        });

        it('has no comment button in a dry run', () => {
            const fixture = render([field('amount', { type: 'number' })], { amount: 3 }, { 'discussion-view': true, discussion: {}, dryRun: true });
            expect(fixture.nativeElement.querySelector('.sf-ro-cm')).toBeNull();
        });

        it('shows a failed rule under the value and a passed rule as a tick', () => {
            const rules: any = {
                a: { status: 'Failure', rules: [{ name: 'Limit', status: 'Failure' }, { name: 'Other', status: 'Success' }] },
                b: { status: 'Success', rules: [{ name: 'Range', status: 'Success' }] },
            };
            const fixture = render([field('a'), field('b')], { a: 'x', b: 'y' }, { rules });
            expect(texts(fixture, '.sf-ro-rule')).toEqual(['Rule failed: Limit']);
            expect(fixture.nativeElement.querySelectorAll('.sf-ro-ok').length).toBe(1);
            expect(fixture.componentInstance.ruleView.get('b')).toEqual({ failed: false, text: 'Range' });
        });
    });

    describe('layout', () => {
        it('gives a cell with no neighbour the whole row', () => {
            const fixture = render(
                [field('a', { isArray: true, isRef: true }), field('b', { format: 'date' }), field('c', { type: 'number' }), field('d', { isRef: true })],
                { b: '2020-01-01', c: 1 }
            );
            const component = fixture.componentInstance;
            expect(component.isLoneField(1)).toBeFalse();
            expect(component.isLoneField(2)).toBeFalse();
        });

        it('expands a single field between full rows', () => {
            const fixture = render(
                [field('a', { isArray: true }), field('b', { type: 'number' }), field('c', { isArray: true })],
                { a: ['x'], b: 1, c: ['y'] }
            );
            expect(fixture.componentInstance.isLoneField(1)).toBeTrue();
        });
    });

    describe('field metadata', () => {
        it('shows the strip only while the per-user flag is on', () => {
            const fixture = render([field('amount', { type: 'number', unit: 'kg' })], { amount: 3 });
            expect(fixture.nativeElement.querySelector('.sf-meta')).toBeNull();
            preferences.showFieldMetadata$.next(true);
            fixture.detectChanges();
            expect(texts(fixture, '.sf-meta')[0]).toContain('amount');
            expect(texts(fixture, '.sf-meta')[0]).toContain('number');
            expect(texts(fixture, '.sf-meta')[0]).toContain('unit kg');
        });

        it('offers to copy the path of a field', () => {
            const fixture = render([field('amount', { type: 'number' })], { amount: 3 });
            preferences.showFieldMetadata$.next(true);
            fixture.detectChanges();
            const copy = fixture.nativeElement.querySelector('.sf-meta sf-copy');
            expect(copy).not.toBeNull();
            expect(copy.getAttribute('tip')).toBe('Copy path');
        });

        it('shows the path of a field in a row with the row index', () => {
            const rows = field('rows', { isArray: true, isRef: true, fields: [field('name', {}, 'rows')] });
            const fixture = render([rows], { rows: [{ name: 'a' }, { name: 'b' }] });
            preferences.showFieldMetadata$.next(true);
            fixture.detectChanges();
            (fixture.nativeElement.querySelectorAll('.sf-record-toggle')[1] as HTMLElement).click();
            fixture.detectChanges();
            const strips = texts(fixture, '.sf-record-body .sf-meta-path');
            expect(strips).toEqual(['rows.1.name']);
        });
    });

    describe('sections in a calculation preview', () => {
        const sectionFields = (array: boolean) => [{
            name: 'section', fullPath: 'section', description: 'Section', type: '#Section',
            isRef: true, isArray: array,
            fields: [{ name: 'details', fullPath: 'section.details', description: 'Details', type: '#Details', isRef: true, isArray: false,
                fields: [{ name: 'amount', fullPath: 'section.details.amount', description: 'Amount', type: 'number', isRef: false, isArray: false }] }],
        }];

        const prepare = (preview: boolean, array = false) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [SchemaFormViewComponent],
                imports: [CommonModule],
                providers: [
                    { provide: IPFSService, useValue: ipfs },
                    { provide: DialogService, useValue: dialogService },
                    { provide: SchemaFormPreferencesService, useValue: preferences },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(SchemaFormViewComponent);
            const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
            fixture.componentRef.setInput('private-fields', {});
            fixture.componentRef.setInput('fields', sectionFields(array));
            fixture.componentRef.setInput('values', { section: array ? [{ details: { amount: 3 } }] : { details: { amount: 3 } } });
            fixture.componentRef.setInput('preview', preview);
            fixture.detectChanges();
            return { fixture, changes };
        };

        it('reports loading before it renders an always-open sub-schema in a Preview', fakeAsync(() => {
            const { fixture, changes } = prepare(true);
            const view = fixture.componentInstance;
            expect(changes.calls.allArgs()).toEqual([[true]]);
            expect(fixture.debugElement.queryAll(By.directive(SchemaFormViewComponent)).length).toBe(0);
            tick(16);
            expect(view.fields![0].previewReady).not.toBeTrue();
            tick(16);
            fixture.detectChanges();
            const child = fixture.debugElement.query(By.directive(SchemaFormViewComponent));
            expect(child).not.toBeNull();
            // the nested view prepares its own sub-schema, and its loading flows up
            tick(64);
            fixture.detectChanges();
            expect(fixture.debugElement.queryAll(By.directive(SchemaFormViewComponent)).length).toBe(2);
            const sent = changes.calls.allArgs().map((args) => args[0]);
            expect(sent.filter(Boolean).length).toBe(2);
            expect(sent.filter((value) => !value).length).toBe(2);
        }));

        it('renders the sub-schema at once in the ordinary view, without loading notifications or frames', fakeAsync(() => {
            const { fixture, changes } = prepare(false);
            expect(fixture.debugElement.query(By.directive(SchemaFormViewComponent))).not.toBeNull();
            expect(fixture.componentInstance.fields![0].previewReady).toBeUndefined();
            tick(64);
            expect(changes).not.toHaveBeenCalled();
        }));

        it('does not prepare the collapsed rows of an array in a Preview', fakeAsync(() => {
            const { fixture, changes } = prepare(true, true);
            tick(64);
            expect(changes).not.toHaveBeenCalled();
            expect(fixture.debugElement.query(By.directive(SchemaFormViewComponent))).toBeNull();
        }));

        for (const action of ['destroy', 'replace']) {
            it(`balances Preview loading when interrupted by ${action}`, fakeAsync(() => {
                const { fixture, changes } = prepare(true);
                if (action === 'destroy') {
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

    describe('large sections in a calculation preview', () => {
        const prepare = (preview: boolean) => {
            const fields = Array.from({ length: 25 }, (_, index) => ({
                name: `f${index}`, fullPath: `f${index}`, description: `F${index}`, type: 'number', isRef: false, isArray: false,
            }));
            const values = Object.fromEntries(fields.map((item, index) => [item.name, index + 1]));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [SchemaFormViewComponent],
                imports: [CommonModule],
                providers: [
                    { provide: IPFSService, useValue: ipfs },
                    { provide: DialogService, useValue: dialogService },
                    { provide: SchemaFormPreferencesService, useValue: preferences },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(SchemaFormViewComponent);
            const changes = spyOn(fixture.componentInstance.previewLoadingChange, 'emit');
            fixture.componentRef.setInput('private-fields', {});
            fixture.componentRef.setInput('fields', fields);
            fixture.componentRef.setInput('values', values);
            fixture.componentRef.setInput('preview', preview);
            fixture.detectChanges();
            const count = () => fixture.nativeElement.querySelectorAll('[field-id]').length;
            return { fixture, changes, count };
        };

        it('renders Preview fields in parts across frames and reports loading until the last part', fakeAsync(() => {
            const { fixture, changes, count } = prepare(true);
            expect(count()).toBe(10);
            expect(changes.calls.allArgs()).toEqual([[true]]);
            tick(16);
            expect(count()).toBe(20);
            tick(16);
            expect(count()).toBe(25);
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
            tick(64);
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
            fixture.destroy();
        }));

        it('renders every ordinary field at once without loading notifications or frames', fakeAsync(() => {
            const { changes, count } = prepare(false);
            expect(count()).toBe(25);
            tick(64);
            expect(changes).not.toHaveBeenCalled();
        }));

        it('balances Preview loading when destroyed before the last part', fakeAsync(() => {
            const { fixture, changes } = prepare(true);
            tick(16);
            fixture.destroy();
            tick(64);
            expect(changes.calls.allArgs()).toEqual([[true], [false]]);
        }));
    });

    describe('large arrays inside nested sub-schemas', () => {
        const frames = async (count: number) => {
            for (let index = 0; index < count; index++) {
                await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
            }
        };

        const prepare = (preview: boolean) => {
            const columns = Array.from({ length: 5 }, (_, index) => field(`c${index}`));
            const rows = Array.from({ length: 120 }, (_, row) => Object.fromEntries(columns.map((column) => [column.name, `${row}-${column.name}`])));
            let fields: any[] = [{ name: 'rows', description: 'Rows', type: '#Row', isArray: true, isRef: true, fullPath: 'rows', fields: columns }];
            let values: any = { rows };
            for (let depth = 0; depth < 4; depth++) {
                fields = [{ name: `s${depth}`, description: `Section ${depth}`, type: `#S${depth}`, isArray: false, isRef: true, fullPath: `s${depth}`, fields }];
                values = { [`s${depth}`]: values };
            }
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                declarations: [SchemaFormViewComponent],
                imports: [CommonModule],
                providers: [
                    { provide: IPFSService, useValue: ipfs },
                    { provide: DialogService, useValue: dialogService },
                    { provide: SchemaFormPreferencesService, useValue: preferences },
                ],
                schemas: [NO_ERRORS_SCHEMA],
            });
            const fixture = TestBed.createComponent(SchemaFormViewComponent);
            fixture.componentRef.setInput('private-fields', {});
            fixture.componentRef.setInput('values', values);
            fixture.componentRef.setInput('fields', fields);
            fixture.componentRef.setInput('preview', preview);
            return fixture;
        };

        it('opens every section of a Preview and shows the first page of cards with a balanced loading count', async () => {
            const errors: string[] = [];
            const onError = (event: ErrorEvent) => {
                errors.push(event.message);
                event.preventDefault();
            };
            window.addEventListener('error', onError);
            const fixture = prepare(true);
            const loading: boolean[] = [];
            fixture.componentInstance.previewLoadingChange.subscribe((value: boolean) => loading.push(value));
            for (let round = 0; round < 8; round++) {
                fixture.detectChanges();
                await frames(8);
            }
            window.removeEventListener('error', onError);
            expect(errors).toEqual([]);
            expect(fixture.nativeElement.querySelectorAll('.sf-record').length).toBe(25);
            expect(loading.filter(Boolean).length).toBe(loading.filter((value) => !value).length);
        });

        it('shows every section of the ordinary view, with the cards collapsed until they are expanded', () => {
            const fixture = prepare(false);
            fixture.detectChanges();
            expect(fixture.debugElement.queryAll(By.directive(SchemaFormViewComponent)).length).toBe(4);
            expect(fixture.nativeElement.querySelectorAll('.sf-record').length).toBe(25);
            expect(fixture.nativeElement.querySelectorAll('.sf-record-body').length).toBe(0);
            (fixture.nativeElement.querySelector('.sf-ro-recbar button') as HTMLElement).click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.sf-record-body').length).toBe(25);
            expect(texts(fixture, '.sf-record-body .sf-ro-value').slice(0, 2)).toEqual(['0-c0', '0-c1']);
        });
    });
});

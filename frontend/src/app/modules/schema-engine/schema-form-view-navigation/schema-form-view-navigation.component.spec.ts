import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SchemaFormViewNavigationComponent } from './schema-form-view-navigation.component';

describe('SchemaFormViewNavigationComponent Preview rendering', () => {
    const fields = [{
        name: 'section', fullPath: 'section', description: 'Section', isRef: true,
        fields: [{ name: 'nested', fullPath: 'section.nested', description: 'Nested', isRef: true, fields: [] }],
    }];
    const schemas = () => ({ report: { fields } });
    const subjects = () => [{ type: 'report', section: { nested: {} } }];

    const render = (preview: boolean) => {
        TestBed.configureTestingModule({
            declarations: [SchemaFormViewNavigationComponent],
            imports: [CommonModule],
            schemas: [NO_ERRORS_SCHEMA],
        });
        const fixture = TestBed.createComponent(SchemaFormViewNavigationComponent);
        fixture.componentRef.setInput('subjects', subjects());
        fixture.componentRef.setInput('schemaMap', schemas());
        fixture.componentRef.setInput('groupBaseTitle', 'Credential Subject');
        fixture.componentRef.setInput('preview', preview);
        fixture.detectChanges();
        tick(50);
        if (!fixture.componentInstance.isExpanded('report')) fixture.componentInstance.toggle('report');
        fixture.detectChanges();
        return fixture;
    };

    it('keeps the Preview tree and navigation DOM across repeated checks and clicks', fakeAsync(() => {
        const fixture = render(true);
        const component = fixture.componentInstance;
        const tree = component.navTree;
        const build = spyOn(component, 'buildNavTree').and.callThrough();
        const label = fixture.nativeElement.querySelector('.nav-label');
        component.toggle('report;section');
        fixture.detectChanges();
        const nestedLabel = fixture.nativeElement.querySelectorAll('.nav-label')[2];
        for (let index = 0; index < 20; index++) fixture.detectChanges();
        expect(component.navTree).toBe(tree);
        expect(component.navTree[0].children![0]).toBe(tree[0].children![0]);
        expect(fixture.nativeElement.querySelector('.nav-label')).toBe(label);
        expect(fixture.nativeElement.querySelectorAll('.nav-label')[2]).toBe(nestedLabel);
        expect(build).not.toHaveBeenCalled();
        const select = spyOn(component.selectEvent, 'emit');
        component.onSelect(tree[0].children![0]);
        expect(select).toHaveBeenCalledWith('report;section');
        expect(component.isExpanded('report')).toBeTrue();
    }));

    it('refreshes Preview navigation when a schema resolves in the same map', fakeAsync(() => {
        const fixture = render(true);
        const component = fixture.componentInstance;
        const map = component.schemaMap!;
        map.report = null;
        const empty = component.navTree;
        expect(empty[0].children).toBeUndefined();
        map.report = { fields };
        const loaded = component.navTree;
        expect(loaded).not.toBe(empty);
        expect(loaded[0].children![0].title).toBe('Section');
        expect(component.navTree).toBe(loaded);
    }));

    it('refreshes Preview navigation for another document, title and private fields', fakeAsync(() => {
        const fixture = render(true);
        const component = fixture.componentInstance;
        const tree = component.navTree;
        fixture.componentRef.setInput('subjects', [{ type: 'report' }]);
        fixture.detectChanges();
        tick(50);
        expect(component.navTree).not.toBe(tree);
        expect(component.navTree[0].children).toBeUndefined();
        fixture.componentRef.setInput('subjects', subjects());
        fixture.componentRef.setInput('groupBaseTitle', 'Result');
        fixture.componentRef.setInput('private-fields', { nested: true });
        fixture.detectChanges();
        tick(50);
        expect(component.navTree[0].title).toBe('Result');
        expect(component.navTree[0].children![0].children).toEqual([]);
    }));

    it('keeps ordinary navigation uncached even after Preview was active', fakeAsync(() => {
        const fixture = render(true);
        const component = fixture.componentInstance;
        const previewTree = component.navTree;
        component.preview = false;
        expect(component.navTree).not.toBe(previewTree);
        expect(component.navTree).not.toBe(component.navTree);
        expect(component.navTree).toEqual(previewTree);
    }));
});

import { SchemaPathInputComponent } from './schema-path-input.component';

describe('SchemaPathInputComponent', () => {
    function make(paths: string[] | null = ['emissions.total', 'emissions.baseline.total', 'title']) {
        const component = new SchemaPathInputComponent();
        component.paths = paths ? new Set(paths) : null;
        return component;
    }

    it('suggests matching paths, shortest first', () => {
        const component = make();
        component.onInput('total');
        expect(component.suggestions).toEqual(['emissions.total', 'emissions.baseline.total']);
    });

    it('limits suggestions to 10', () => {
        const component = make(Array.from({ length: 20 }, (_, i) => `field${i}`));
        component.onInput('field');
        expect(component.suggestions.length).toBe(10);
    });

    it('has no suggestions for an empty value or without known paths', () => {
        const component = make();
        component.onInput('');
        expect(component.suggestions).toEqual([]);
        const noPaths = make(null);
        noPaths.onInput('x');
        expect(noPaths.suggestions).toEqual([]);
    });

    it('emits and closes the list when a suggestion is picked', () => {
        const component = make();
        const emitted: string[] = [];
        component.valueChange.subscribe((v) => emitted.push(v));
        component.onInput('total');
        component.onSelect('emissions.total');
        expect(emitted).toEqual(['total', 'emissions.total']);
        expect(component.suggestions).toEqual([]);
    });

    it('closes the list on Escape', () => {
        const component = make();
        component.onInput('total');
        component.onKeyup({ key: 'Escape' } as KeyboardEvent);
        expect(component.suggestions).toEqual([]);
    });

    it('flags an unknown path only when paths are known', () => {
        const component = make();
        component.value = 'emissions.basline';
        expect(component.unknown).toBeTrue();
        component.value = 'title';
        expect(component.unknown).toBeFalse();
        component.value = '';
        expect(component.unknown).toBeFalse();
        expect(make(null).unknown).toBeFalse();
    });
});

import { StatisticAssessmentViewComponent } from './statistic-assessment-view.component';

describe('StatisticAssessmentViewComponent', () => {
    let component: StatisticAssessmentViewComponent;

    const build = (credentialSubject: any) => {
        component.definition = {
            config: {
                variables: [{ id: 'v1', fieldDescription: 'Var 1', schemaId: 'sch1', path: 'a.b' }],
                scores: [{
                    id: 'sc1',
                    description: 'Score 1',
                    relationships: ['v1'],
                    options: [{ description: 'Opt A' }],
                }],
                formulas: [{ id: 'f1', description: 'F', formula: 'v1', type: 'number' }],
            },
        } as any;
        component.assessment = { document: { credentialSubject } } as any;
        component.schemas = [] as any;
    };

    beforeEach(() => {
        component = new StatisticAssessmentViewComponent(
            {} as any, {} as any, {} as any, {} as any, { queryParams: { subscribe: jasmine.createSpy() } } as any
        );
    });

    describe('updateMetadata credentialSubject handling', () => {
        it('reads the values from a plain credentialSubject object', () => {
            build({ v1: 10, sc1: 5, f1: 99 });

            (component as any).updateMetadata();

            expect(component.preview[0].value).toBe(10);
            expect(component.scores[0].value).toBe(5);
            expect(component.formulas[0].value).toBe(99);
        });

        it('unwraps a credentialSubject delivered as an array', () => {
            build([{ v1: 10, sc1: 5, f1: 99 }]);

            (component as any).updateMetadata();

            expect(component.preview[0].value).toBe(10);
            expect(component.scores[0].value).toBe(5);
            expect(component.formulas[0].value).toBe(99);
        });

        it('falls back to an empty document when there is no assessment', () => {
            build(undefined);

            expect(() => (component as any).updateMetadata()).not.toThrow();
            expect(component.preview[0].value).toBeUndefined();
        });
    });
});

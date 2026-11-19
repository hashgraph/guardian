import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyLabelDocumentViewComponent } from './policy-label-document-view.component';

const item = (id: string, status?: boolean): any => ({ id, status });
const step = (validator: any, type: string, name: string, config: any = [], prefix = '1.1', title = 'Rule'): any =>
    ({ item: validator, type, name, prefix, title, config });

describe('PolicyLabelDocumentViewComponent', () => {
    let fixture: ComponentFixture<PolicyLabelDocumentViewComponent>;
    let component: PolicyLabelDocumentViewComponent;
    const all = (selector: string) => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector));

    const load = (steps: any[], labelStatus?: boolean) => {
        component.definition = { name: 'My label' };
        component.steps = steps;
        (component as any).validator = { status: labelStatus };
        (component as any).updateChecks();
        component.loading = false;
        fixture.detectChanges();
    };

    const passed = item('passed', true);
    const failed = item('failed', false);
    const pending = item('pending');
    const steps = () => [
        step(item('group', true), 'validate', 'Group', null, '1', 'Group'),
        step(passed, 'variables', 'Overview', [{ fieldDescription: 'Area', value: 12 }], '1.1', 'Area rule'),
        step(passed, 'scores', 'Scores', [{
            id: 's', description: 'Pick one', value: 2, _relationships: [],
            _options: [{ id: 'o1', value: 1, description: 'Low' }, { id: 'o2', value: 2, description: 'High' }]
        }], '1.1', 'Area rule'),
        step(passed, 'validate', 'Area rule', null, '1.1', 'Area rule'),
        step(failed, 'formulas', 'Statistics', [{ description: 'Total', value: 5 }], '1.2', 'Total rule'),
        step(failed, 'validate', 'Total rule', null, '1.2', 'Total rule'),
        step(pending, 'variables', 'Overview', [{ fieldDescription: 'Tags', isArray: true, value: ['a', undefined] }], '1.3', 'Tags rule')
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [PolicyLabelDocumentViewComponent],
            providers: [
                { provide: ProfileService, useValue: { getProfile: () => of({ confirmed: false }) } },
                { provide: PolicyLabelsService, useValue: {} },
                { provide: DialogService, useValue: {} },
                { provide: Router, useValue: { navigate: () => undefined } },
                { provide: ActivatedRoute, useValue: { queryParams: of({}), snapshot: { params: {} } } }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
        fixture = TestBed.createComponent(PolicyLabelDocumentViewComponent);
        component = fixture.componentInstance;
    });

    it('opens on the Overview with a tile per status and a card per check', () => {
        load(steps());
        expect(component.screen).toBe('overview');
        expect(component.overviewTiles.map((tile) => `${tile.label}:${tile.value}`)).toEqual(['Passed:1', 'Failed:1', 'Not evaluated:1']);
        expect(component.overviewCards.map((card) => card.title)).toEqual(['Area rule', 'Total rule', 'Tags rule']);
        expect(component.overviewCards[0].meta).toBe('Overview · Scores');
        expect(component.overviewCards.map((card) => card.pill?.text)).toEqual(['Passed', 'Failed', 'Not evaluated']);
        expect(component.firstCheckLink).toBe('1.1 Area rule');
    });

    it('does not count the group node as a check', () => {
        load(steps());
        expect(component.checks.length).toBe(3);
    });

    it('shows the result of the label and of each group on the Overview', () => {
        load(steps(), true);
        expect(fixture.nativeElement.querySelector('.sf-lv-label-status').textContent).toContain('Label: Passed');
        const groups = all('.sf-lv-group');
        expect(groups.length).toBe(1);
        expect(groups[0].textContent).toContain('Group');
        expect(groups[0].textContent).toContain('Passed');
    });

    it('shows a failed label even when one check of a "one of" group passed', () => {
        load(steps(), false);
        expect(component.labelStatus).toBe('bad');
        expect(fixture.nativeElement.querySelector('.sf-lv-label-status').textContent).toContain('Label: Failed');
    });

    it('opens a check page with its parts as the rail cards', () => {
        load(steps());
        component.openCheck(0);
        fixture.detectChanges();
        expect(component.screen).toBe('section');
        expect(component.railCards.map((card) => card.title)).toEqual(['Overview', 'Scores']);
        expect(all('.sf-lv-part-head').map((el) => el.textContent!.trim())).toEqual(['Overview', 'Scores']);
        const chosen = all('.sf-lv-option-on');
        expect(chosen.length).toBe(1);
        expect(chosen[0].textContent).toContain('High');
        expect(chosen[0].textContent).toContain('Selected');
        expect(all('.sf-lv-option').length).toBe(2);
        expect(all('p-radiobutton, p-radioButton').length).toBe(0);
    });

    it('shows N/A for a missing value and chips for an array', () => {
        load(steps());
        component.openCheck(2);
        fixture.detectChanges();
        expect(all('.sf-ro-chips .sf-ro-chip').map((el) => el.textContent!.trim())).toEqual(['a', 'N/A']);
    });

    it('goes back to the Overview and between checks with Previous and Next', () => {
        load(steps());
        component.onNavSelect(1);
        expect(component.activeIndex).toBe(1);
        component.onNavSelect('overview');
        expect(component.screen).toBe('overview');
        expect(component.railCards).toEqual([]);
        component.openCheck(0);
        fixture.detectChanges();
        const links = all('.sf-section-link').map((el) => el.textContent!.trim());
        expect(links).toEqual(['Overview', 'Total rule']);
    });

    it('shows a message when there are no checks', () => {
        load([step(item('group'), 'validate', 'Group', null, '1', 'Group')]);
        expect(all('.sf-lv-empty').length).toBe(1);
    });
});

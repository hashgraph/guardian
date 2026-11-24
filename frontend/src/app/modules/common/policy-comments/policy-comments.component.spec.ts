import { Component, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Schema, SchemaDataTypes } from '@guardian/interfaces';
import { of, Subject } from 'rxjs';
import { CommentsService } from 'src/app/services/comments.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TextInputAutocompleteContainerComponent } from '../angular-text-input-autocomplete/text-input-autocomplete-container.component';
import { TextInputAutocompleteDirective } from '../angular-text-input-autocomplete/text-input-autocomplete.directive';
import { TextInputAutocompleteMenuComponent } from '../angular-text-input-autocomplete/text-input-autocomplete-menu.component';
import { PolicyComments } from './policy-comments.component';

/** Stands in for p-multiSelect, which only has to be a form control here. */
@Component({
    selector: 'p-multiSelect',
    template: '',
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiSelectStub), multi: true }],
    standalone: false
})
class MultiSelectStub implements ControlValueAccessor {
    writeValue(): void { }
    registerOnChange(): void { }
    registerOnTouched(): void { }
}

const ME = 'did:me';
const DEMO = 'did:demo';
const DOCUMENT = 'doc-1';
/** A stored field is the schema iri and the path of the field in it. */
const PROPONENT = '#details&1.0.0/projectProponentDetails';

const schemaDocument: any = {
    $id: '#details&1.0.0',
    $comment: JSON.stringify({ '@id': 'ctx:#details&1.0.0', term: 'details&1.0.0' }),
    type: SchemaDataTypes.object,
    properties: {
        projectProponentDetails: {
            type: SchemaDataTypes.string,
            title: 'projectProponentDetails',
            description: 'Project proponent details'
        }
    }
};

const discussion = (extra: any) => ({
    targetId: DOCUMENT,
    historyIds: [],
    policyId: 'p1',
    documentId: DOCUMENT,
    count: 0,
    ...extra
});

const discussions = () => [
    discussion({
        id: 'd1', name: 'Findings #1', owner: DEMO, privacy: 'users', users: [DEMO, ME],
        field: PROPONENT, fieldName: 'projectProponentDetails', count: 4
    }),
    discussion({
        id: 'd2', name: 'Legacy', owner: ME, privacy: 'public',
        field: '#other&1.0.0/legacyField', fieldName: 'Legacy label'
    }),
    discussion({ id: 'd3', name: 'Roles only', owner: DEMO, privacy: 'roles', roles: ['VVB'] }),
    discussion({ id: 'd4', name: 'No field', owner: DEMO, privacy: 'public' }),
];

const messages = (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    sender: i % 2 ? DEMO : ME,
    senderName: i % 2 ? 'Demo' : 'Demo_User',
    isOwner: i % 2 === 0,
    timestamp: new Date(2026, 10, 24, 9, 10 + i).toISOString(),
    policyId: 'p1',
    targetId: DOCUMENT,
    discussionId: 'd1',
    document: { credentialSubject: [{ text: `Message ${i}` }] }
}));

describe('PolicyComments', () => {
    let fixture: ComponentFixture<PolicyComments>;
    let component: PolicyComments;
    let service: any;

    const setup = (inputs: Record<string, unknown> = {}, list: any[] = discussions()) => {
        service = {
            getUsers: vi.fn().mockReturnValue(of([
                { label: 'Demo', value: DEMO, type: 'user' },
                { label: 'Demo_User', value: ME, type: 'user' },
                { label: 'VVB', value: 'VVB', type: 'role' },
            ])),
            getRelationships: vi.fn().mockReturnValue(of([])),
            getSchemas: vi.fn().mockReturnValue(of([{ iri: '#details&1.0.0', document: schemaDocument }])),
            getDiscussions: vi.fn().mockReturnValue(of(list)),
            getLastReads: vi.fn().mockReturnValue(of([])),
            setLastRead: vi.fn().mockReturnValue(of({})),
            getPolicyComments: vi.fn().mockReturnValue(of(messages(3))),
            parsePage: vi.fn().mockImplementation((page: any[]) => ({ page, count: page.length })),
            createComment: vi.fn().mockReturnValue(new Subject()),
            createDiscussion: vi.fn().mockReturnValue(new Subject()),
            downloadKey: vi.fn().mockReturnValue(of(new ArrayBuffer(0))),
        };
        TestBed.configureTestingModule({
            declarations: [
                PolicyComments,
                MultiSelectStub,
                TextInputAutocompleteDirective,
                TextInputAutocompleteContainerComponent,
                TextInputAutocompleteMenuComponent,
            ],
            imports: [FormsModule, ReactiveFormsModule],
            providers: [
                { provide: ProfileService, useValue: { getProfile: vi.fn().mockReturnValue(of({ did: ME })) } },
                { provide: CommentsService, useValue: service },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(PolicyComments);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('policy-id', 'p1');
        fixture.componentRef.setInput('document-id', DOCUMENT);
        fixture.componentRef.setInput('collapse', false);
        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }
        fixture.detectChanges();
        return fixture;
    };

    const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
    const all = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));
    const text = (selector: string) => el(selector)?.textContent?.trim();
    const click = (selector: string) => {
        (el(selector) as HTMLElement).click();
        fixture.detectChanges();
    };
    const openThread = (id = 'd1') => {
        component.onOpen(component.discussions.find((d) => d.id === id));
        fixture.detectChanges();
    };
    const type = (value: string) => {
        const textarea = el('textarea') as HTMLTextAreaElement;
        textarea.value = value;
        textarea.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };
    const press = (init: KeyboardEventInit, target: HTMLElement = el('textarea')!) => {
        const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
        target.dispatchEvent(event);
        fixture.detectChanges();
        return event;
    };
    const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

    afterEach(() => {
        fixture?.destroy();
        TestBed.resetTestingModule();
    });

    describe('field label', () => {
        it('shows the form label first and the key second in a list row', () => {
            setup();
            const row = all('.disc-row')[0];
            expect(row.querySelector('.row-field-label')?.textContent?.trim()).toBe('Project proponent details');
            expect(row.querySelector('.row-field-key')?.textContent?.trim()).toBe('projectProponentDetails');
        });

        it('falls back to the stored name when the schemas do not know the field', () => {
            setup();
            const row = all('.disc-row').find((r) => r.textContent?.includes('Legacy'))!;
            expect(row.querySelector('.row-field-label')?.textContent?.trim()).toBe('Legacy label');
            expect(row.querySelector('.row-field-key')?.textContent?.trim()).toBe('legacyField');
        });

        it('shows the same pair in the thread field bar', () => {
            setup();
            openThread();
            expect(text('.field-bar-label')).toBe('Project proponent details');
            expect(text('.field-bar-key')).toBe('projectProponentDetails');
        });

        it('links to the field when the bar is clicked', () => {
            setup();
            const linked: any[] = [];
            component.linkEvent.subscribe((field) => linked.push(field));
            openThread();
            click('.field-bar');
            expect(linked).toEqual([PROPONENT]);
        });
    });

    describe('list', () => {
        it('shows no group headers when there is a single group', () => {
            setup();
            expect(all('.disc-group-header').length).toBe(0);
        });

        it('shows every row, not hidden', () => {
            setup();
            const rows = all('.disc-row');
            expect(rows.length).toBe(4);
            expect(rows.some((row) => row.hasAttribute('hidden'))).toBe(false);
        });

        it('hides the rows of a collapsed group', () => {
            setup();
            component.onOpenGroup(component.discussionGroups[0]);
            fixture.detectChanges();
            expect(all('.disc-row').every((row) => row.hasAttribute('hidden'))).toBe(true);
        });

        it('has no footer button for a new discussion', () => {
            setup();
            expect(el('.toolbar')).toBeNull();
        });

        it('opens the create form from the header', () => {
            setup();
            click('.list-new');
            expect(component.currentTab).toBe('new-discussion');
        });

        it('says there are no discussions yet and offers to start one', () => {
            setup({}, []);
            expect(text('.empty-title')).toBe('No discussions yet');
            expect(el('.empty-new')).not.toBeNull();
        });
    });

    describe('create form', () => {
        const openForm = () => {
            setup();
            component.onNewDiscussion();
            fixture.detectChanges();
        };

        it('describes the three ways to share a discussion', () => {
            openForm();
            const options = all('.privacy-option');
            expect(options.map((o) => o.querySelector('.privacy-option-title')?.textContent?.trim()))
                .toEqual(['Everyone', 'Selected roles', 'Selected people']);
            for (const option of options) {
                expect(option.querySelector('.privacy-option-desc')?.textContent?.trim().length).toBeGreaterThan(10);
            }
        });

        it('submits the stored privacy value and shows the people picker', () => {
            openForm();
            expect(el('.privacy-picker')).toBeNull();
            (all('.privacy-option')[2] as HTMLElement).click();
            fixture.detectChanges();
            expect(el('.privacy-picker')).not.toBeNull();
            component.discussionForm.patchValue({ name: 'Findings', users: [DEMO] });
            fixture.detectChanges();
            click('.create-submit');
            expect(service.createDiscussion).toHaveBeenCalledTimes(1);
            expect(service.createDiscussion.mock.calls[0][2].privacy).toBe('users');
        });

        it('keeps Create disabled until the form is valid', () => {
            openForm();
            expect((el('.create-submit') as HTMLButtonElement).disabled).toBe(true);
            component.discussionForm.patchValue({ name: 'Findings' });
            fixture.detectChanges();
            expect((el('.create-submit') as HTMLButtonElement).disabled).toBe(false);
        });
    });

    describe('thread header and participants', () => {
        it('reads Everyone, N participants and N roles by privacy', () => {
            setup();
            const subtitle = (id: string) => {
                openThread(id);
                return text('.thread-sub');
            };
            expect(subtitle('d2')).toBe('Everyone');
            expect(subtitle('d1')).toBe('2 participants');
            expect(subtitle('d3')).toBe('1 role');
        });

        it('tags the creator and you in the participants sheet', () => {
            setup();
            openThread('d1');
            click('.thread-identity');
            const people = all('.participant');
            const tags = (name: string) => Array.from(
                people.find((p) => p.textContent?.includes(name))!.querySelectorAll('.participant-tag')
            ).map((t) => t.textContent?.trim());
            expect(tags('Demo_User')).toEqual(['You']);
            expect(tags('Demo')).toContain('Creator');
        });

        it('goes back to the list', () => {
            setup();
            openThread();
            click('.thread-back');
            expect(component.currentTab).toBe('discussions');
        });

        it('collapses from the header', () => {
            setup();
            const events: boolean[] = [];
            component.collapseEvent.subscribe((value) => events.push(value));
            openThread();
            click('.collapse-btn');
            expect(events).toEqual([false, true]);
        });

        it('holds only search and collapse in the tools', () => {
            setup({ key: true });
            openThread();
            expect(all('.thread-tools button').length).toBe(2);
            expect(el('.thread-key')).toBeNull();
        });

        it('offers the discussion key in the participants sheet', () => {
            setup({ key: true });
            openThread();
            click('.thread-identity');
            expect(text('.sheet-key')).toContain('Download discussion key');
        });

        it('keeps the document key in the list header only when key is on', () => {
            setup({ key: true });
            expect(el('.list-key')).not.toBeNull();
            fixture.destroy();
            TestBed.resetTestingModule();
            setup({ key: false });
            expect(el('.list-key')).toBeNull();
        });
    });

    describe('composer', () => {
        it('sends on Enter once, even when pressed twice quickly', async () => {
            setup();
            openThread();
            type('hello');
            await settle();
            press({ key: 'Enter' });
            press({ key: 'Enter' });
            expect(service.createComment).toHaveBeenCalledTimes(1);
        });

        it('starts a new line on Shift+Enter', async () => {
            setup();
            openThread();
            type('hello');
            await settle();
            const event = press({ key: 'Enter', shiftKey: true });
            expect(service.createComment).not.toHaveBeenCalled();
            expect(event.defaultPrevented).toBe(false);
        });

        it('does not send on Enter while the autocomplete menu is open', async () => {
            setup();
            openThread();
            type('hello @');
            await settle();
            (el('textarea') as HTMLElement).dispatchEvent(new KeyboardEvent('keypress', { key: '@', bubbles: true }));
            fixture.detectChanges();
            press({ key: 'Enter' });
            expect(service.createComment).not.toHaveBeenCalled();
        });

        it('does not send an empty message', () => {
            setup();
            openThread();
            press({ key: 'Enter' });
            expect(service.createComment).not.toHaveBeenCalled();
        });

        it('shows the counter from 1600 characters and marks the limit at 2000', () => {
            setup();
            openThread();
            type('a'.repeat(1599));
            expect(el('.composer-counter')).toBeNull();
            type('a'.repeat(1600));
            expect(text('.composer-counter')).toBe('1600/2000');
            expect(el('.composer-counter')!.classList.contains('limit')).toBe(false);
            type('a'.repeat(2000));
            expect(el('.composer-counter')!.classList.contains('limit')).toBe(true);
        });
    });

    describe('messages', () => {
        it('puts a day separator before the first message of each day only', () => {
            setup();
            openThread();
            expect(all('.day-separator').length).toBe(1);
        });

        it('shows the sender once for a run of messages from the same person', () => {
            const same = messages(3).map((m) => ({ ...m, sender: DEMO, senderName: 'Demo', isOwner: false }));
            setup();
            service.getPolicyComments.mockReturnValue(of(same));
            openThread();
            expect(all('.message-name').length).toBe(1);
        });
    });

    describe('read-only', () => {
        it('hides every way to start a discussion and replaces the composer with a note', () => {
            setup({ readonly: true });
            expect(el('.list-new')).toBeNull();
            expect(el('.empty-new')).toBeNull();
            openThread();
            expect(el('textarea')).toBeNull();
            expect(text('.readonly-note')).toContain('read-only');
            click('.collapse-btn');
            expect(el('.rail-new')).toBeNull();
        });
    });

    describe('collapsed rail', () => {
        it('shows one avatar per discussion and a new button', () => {
            setup({ collapse: true });
            expect(all('.rail-avatar').length).toBe(4);
            expect(el('.rail-new')).not.toBeNull();
        });

        it('opens a discussion from its avatar', () => {
            setup({ collapse: true });
            (all('.rail-avatar')[0] as HTMLElement).click();
            fixture.detectChanges();
            expect(component.currentTab).toBe('messages');
            expect(component.currentDiscussion?.id).toBe('d1');
        });
    });

    // Schema is only used to prove the fixture above is a valid schema document.
    it('builds the fixture schema', () => {
        const schema = new Schema({ iri: '#details&1.0.0', document: schemaDocument } as any);
        expect(schema.fields?.[0]?.description).toBe('Project proponent details');
    });
});

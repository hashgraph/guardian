import type { Mock } from 'vitest';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DialogService } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ContractService } from 'src/app/services/contract.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MessagesReportBlockComponent } from './messages-report-block.component';

describe('MessagesReportBlockComponent document availability', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function readMessages(message: any): any[] {
        const component: any = Object.create(MessagesReportBlockComponent.prototype);
        component.datePipe = new DatePipe('en-US');
        component.contractService = { getContracts: () => of({ body: [] }) };
        component.analyticsService = { checkIndexer: () => of(false) };
        component.static = {
            status: 'FINISHED', report: { schemas: [], users: [], roles: [], tokens: [], topics: [{
                topicId: '0.0.20', message: { type: 'Topic', messageType: 'INSTANCE_POLICY_TOPIC' },
                children: [], messages: [{ id: '1794.414951554', order: 0, issuer: 'did:example:issuer',
                    topicId: '0.0.20', relationships: [], ...message }]
            }] }
        };
        component.ngOnInit();
        return component.messages;
    }

    it('renders an encrypted dry-run placeholder as a document card with its sender', () => {
        const [message] = readMessages({ type: 'EVC-Document', document: null, documentUnavailable: true });
        expect(message.__ifVCMessage).toBe(true);
        expect(message.__issuer).toBe('did:example:issuer');
        expect(message.document).toBeNull();
        expect(message.__schema).toBeNull();
    });

    it('keeps the sender of a historical VC whose body is unavailable', () => {
        const [message] = readMessages({ type: 'VC-Document', document: null, documentUnavailable: true });
        expect(message.__ifVCMessage).toBe(true);
        expect(message.__issuer).toBe('did:example:issuer');
    });

    it('keeps the existing encrypted-message visibility when no placeholder flag is present', () => {
        const [message] = readMessages({ type: 'EVC-Document', document: null });
        expect(message.__ifVCMessage).toBe(false);
    });
});

@Component({ selector: 'switch-button', template: '', standalone: false })
class SwitchButtonStub {
    @Input('on-label') on!: string;
    @Input('off-label') off!: string;
    @Input('value') value!: boolean;
    @Output('valueChange') valueChange = new EventEmitter<boolean>();
}

describe('MessagesReportBlockComponent document cards', () => {
    let fixture: ComponentFixture<MessagesReportBlockComponent>;
    let openDialog: Mock;

    beforeEach(async () => {
        openDialog = vi.fn().mockReturnValue({ onClose: of(null) });
        await TestBed.configureTestingModule({
            imports: [CommonModule, ReactiveFormsModule],
            declarations: [MessagesReportBlockComponent, SwitchButtonStub],
            providers: [
                DatePipe,
                UntypedFormBuilder,
                { provide: PolicyEngineService, useValue: {} },
                { provide: WebSocketService, useValue: {} },
                { provide: PolicyHelper, useValue: {} },
                { provide: DialogService, useValue: { open: openDialog } },
                { provide: ContractService, useValue: { getContracts: () => of({ body: [] }) } },
                { provide: AnalyticsService, useValue: { checkIndexer: () => of(false) } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
        vi.useFakeTimers();
        fixture = TestBed.createComponent(MessagesReportBlockComponent);
    });

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
    });

    function render(messages: any[], schemas: any[] = []): void {
        fixture.componentInstance.static = {
            status: 'FINISHED', target: messages[0].id,
            report: {
                schemas, users: [], roles: [], tokens: [], topics: [{
                    topicId: '0.0.20',
                    message: { type: 'Topic', messageType: 'INSTANCE_POLICY_TOPIC',
                        name: 'Policy instance', owner: 'did:example:registry' },
                    children: [], messages,
                }],
            },
        };
        fixture.detectChanges();
    }

    function message(id: string, extra: any = {}): any {
        return {
            id, order: 0, type: 'VC-Document', topicId: '0.0.20',
            issuer: 'did:example:issuer', relationships: [], ...extra,
        };
    }

    function selectCard(id: string): void {
        const card = fixture.debugElement.query(By.css(`[id="${id}"]`));
        expect(card).not.toBeNull();
        card.nativeElement.click();
        fixture.detectChanges();
    }

    function documentLinks() {
        return fixture.debugElement.queryAll(By.css('.field-link'))
            .filter((link) => link.nativeElement.textContent.trim() === 'Open document');
    }

    it('shows historical metadata without an opening action and opens the latest body', () => {
        const oldId = '1794.414951554';
        const latestId = '1794.433034035';
        const latestBody = {
            '@context': ['schema:project'], issuer: 'did:example:issuer',
            credentialSubject: [{ type: 'Project', name: 'Latest project description' }],
        };
        const schema = { contextUrl: 'schema:project', name: 'Project Description',
            document: { type: 'object' } };
        render([
            message(oldId, { document: null, documentUnavailable: true }),
            message(latestId, { order: 1, document: latestBody }),
        ], [schema]);

        const oldCard = fixture.debugElement.query(By.css(`[id="${oldId}"]`));
        expect(oldCard.nativeElement.textContent).toContain('did:example:issuer');
        selectCard(oldId);
        expect(documentLinks().length).toBe(0);
        expect(openDialog).not.toHaveBeenCalled();

        selectCard(latestId);
        const links = documentLinks();
        expect(links.length).toBe(1);
        links[0].nativeElement.click();
        expect(openDialog).toHaveBeenCalledTimes(1);
        expect(openDialog.mock.lastCall![1].data.document).toEqual(latestBody);
        expect(openDialog.mock.lastCall![1].data.schema).toEqual(schema);
    });

    it('renders an encrypted placeholder with its sender and no opening action', () => {
        const id = '1794.414951554';
        render([message(id, { type: 'EVC-Document', document: null, documentUnavailable: true })]);

        const card = fixture.debugElement.query(By.css(`[id="${id}"]`));
        expect(card.nativeElement.textContent).toContain('did:example:issuer');
        expect(card.query(By.css('.message-header'))).not.toBeNull();
        selectCard(id);
        expect(documentLinks().length).toBe(0);
        expect(openDialog).not.toHaveBeenCalled();
    });
});

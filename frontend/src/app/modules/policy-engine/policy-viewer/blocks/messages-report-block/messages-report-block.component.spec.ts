import type { Mock } from 'vitest';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DialogService } from 'primeng/dynamicdialog';
import moment from 'moment';
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

describe('MessagesReportBlockComponent document cards', () => {
    let fixture: ComponentFixture<MessagesReportBlockComponent>;
    let openDialog: Mock;

    beforeEach(async () => {
        openDialog = vi.fn().mockReturnValue({ onClose: of(null) });
        await TestBed.configureTestingModule({
            imports: [CommonModule, ReactiveFormsModule],
            declarations: [MessagesReportBlockComponent],
            providers: [
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

describe('MessagesReportBlockComponent trust chain view', () => {
    let fixture: ComponentFixture<MessagesReportBlockComponent>;
    let contractService: { getContracts: Mock; getRetireVCsFromIndexer: Mock };
    let analyticsService: { checkIndexer: Mock };

    const TOKEN_ID = '0.0.5001';
    const mintSchema = { contextUrl: 'schema:mint', name: 'MintToken', document: {} };
    const projectSchema = { contextUrl: 'schema:project', name: 'Project Description', document: {} };

    beforeEach(async () => {
        contractService = {
            getContracts: vi.fn().mockReturnValue(of({ body: [] })),
            getRetireVCsFromIndexer: vi.fn().mockReturnValue(of({ body: [] })),
        };
        analyticsService = { checkIndexer: vi.fn().mockReturnValue(of(false)) };
        await TestBed.configureTestingModule({
            imports: [CommonModule, ReactiveFormsModule],
            declarations: [MessagesReportBlockComponent],
            providers: [
                UntypedFormBuilder,
                { provide: PolicyEngineService, useValue: {} },
                { provide: WebSocketService, useValue: {} },
                { provide: PolicyHelper, useValue: {} },
                { provide: DialogService, useValue: { open: vi.fn() } },
                { provide: ContractService, useValue: contractService },
                { provide: AnalyticsService, useValue: analyticsService },
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

    function message(id: string, extra: any = {}): any {
        return {
            id, order: 0, type: 'VC-Document', topicId: '0.0.20',
            issuer: 'did:example:issuer', relationships: [], ...extra,
        };
    }

    function vc(contextUrl: string, subject: any = {}): any {
        return { '@context': [contextUrl], issuer: 'did:example:issuer', credentialSubject: [subject] };
    }

    function render(messages: any[], options: { children?: any[]; schemas?: any[] } = {}): void {
        fixture.componentInstance.static = {
            status: 'FINISHED', target: messages[0].id,
            report: {
                schemas: options.schemas || [projectSchema, mintSchema], users: [], roles: [],
                tokens: [{ tokenId: TOKEN_ID, name: 'Carbon', symbol: 'CRB' }],
                topics: [{
                    topicId: '0.0.20',
                    message: { type: 'Topic', messageType: 'INSTANCE_POLICY_TOPIC',
                        name: 'Policy instance', owner: 'did:example:registry' },
                    children: options.children || [], messages,
                }],
            },
        };
        fixture.detectChanges();
    }

    function axisTimes(): string[] {
        return fixture.debugElement.queryAll(By.css('.tc-axis .tick b'))
            .map((tick) => tick.nativeElement.textContent.trim());
    }

    function card(id: string) {
        return fixture.debugElement.query(By.css(`[id="${id}"]`));
    }

    describe('time axis', () => {
        it('shows a dash for an id whose time is not a real consensus time', () => {
            render([message('1795.454658047')]);
            expect(axisTimes()).toEqual(['–']);
        });

        it('shows a 24-hour time for a real consensus id', () => {
            render([message('1795454658.047000000')]);
            const [time] = axisTimes();
            expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
            expect(time).toBe(moment(1795454658047).format('HH:mm:ss'));
        });

        it('shows an afternoon retirement on a 24-hour clock', () => {
            const issuanceDate = new Date(2026, 10, 23, 15, 30, 45).toISOString();
            contractService.getContracts.mockReturnValue(of({
                body: [{ topicId: '0.0.700', wipeTokenIds: [TOKEN_ID] }]
            }));
            analyticsService.checkIndexer.mockReturnValue(of(true));
            contractService.getRetireVCsFromIndexer.mockReturnValue(of({
                body: [{
                    consensusTimestamp: '1795542344.000000010',
                    documents: [{
                        issuanceDate,
                        credentialSubject: [{ contractId: '0.0.700', user: '0.0.9', tokens: [{ tokenId: TOKEN_ID, count: 1 }] }],
                    }],
                }]
            }));

            render([message('1795454658.047000000', {
                document: vc('schema:mint', { tokenId: TOKEN_ID, amount: '5' }),
            })]);

            expect(axisTimes()).toContain('15:30:45');
        });
    });

    describe('document cards', () => {
        it('titles a revoked document with its schema and tags the status', () => {
            const id = '1795454658.047000000';
            render([message(id, { documentStatus: 'REVOKE', document: vc('schema:project') })]);

            const element = card(id).nativeElement as HTMLElement;
            expect(element.querySelector('.message-header')!.textContent!.trim()).toBe('Project Description');
            expect(element.querySelector('.p-tag')!.textContent!.trim()).toBe('Revoked');
        });

        it('shows no status tag for a regular document', () => {
            const id = '1795454658.047000000';
            render([message(id, { documentStatus: 'ISSUE', document: vc('schema:project') })]);
            expect(card(id).nativeElement.querySelector('.p-tag')).toBeNull();
        });
    });

    describe('dashboard type', () => {
        const child = (): any => ({
            topicId: '0.0.30', message: { type: 'Topic', messageType: 'DYNAMIC_TOPIC', name: 'Project' },
            children: [], messages: [message('1795454659.000000000', { order: 1, topicId: '0.0.30' })],
        });

        it('renders one catalog row per topic in the advanced view and one in the simplified view', () => {
            render([message('1795454658.047000000')], { children: [child()] });
            const topicCards = () => fixture.debugElement.queryAll(By.css('.topic-info')).length;

            expect(topicCards()).toBe(1);
            fixture.componentInstance.onDashboardType('Advanced' as any);
            fixture.detectChanges();
            expect(topicCards()).toBe(2);
            fixture.componentInstance.onDashboardType('Simplified' as any);
            fixture.detectChanges();
            expect(topicCards()).toBe(1);
        });
    });

    describe('selection', () => {
        it('dims the events that are not related to the selected one', () => {
            const a = '1795454658.000000001';
            const b = '1795454659.000000002';
            const c = '1795454660.000000003';
            render([
                message(a),
                message(b, { order: 1, relationships: [a] }),
                message(c, { order: 2 }),
            ]);

            expect(card(a).classes['dim']).toBeFalsy();
            card(a).nativeElement.click();
            fixture.detectChanges();

            expect(card(a).classes['dim']).toBeFalsy();
            expect(card(b).classes['dim']).toBeFalsy();
            expect(card(c).classes['dim']).toBe(true);
        });
    });
});

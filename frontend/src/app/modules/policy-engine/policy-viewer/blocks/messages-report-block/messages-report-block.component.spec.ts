import { DatePipe } from '@angular/common';
import { of } from 'rxjs';
import { MessagesReportBlockComponent } from './messages-report-block.component';

describe('MessagesReportBlockComponent document availability', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

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
        expect(message.__ifVCMessage).toBeTrue();
        expect(message.__issuer).toBe('did:example:issuer');
        expect(message.document).toBeNull();
        expect(message.__schema).toBeNull();
    });

    it('keeps the sender of a historical VC whose body is unavailable', () => {
        const [message] = readMessages({ type: 'VC-Document', document: null, documentUnavailable: true });
        expect(message.__ifVCMessage).toBeTrue();
        expect(message.__issuer).toBe('did:example:issuer');
    });

    it('keeps the existing encrypted-message visibility when no placeholder flag is present', () => {
        const [message] = readMessages({ type: 'EVC-Document', document: null });
        expect(message.__ifVCMessage).toBeFalse();
    });
});

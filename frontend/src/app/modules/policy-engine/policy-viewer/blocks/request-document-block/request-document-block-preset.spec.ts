import { describe, expect, it } from 'vitest';
import { RequestDocumentBlockComponent } from './request-document-block.component';

const field = (name: string, over: any = {}) => ({ name, isRef: false, isArray: false, fields: null, ...over });

// Builds the component without Angular: getJson only reads `user` and `schema`
function create() {
    const component: any = Object.create(RequestDocumentBlockComponent.prototype);
    component.user = { username: 'alice', hederaAccountId: '0.0.7' };
    component.schema = {
        fields: [
            field('title'),
            field('applicant', { isRef: true, fields: [field('name'), field('account')] }),
            field('locs', { isRef: true, isArray: true, fields: [field('name')] })
        ]
    };
    return component;
}
const row = (subject: any) => ({ document: { credentialSubject: [subject] } });

describe('RequestDocumentBlockComponent.getJson', () => {
    it('keeps plain mappings as they were', () => {
        const json = create().getJson(row({ a: 'x' }), [
            { name: 'title', value: 'a' },
            { name: 'owner', value: 'username' },
            { name: 'acc', value: 'hederaAccountId' }
        ]);
        expect(json).toEqual({ title: 'x', owner: 'alice', acc: '0.0.7' });
    });

    it('fills nested array targets from the preset document', () => {
        const json = create().getJson(row({ places: [{ t: 'A' }, { t: 'B' }] }), [
            { name: 'locs.name', value: 'places.t', nameLevel: 1, valueLevel: 1 }
        ]);
        expect(json).toEqual({ locs: [{ name: 'A' }, { name: 'B' }] });
    });

    it('does not fill an incompatible mapping', () => {
        const json = create().getJson(row({ places: [{ t: 'A' }] }), [
            { name: 'applicant.name', value: 'places.t', nameLevel: 0, valueLevel: 1 }
        ]);
        expect(json).toEqual({});
    });
});

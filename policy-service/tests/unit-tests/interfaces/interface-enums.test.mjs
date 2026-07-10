import { assert } from 'chai';
import { PolicyInputEventType, PolicyOutputEventType, EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { BlockCacheType } from '../../../dist/policy-engine/interfaces/block-cache.type.js';
import { DocumentType } from '../../../dist/policy-engine/interfaces/document.type.js';

describe('@unit PolicyInputEventType enum', () => {
    it('maps key to identical string value', () => {
        assert.equal(PolicyInputEventType.RunEvent, 'RunEvent');
        assert.equal(PolicyInputEventType.TimerEvent, 'TimerEvent');
        assert.equal(PolicyInputEventType.GetDataEvent, 'GetDataEvent');
    });
    it('includes module/tool events', () => {
        assert.equal(PolicyInputEventType.ModuleEvent, 'ModuleEvent');
        assert.equal(PolicyInputEventType.ToolEvent, 'ToolEvent');
    });
    it('all values are unique', () => {
        const values = Object.values(PolicyInputEventType);
        assert.equal(new Set(values).size, values.length);
    });
});

describe('@unit PolicyOutputEventType enum', () => {
    it('maps known outputs', () => {
        assert.equal(PolicyOutputEventType.RunEvent, 'RunEvent');
        assert.equal(PolicyOutputEventType.ErrorEvent, 'ErrorEvent');
        assert.equal(PolicyOutputEventType.CreateGroup, 'CreateGroup');
        assert.equal(PolicyOutputEventType.JoinGroup, 'JoinGroup');
    });
    it('includes signature quorum events', () => {
        assert.equal(PolicyOutputEventType.SignatureQuorumReachedEvent, 'SignatureQuorumReachedEvent');
        assert.equal(PolicyOutputEventType.SignatureSetInsufficientEvent, 'SignatureSetInsufficientEvent');
    });
    it('all values are unique', () => {
        const values = Object.values(PolicyOutputEventType);
        assert.equal(new Set(values).size, values.length);
    });
});

describe('@unit EventActor enum', () => {
    it('Owner and Issuer are lowercase strings', () => {
        assert.equal(EventActor.Owner, 'owner');
        assert.equal(EventActor.Issuer, 'issuer');
    });
    it('EventInitiator is the empty string', () => {
        assert.equal(EventActor.EventInitiator, '');
    });
});

describe('@unit BlockCacheType enum', () => {
    it('has Short and Long', () => {
        assert.equal(BlockCacheType.Short, 'Short');
        assert.equal(BlockCacheType.Long, 'Long');
    });
    it('has exactly two members', () => {
        assert.equal(Object.keys(BlockCacheType).length, 2);
    });
});

describe('@unit DocumentType enum', () => {
    it('maps VC/VP/DID', () => {
        assert.equal(DocumentType.VerifiableCredential, 'VerifiableCredential');
        assert.equal(DocumentType.VerifiablePresentation, 'VerifiablePresentation');
        assert.equal(DocumentType.DID, 'DID');
    });
    it('all values unique', () => {
        const values = Object.values(DocumentType);
        assert.equal(new Set(values).size, values.length);
    });
});

import assert from 'node:assert/strict';
import { GroupRelationshipType, GroupAccessType } from '../dist/type/user-group.type.js';

describe('GroupRelationshipType enum', () => {
    it('exposes Single and Multiple', () => {
        assert.equal(GroupRelationshipType.Single, 'Single');
        assert.equal(GroupRelationshipType.Multiple, 'Multiple');
    });

    it('has exactly two entries', () => {
        assert.equal(Object.keys(GroupRelationshipType).length, 2);
    });
});

describe('GroupAccessType enum', () => {
    it('exposes Global and Private', () => {
        assert.equal(GroupAccessType.Global, 'Global');
        assert.equal(GroupAccessType.Private, 'Private');
    });

    it('has exactly two entries', () => {
        assert.equal(Object.keys(GroupAccessType).length, 2);
    });
});

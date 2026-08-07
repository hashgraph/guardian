import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, isClean } from './_dto-helper.mjs';
import { toOrgResponse } from '../../dist/helpers/org-response.js';
import {
    OrganizationDTO,
    CreateOrganizationDTO,
    UpdateOrganizationDTO,
    PublishOrganizationDTO,
    OrgRoleDTO,
    CreateOrgRoleDTO,
    OrganizationMemberDTO,
    EnrollMemberDTO,
    UpdateMemberRoleDTO,
    AssignPolicyToOrgDTO,
    PolicyOrgAssignmentDTO,
} from '../../dist/middlewares/validation/schemas/organizations.dto.js';

const OID = '6512f0a1c3b2d4e5f6a7b8c9';

describe('toOrgResponse', () => {
    it('drops _id and keeps id', () => {
        const out = toOrgResponse({ _id: OID, id: OID, name: 'Org-A' });
        assert.equal('_id' in out, false);
        assert.equal(out.id, OID);
    });

    it('keeps every other field untouched', () => {
        const record = {
            _id: OID,
            id: OID,
            name: 'Org-A',
            description: 'desc',
            owner: 'did:hedera:testnet:abc',
            walletToken: 'a1b2c3d4',
            hederaAccountId: '0.0.1234',
            topicId: '0.0.5678',
            status: 'PUBLISHED',
            location: 'local',
            createDate: '2026-07-31T10:12:03.114Z',
            updateDate: '2026-07-31T10:12:03.114Z'
        };
        const { _id, ...expected } = record;
        assert.deepEqual(toOrgResponse(record), expected);
    });

    it('maps arrays element-wise', () => {
        const out = toOrgResponse([
            { _id: OID, id: OID, name: 'Org-A' },
            { _id: 'b', id: 'b', name: 'Org-B' }
        ]);
        assert.equal(Array.isArray(out), true);
        assert.deepEqual(out, [{ id: OID, name: 'Org-A' }, { id: 'b', name: 'Org-B' }]);
    });

    it('returns an empty array unchanged', () => {
        assert.deepEqual(toOrgResponse([]), []);
    });

    it('passes through a record that has no _id', () => {
        assert.deepEqual(toOrgResponse({ id: OID, name: 'Org-A' }), { id: OID, name: 'Org-A' });
    });

    it('passes through null and undefined', () => {
        assert.equal(toOrgResponse(null), null);
        assert.equal(toOrgResponse(undefined), undefined);
    });

    it('passes through non-objects', () => {
        assert.equal(toOrgResponse('0.0.1234'), '0.0.1234');
        assert.equal(toOrgResponse(7), 7);
        assert.equal(toOrgResponse(true), true);
    });

    it('does not mutate its input', () => {
        const record = { _id: OID, id: OID, name: 'Org-A' };
        toOrgResponse(record);
        assert.equal(record._id, OID);
    });
});

describe('Organization response DTOs', () => {
    const responseDtos = [
        ['OrganizationDTO', OrganizationDTO],
        ['OrgRoleDTO', OrgRoleDTO],
        ['OrganizationMemberDTO', OrganizationMemberDTO],
        ['PolicyOrgAssignmentDTO', PolicyOrgAssignmentDTO],
    ];

    for (const [name, Dto] of responseDtos) {
        it(`${name} exposes id and never declares _id`, () => {
            const instance = new Dto();
            assert.equal('_id' in instance, false);
            instance.id = OID;
            assert.equal(instance.id, OID);
        });
    }

    it('OrganizationDTO accepts a full published record', () => {
        assert.equal(isClean(errorsFor(OrganizationDTO, {
            id: OID,
            name: 'Org-A',
            description: 'desc',
            owner: 'did:hedera:testnet:abc',
            did: 'did:hedera:testnet:def',
            walletToken: 'a1b2c3d4',
            hederaAccountId: '0.0.1234',
            topicId: '0.0.5678',
            parentTopicId: '0.0.9999',
            status: 'PUBLISHED',
            location: 'local',
            createDate: '2026-07-31T10:12:03.114Z',
            updateDate: '2026-07-31T10:12:03.114Z'
        })), true);
    });

    it('OrganizationDTO accepts an empty record (every field optional)', () => {
        assert.equal(isClean(errorsFor(OrganizationDTO, {})), true);
    });

    it('OrganizationDTO rejects a non-string id', () => {
        assert.equal(hasConstraint(errorsFor(OrganizationDTO, { id: 5 }), 'id', 'isString'), true);
    });

    it('OrgRoleDTO accepts a permissions array', () => {
        assert.equal(isClean(errorsFor(OrgRoleDTO, {
            id: OID,
            organizationId: OID,
            name: 'Manager',
            permissions: ['TOKEN_MINTING', 'TOKEN_TRANSFER']
        })), true);
    });

    it('OrgRoleDTO rejects non-string permission entries', () => {
        assert.equal(hasConstraint(errorsFor(OrgRoleDTO, { permissions: [1] }), 'permissions', 'isString'), true);
    });

    it('OrganizationMemberDTO accepts a full member row', () => {
        assert.equal(isClean(errorsFor(OrganizationMemberDTO, {
            id: OID,
            organizationId: OID,
            did: 'did:hedera:testnet:abc',
            userId: OID,
            username: 'jane.doe',
            orgRoleId: OID,
            orgRoleName: 'Manager',
            active: true,
            messageId: '1700000000.000000000'
        })), true);
    });

    it('OrganizationMemberDTO rejects a non-boolean active', () => {
        assert.equal(hasConstraint(errorsFor(OrganizationMemberDTO, { active: 'yes' }), 'active', 'isBoolean'), true);
    });

    it('PolicyOrgAssignmentDTO accepts an assignment row', () => {
        assert.equal(isClean(errorsFor(PolicyOrgAssignmentDTO, {
            id: OID,
            organizationId: OID,
            policyId: OID,
            owner: 'did:hedera:testnet:abc',
            assigned: true
        })), true);
    });
});

describe('Organization request DTOs', () => {
    it('CreateOrganizationDTO requires name', () => {
        assert.equal(hasConstraint(errorsFor(CreateOrganizationDTO, {}), 'name', 'isString'), true);
        assert.equal(isClean(errorsFor(CreateOrganizationDTO, { name: 'Org-A' })), true);
    });

    it('UpdateOrganizationDTO accepts a partial body', () => {
        assert.equal(isClean(errorsFor(UpdateOrganizationDTO, { name: 'Org-A' })), true);
        assert.equal(isClean(errorsFor(UpdateOrganizationDTO, {})), true);
    });

    it('PublishOrganizationDTO requires the Hedera account id and key', () => {
        const errs = errorsFor(PublishOrganizationDTO, {});
        assert.equal(hasConstraint(errs, 'hederaAccountId', 'isString'), true);
        assert.equal(hasConstraint(errs, 'hederaAccountKey', 'isString'), true);
    });

    it('CreateOrgRoleDTO requires name', () => {
        assert.equal(hasConstraint(errorsFor(CreateOrgRoleDTO, {}), 'name', 'isString'), true);
    });

    it('EnrollMemberDTO requires did and orgRoleId', () => {
        const errs = errorsFor(EnrollMemberDTO, {});
        assert.equal(hasConstraint(errs, 'did', 'isString'), true);
        assert.equal(hasConstraint(errs, 'orgRoleId', 'isString'), true);
    });

    it('UpdateMemberRoleDTO requires orgRoleId', () => {
        assert.equal(hasConstraint(errorsFor(UpdateMemberRoleDTO, {}), 'orgRoleId', 'isString'), true);
    });

    it('AssignPolicyToOrgDTO requires policyId', () => {
        assert.equal(hasConstraint(errorsFor(AssignPolicyToOrgDTO, {}), 'policyId', 'isString'), true);
    });
});

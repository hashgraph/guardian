const { expect, assert } = require('chai');
const { trustChainAPI } = require('../dist/api/trust-chain.service');
const { createChannel, createTable } = require('./helper');
const { did_document } = require('./dump/did_document');
const { vc_document } = require('./dump/vc_document');
const { vp_document } = require('./dump/vp_document');
const { testObject1, testObject2, testObject3 } = require('./mockup/trust-chain.service');

describe('Trust Chain service', function () {
    let service, channel;

    const GET_CHAIN = 'get-chain';

    before(async function () {
        channel = createChannel();

        const didDocumentRepository = createTable();
        const vcDocumentRepository = createTable();
        const vpDocumentRepository = createTable();

        didDocumentRepository.find = async function (param) {
            const result = did_document.filter(e => e.did == param.where.did['$eq']);
            return result;
        }

        vcDocumentRepository.findOne = async function (param) {
            let result = vc_document;
            if (param.where.hash) {
                result = result.filter(e => e.hash == param.where.hash['$eq']);
            }
            if (param.where.type) {
                result = result.filter(e => e.type == param.where.type['$eq']);
            }
            if (param.where.policyId) {
                result = result.filter(e => e.policyId == param.where.policyId['$eq']);
            }
            if (param.where.owner) {
                result = result.filter(e => e.owner == param.where.owner['$eq']);
            }
            return result[0];
        }

        vcDocumentRepository.find = async function (param) {
            const result = vc_document.filter(e => e.document.credentialSubject[0]['id'] == param.where['document.credentialSubject.id']['$eq']);
            return result;
        }

        vpDocumentRepository.findOne = async function (param) {
            let result = vp_document;
            if (param.where.hash) {
                result = result.filter(e => e.hash == param.where.hash['$eq']);
            }
            if (param.where['document.id']) {
                result = result.filter(e => e.document.id == param.where['document.id']['$eq']);
            }
            return result[0];
        }

        service = trustChainAPI(channel,
            didDocumentRepository,
            vcDocumentRepository,
            vpDocumentRepository,
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[GET_CHAIN]);
    });

    it('Test GET_CHAIN', async function () {
        let value;
        value = await channel.run(GET_CHAIN, '5d46d1fd-75ad-4073-ade7-322d6f31374c');
        assert.deepEqual(value, testObject1);

        value = await channel.run(GET_CHAIN, '0123583c-ce26-407e-a079-8b72c2fe435c');
        assert.deepEqual(value, testObject2);

        value = await channel.run(GET_CHAIN, '6i28MnZRhBjw7gjCn3VFeFtEZ3h6CJcrHPpmybvjsHXB');
        assert.deepEqual(value, testObject3);

        testObject1[0].label= 'HASH';
        testObject1[0].id= '6FNz1t4eHNDncM1zn6J8djJLPnjuhQq3hp6EmcF1ictB';
        value = await channel.run(GET_CHAIN, '6FNz1t4eHNDncM1zn6J8djJLPnjuhQq3hp6EmcF1ictB');
        assert.deepEqual(value, testObject1);

        testObject2[0].label= 'HASH';
        testObject2[0].id= '5LDizXoaXcqYmdbGUfsRrzf5PpgWmiUuarmTNgTxAYyU';
        value = await channel.run(GET_CHAIN, '5LDizXoaXcqYmdbGUfsRrzf5PpgWmiUuarmTNgTxAYyU');
        assert.deepEqual(value, testObject2);
    });
});
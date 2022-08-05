const moduleAlias = require('module-alias');

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' + "/auth",
  "@policy-engine": process.cwd() + '/dist' + "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' + "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' + "/document-loader",
  "@database-modules": process.cwd() + '/dist' + "/database-modules"
});

const { expect, assert } = require('chai');
const { trustChainAPI } = require('../../dist/api/trust-chain.service');
const { did_document } = require('./dump/did_document');
const { vc_document } = require('./dump/vc_document');
const { vp_document } = require('./dump/vp_document');
const { testObject1, testObject2, testObject3 } = require('./mockup/trust-chain.service');
const {
    createChannel,
    createTable,
    checkMessage,
    checkError
} = require('./helper');
const { ApplicationState, ApplicationStates } = require('@guardian/interfaces');

describe('Trust Chain service', function () {
    let service, channel;

    const GET_CHAIN = 'get-chain';

    before(async function () {
        const state = new ApplicationState();
        state.updateState(ApplicationStates.READY);

        channel = createChannel();

        const didDocumentRepository = createTable();
        const vcDocumentRepository = createTable();
        const vpDocumentRepository = createTable();

        const search = function (param) {
            const _param = param || {};
            const _where = _param.where || {};
            return {
                has: function (name) {
                    if (_param[name] || _where[name]) {
                        return true;
                    }
                },
                get: function (name) {
                    const v = _where[name] || _param[name];
                    if (v) {
                        if (v['$eq']) {
                            return v['$eq'];
                        }
                        return v;
                    }
                    return null;
                }
            }
        }

        didDocumentRepository.find = async function (param) {
            const params = search(param);
            const result = did_document.filter(e => e.did == params.get('did'));
            return result;
        }

        vcDocumentRepository.findOne = async function (param) {
            let result = vc_document;
            const params = search(param);
            if (params.has('hash')) {
                result = result.filter(e => e.hash == params.get('hash'));
            }
            if (params.has('type')) {
                result = result.filter(e => e.type == params.get('type'));
            }
            if (params.has('policyId')) {
                result = result.filter(e => e.policyId == params.get('policyId'));
            }
            if (params.has('owner')) {
                result = result.filter(e => e.owner == params.get('owner'));
            }
            return result[0];
        }

        vcDocumentRepository.find = async function (param) {
            const params = search(param);
            const result = vc_document.filter(e => e.document.credentialSubject[0]['id'] == params.get('document.credentialSubject.id'));
            return result;
        }

        vpDocumentRepository.findOne = async function (param) {
            let result = vp_document;
            const params = search(param);
            if (params.has('hash')) {
                result = result.filter(e => e.hash == params.get('hash'));
            }
            if (params.has('document.id')) {
                result = result.filter(e => e.document.id == params.get('document.id'));
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
        checkMessage(value, testObject1);

        value = await channel.run(GET_CHAIN, '0123583c-ce26-407e-a079-8b72c2fe435c');
        checkMessage(value, testObject2);

        value = await channel.run(GET_CHAIN, '6i28MnZRhBjw7gjCn3VFeFtEZ3h6CJcrHPpmybvjsHXB');
        checkMessage(value, testObject3);

        testObject1[0].label= 'HASH';
        testObject1[0].id= '6FNz1t4eHNDncM1zn6J8djJLPnjuhQq3hp6EmcF1ictB';
        value = await channel.run(GET_CHAIN, '6FNz1t4eHNDncM1zn6J8djJLPnjuhQq3hp6EmcF1ictB');
        checkMessage(value, testObject1);

        testObject2[0].label= 'HASH';
        testObject2[0].id= '5LDizXoaXcqYmdbGUfsRrzf5PpgWmiUuarmTNgTxAYyU';
        value = await channel.run(GET_CHAIN, '5LDizXoaXcqYmdbGUfsRrzf5PpgWmiUuarmTNgTxAYyU');
        checkMessage(value, testObject2);
    });
});

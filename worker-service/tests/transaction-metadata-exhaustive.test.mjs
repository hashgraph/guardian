import assert from 'node:assert/strict';
import { TransactionLogger } from '../dist/api/helpers/transaction-logger.js';

const tx = (extra = {}) => ({ transactionId: 'TID', transactionMemo: '', ...extra });
const meta = (name, t, m) => TransactionLogger.getTransactionMetadata(name, t, m);

const utf8 = (s) => Buffer.from(s, 'utf8').length;

describe('TransactionLogger.getTransactionMetadata exact output (token/contract decision logic)', () => {
    describe('guard branches', () => {
        for (const falsy of [undefined, null, 0, '', false]) {
            it(`returns '' for a falsy transaction (${JSON.stringify(falsy)})`, () => {
                assert.equal(meta('TokenMintTransaction', falsy), '');
            });
        }

        it('prefixes txid for an unknown transaction name', () => {
            assert.equal(meta('Nope', tx({ transactionId: 'AB' })), 'txid: AB; ');
        });

        for (const id of ['0.0.1@1', 'XYZ', 'a.b.c']) {
            it(`reflects the transactionId ${id} in the prefix`, () => {
                assert.equal(meta('Unknown', tx({ transactionId: id })), `txid: ${id}; `);
            });
        }
    });

    describe('TokenCreateTransaction key flags', () => {
        const keyNames = ['adminKey', 'kycKey', 'wipeKey', 'pauseKey', 'supplyKey', 'freezeKey'];
        const labels = {
            adminKey: 'admin keys',
            kycKey: 'KYC keys',
            wipeKey: 'wipe keys',
            pauseKey: 'pause keys',
            supplyKey: 'supply keys',
            freezeKey: 'freeze keys',
        };

        it('all keys absent -> all flags 0', () => {
            const out = meta('TokenCreateTransaction', tx());
            for (const n of keyNames) {
                assert.match(out, new RegExp(`${labels[n]}: 0; `));
            }
            assert.match(out, /payer sigs: 1; /);
        });

        for (const present of keyNames) {
            it(`only ${present} present -> ${labels[present]} is 1, rest 0`, () => {
                const out = meta('TokenCreateTransaction', tx({ [present]: {} }));
                for (const n of keyNames) {
                    const expected = n === present ? 1 : 0;
                    assert.match(out, new RegExp(`${labels[n]}: ${expected}; `));
                }
            });
        }

        it('all keys present -> all flags 1', () => {
            const present = {};
            for (const n of keyNames) {
                present[n] = {};
            }
            const out = meta('TokenCreateTransaction', tx(present));
            for (const n of keyNames) {
                assert.match(out, new RegExp(`${labels[n]}: 1; `));
            }
        });

        for (const [name, symbol, memo] of [
            ['Tok', 'TK', ''],
            ['LongerName', 'SYMB', 'a memo'],
            ['', '', ''],
            ['émojiنname', 'ÜP', 'çé'],
        ]) {
            it(`reports byte sizes for name='${name}' symbol='${symbol}' memo='${memo}'`, () => {
                const out = meta('TokenCreateTransaction', tx({ tokenName: name, tokenSymbol: symbol, tokenMemo: memo }));
                assert.match(out, new RegExp(`token name size: ${utf8(name)}; `));
                assert.match(out, new RegExp(`token symbol size: ${utf8(symbol)}; `));
                assert.match(out, new RegExp(`token memo size: ${utf8(memo)}; `));
            });
        }
    });

    describe('simple sigs+memo token transactions exact string', () => {
        const simpleTwoSig = [
            'TokenAssociateTransaction',
            'TokenDissociateTransaction',
            'TokenFreezeTransaction',
            'TokenUnfreezeTransaction',
            'TokenGrantKycTransaction',
            'TokenRevokeKycTransaction',
            'TokenWipeTransaction',
            'AccountCreateTransaction',
        ];

        const extraLine = {
            TokenAssociateTransaction: 'tokens associated: 1; ',
            TokenDissociateTransaction: 'tokens dissociated: 1; ',
        };

        for (const name of simpleTwoSig) {
            for (const memo of ['', 'hello', 'mémo']) {
                it(`${name} memo='${memo}' exact output`, () => {
                    const out = meta(name, tx({ transactionId: 'X', transactionMemo: memo }));
                    let expected = 'txid: X; payer sigs: 1; total sigs: 1; ';
                    if (extraLine[name]) {
                        expected = `txid: X; payer sigs: 1; total sigs: 1; ${extraLine[name]}`;
                    }
                    expected += `memo size: ${utf8(memo)}; `;
                    assert.equal(out, expected);
                });
            }
        }
    });

    describe('TokenUpdate / TokenDelete (payer sig + memo only)', () => {
        for (const name of ['TokenUpdateTransaction', 'TokenDeleteTransaction']) {
            for (const memo of ['', 'm', 'multi byte é']) {
                it(`${name} memo='${memo}' exact output`, () => {
                    const out = meta(name, tx({ transactionId: 'U', transactionMemo: memo }));
                    assert.equal(out, `txid: U; payer sigs: 1; memo size: ${utf8(memo)}; `);
                });
            }
        }
    });

    describe('TokenMintTransaction (fungible)', () => {
        for (const memo of ['', 'mint', 'çmint']) {
            it(`fungible mint memo='${memo}' exact output`, () => {
                const out = meta('TokenMintTransaction', tx({ transactionId: 'M', transactionMemo: memo }));
                assert.equal(out, `txid: M; Fungible Token; payer sigs: 1; total sigs: 1; memo size: ${utf8(memo)}; `);
            });
        }
    });

    describe('TokenMintNFTTransaction (non-fungible serial/byte math)', () => {
        const cases = [
            [[new Uint8Array([1])], 1, 1],
            [[new Uint8Array([1, 2, 3])], 1, 3],
            [[new Uint8Array([1, 2]), new Uint8Array([3, 4])], 2, 2],
            [[new Uint8Array(10), new Uint8Array(10), new Uint8Array(10)], 3, 10],
        ];
        for (const [mdata, count, firstLen] of cases) {
            it(`${count} NFT(s), first metadata ${firstLen} bytes`, () => {
                const out = meta('TokenMintNFTTransaction', tx({ transactionId: 'N', metadata: mdata }));
                assert.match(out, /Non-Fungible Token; /);
                assert.match(out, new RegExp(`of NFTs minted: ${count};`));
                assert.match(out, new RegExp(`bytes of metadata per NFT: ${firstLen};`));
            });
        }

        it('counts NFTs independent of per-item size', () => {
            const out = meta('TokenMintNFTTransaction', tx({
                metadata: [new Uint8Array(5), new Uint8Array(99), new Uint8Array(1), new Uint8Array(2), new Uint8Array(3)],
            }));
            assert.match(out, /of NFTs minted: 5;/);
            assert.match(out, /bytes of metadata per NFT: 5;/);
        });
    });

    describe('TransferTransaction (fungible amount math)', () => {
        for (const amount of [0, 1, 42, 1000000, -5, '7', 'abc']) {
            it(`amount=${JSON.stringify(amount)} echoed into output`, () => {
                const out = meta('TransferTransaction', tx({ transactionId: 'F' }), amount);
                assert.match(out, /Fungible Token; /);
                assert.match(out, new RegExp(`amount: ${amount}; `));
            });
        }

        it('exact fungible transfer string', () => {
            const out = meta('TransferTransaction', tx({ transactionId: 'F', transactionMemo: 'mm' }), 99);
            assert.equal(out, 'txid: F; Fungible Token; payer sigs: 1; total sigs: 1; amount: 99; memo size: 2; ');
        });
    });

    describe('NFTTransferTransaction (serial-count via stringSize of metadata)', () => {
        for (const [m, size] of [['a', 1], ['abc', 3], ['', 0], ['héllo', utf8('héllo')]]) {
            it(`metadata='${m}' -> of NFTs transferred: ${size}`, () => {
                const out = meta('NFTTransferTransaction', tx({ transactionId: 'NT' }), m);
                assert.match(out, /Non-Fungible Token; /);
                assert.match(out, new RegExp(`of NFTs transferred: ${size}; `));
            });
        }

        it('counts bytes for a Uint8Array metadata', () => {
            const out = meta('NFTTransferTransaction', tx(), new Uint8Array([1, 2, 3, 4]));
            assert.match(out, /of NFTs transferred: 4; /);
        });
    });

    describe('TopicCreateTransaction key flags + memo sizes', () => {
        const matrix = [
            [{}, {}, 1, 1],
            [{}, null, 1, 0],
            [null, {}, 0, 1],
            [null, null, 0, 0],
        ];
        for (const [adminKey, submitKey, a, s] of matrix) {
            it(`admin=${a} submit=${s}`, () => {
                const out = meta('TopicCreateTransaction', tx({ adminKey, submitKey, topicMemo: 'memo' }));
                assert.match(out, new RegExp(`admin keys: ${a}; `));
                assert.match(out, new RegExp(`submit keys: ${s}; `));
                assert.match(out, /topic memo size: 4; /);
            });
        }

        for (const tm of ['', 'topic', 'çtopic']) {
            it(`topic memo size for '${tm}'`, () => {
                const out = meta('TopicCreateTransaction', tx({ topicMemo: tm }));
                assert.match(out, new RegExp(`topic memo size: ${utf8(tm)}; `));
            });
        }
    });

    describe('TopicMessageSubmitTransaction message size', () => {
        for (const msg of ['', 'x', 'hello world', 'çé', 'a'.repeat(50)]) {
            it(`message size for length ${msg.length}`, () => {
                const out = meta('TopicMessageSubmitTransaction', tx({ message: msg }));
                assert.match(out, new RegExp(`message size: ${utf8(msg)}; `));
            });
        }
    });

    describe('memo byte-size accounting across token types', () => {
        for (const [memo, bytes] of [['', 0], ['a', 1], ['ab', 2], ['é', 2], ['🙂', 4], ['aé🙂', 7]]) {
            it(`TokenWipeTransaction memo '${memo}' -> ${bytes} bytes`, () => {
                const out = meta('TokenWipeTransaction', tx({ transactionMemo: memo }));
                assert.match(out, new RegExp(`memo size: ${bytes}; `));
            });
        }
    });
});

describe('TransactionLogger.getTransactionData (pure payload shaping)', () => {
    it('builds the canonical log payload with operator account id', () => {
        const client = { operatorAccountId: { toString: () => '0.0.42' } };
        const out = TransactionLogger.getTransactionData('id-1', client, 'testnet', 'TokenMintTransaction', 'user-1');
        assert.deepEqual(out, {
            id: 'id-1',
            network: 'testnet',
            operatorAccountId: '0.0.42',
            transactionName: 'TokenMintTransaction',
            payload: { userId: 'user-1' },
        });
    });

    it('tolerates a null client (operatorAccountId undefined)', () => {
        const out = TransactionLogger.getTransactionData('id-2', null, 'mainnet', 'TransferTransaction', null);
        assert.equal(out.operatorAccountId, undefined);
        assert.equal(out.network, 'mainnet');
        assert.deepEqual(out.payload, { userId: null });
    });

    it('tolerates a client without operatorAccountId', () => {
        const out = TransactionLogger.getTransactionData('id-3', {}, 'testnet', 'TokenWipeTransaction', 'u');
        assert.equal(out.operatorAccountId, undefined);
    });

    for (const net of ['testnet', 'mainnet', 'previewnet', 'localnode']) {
        it(`passes through network '${net}'`, () => {
            const out = TransactionLogger.getTransactionData('i', null, net, 'X', 'u');
            assert.equal(out.network, net);
        });
    }
});

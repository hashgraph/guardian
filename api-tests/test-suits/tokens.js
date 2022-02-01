const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function Tokens() {
    let tokenId;

    it('/tokens', async function() {
        this.timeout(60000);
        let result;

        result = await axios.post(
            GetURL('tokens'),
            {"tokenName":"Token Name","tokenSymbol":"F","tokenType":"fungible","decimals":"2","initialSupply":"0","enableAdmin":true,"changeSupply":true,"enableFreeze":true,"enableKYC":true,"enableWipe":true},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);

        result = await axios.get(
            GetURL('tokens'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
        tokenId = result.data[0].tokenId;
    });

    it('/tokens/{tokenId}/{username}/info', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('tokens', tokenId, 'Installer', 'info'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(
            result.data,
            {
                tokenId: tokenId,
                associated: false,
                balance: null,
                hBarBalance: null,
                frozen: null,
                kyc: null

            }
        )
    })

    it('/tokens/{tokenId}/associate', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'associate'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        assert.equal(result.data, true);
    })

    it('/tokens/{tokenId}/{username}/grantKyc', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'Installer', 'grantKyc'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        delete result.data.balance;
        delete result.data.hBarBalance;
        assert.deepEqual(
            result.data,
            {
                tokenId: tokenId,
                associated: true,
                frozen: false,
                kyc: true


            }
        )
    })

    it('/tokens/{tokenId}/{username}/freeze', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'Installer', 'freeze'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        delete result.data.balance;
        delete result.data.hBarBalance;
        assert.deepEqual(
            result.data,
            {
                tokenId: tokenId,
                associated: true,
                frozen: true,
                kyc: true


            }
        )
    })

    it('/tokens/{tokenId}/{username}/unfreeze', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'Installer', 'unfreeze'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        delete result.data.balance;
        delete result.data.hBarBalance;
        assert.deepEqual(
            result.data,
            {
                tokenId: tokenId,
                associated: true,
                frozen: false,
                kyc: true


            }
        )
    })

    it('/tokens/{tokenId}/{username}/revokeKyc', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'Installer', 'revokeKyc'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        delete result.data.balance;
        delete result.data.hBarBalance;
        assert.deepEqual(
            result.data,
            {
                tokenId: tokenId,
                associated: true,
                frozen: false,
                kyc: false


            }
        )
    })

    it('/tokens/{tokenId}/dissociate', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('tokens', tokenId, 'dissociate'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        assert.equal(result.data, true);
    })
}

module.exports = {
    Tokens
}

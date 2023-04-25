const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function TrustChains() {
    it('/trust-chains', async function () {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('trust-chains'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    });

    it('/trust-chains/{hash}', async function () {
        this.timeout(60000);
        const result = await axios.get(
            GetURL('trust-chains', '123123123'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.deepEqual(result.data, {chain: [], userMap: []});
    });

    it('/trustchains', async function () {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('trust-chains'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    });

    it('/trustchains/{hash}', async function () {
        this.timeout(60000);
        const result = await axios.get(
            GetURL('trust-chains', '123123123'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.deepEqual(result.data, {chain: [], userMap: []});
    });
}

module.exports = {
    TrustChains: TrustChains
}

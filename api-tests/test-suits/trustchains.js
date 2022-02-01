const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function Trustchains() {
    it('/trustchains', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('trustchains'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    })

    it('/trustchains/{hash}', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('trustchains', '123123123'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Auditor')}`,
                }
            }
        );
        assert.deepEqual(result.data, {chain: [], userMap: []});
    })
}

module.exports = {
    Trustchains
}

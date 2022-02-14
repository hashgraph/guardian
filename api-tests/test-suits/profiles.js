const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function Profiles() {
    it('/profile/balance', async function() {
        this.timeout(60000);
        const result = await axios.get(
            GetURL('profile', 'balance'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
    })

    it('/profile', async function() {
        this.timeout(120000);

        let result;

        result = await axios.get(
            GetURL('profile'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        const profile = result.data;

        result = await axios.get(
            GetURL('demo', 'randomKey'),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        result = await axios.put(
            GetURL('profile'),
            {"hederaAccountId": result.data.id, "hederaAccountKey":result.data.key, "vcDocument":{"name":"1234","type":"RootAuthority&1.0.0","@context":["https://ipfs.io/ipfs/bafkreibzihfnj67xgs74xfv2ap7rallevyce6uj5sg73j3p2cxlm2qx6ru"]},"addressBook":{"appnetName":"Test Identity SDK appnet","didServerUrl":"http://localhost:3000/api/v1","didTopicMemo":"Test Identity SDK appnet DID topic","vcTopicMemo":"Test Identity SDK appnet VC topic"}},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );

        assert.equal(result.data, null);

        result = await axios.get(
            GetURL('demo', 'randomKey'),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        result = await axios.put(
            GetURL('profile'),
            {"hederaAccountId": result.data.id, "hederaAccountKey":result.data.key},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
    })
}

module.exports = {
    Profiles
}

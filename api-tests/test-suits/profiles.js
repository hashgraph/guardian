const axios = require("axios");
const { GetURL, GetToken } = require("../helpers");
const assert = require("assert");

function Profiles() {
    it('/profiles/balance', async function () {
        this.timeout(60000);
        const result = await axios.get(
            GetURL('profiles',  'balance'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
    })

    it('/profiles', async function () {
        this.timeout(120000);

        let result;

        result = await axios.get(
            GetURL('profiles', ''),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        const profile = result.data;

        result = await axios.get(
            GetURL('demo', 'push', 'randomKey'),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        result = await axios.put(
            GetURL('profiles', 'push', 'StandardRegistry'),
            {
                'hederaAccountId': result.data.id,
                'hederaAccountKey': result.data.key,
                'vcDocument':{
                    'geography':'123123',
                    'law':'123123',
                    'tags':'123123',
                    'ISIC':'123123',
                    'type':'StandardRegistry',
                    '@context':[]}
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                }
            }
        );
    })
}

module.exports = {
    Profiles
}

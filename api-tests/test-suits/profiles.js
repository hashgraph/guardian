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
        this.timeout(240000);

        let result;

        result = await axios.get(
            GetURL('profiles', 'Installer'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
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

    });
    it('/demo', async function () {
        this.timeout(240000);

        /*
        let result;
        result = await axios.get(
            GetURL('demo', 'push', 'randomKey'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                }
            }
        );
        */

        if (!(process.env.DEMO && process.env.DEMO == 'true')) {
            try {
                let result;
                result = await axios.get(
                    GetURL('demo', 'push', 'randomKey'),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                        }
                    }
                );
    
                // If the request succeeds, you can fail the test
                assert.fail('Expected 404 error, but request succeeded');
            } catch (error) {
                // Check if the error status is 404
                if (error.response && error.response.status === 404) {
                    // The expected 404 error occurred, so the test passes
                    return;
                }
    
                // An unexpected error occurred, so fail the test with the error message
                assert.fail(error.message);
            }
        } else {
            // Skip the test if process.env.DEMO is true
            let result;
            result = await axios.get(
                GetURL('demo', 'push', 'randomKey'),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                    }
                }
            );
        }

        // result = await axios.get(
        //     GetURL('demo', 'randomKey'),
        //     {
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
        //         }
        //     }
        // );
    })
}

module.exports = {
    Profiles
}

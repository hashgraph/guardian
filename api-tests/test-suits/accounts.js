const axios = require('axios');
const assert = require('assert')
const {GetURL, sleep, SaveToken, GetToken} = require('../helpers');


function Accounts() {
    it('/accounts/login', async function() {
        let result;
        result = await axios.post(
            GetURL('accounts', 'login'),
            JSON.stringify({
                username: 'StandardRegistry',
                password: 'test'
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        SaveToken(result.data.username, result.data.accessToken);
        delete result.data.accessToken;
        delete result.data.did;
        assert.deepEqual(result.data, {
            username: 'StandardRegistry',
            role: 'STANDARD_REGISTRY'
        })
        result = await axios.post(
            GetURL('accounts', 'login'),
            JSON.stringify({
                username: 'Installer',
                password: 'test'
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        SaveToken(result.data.username, result.data.accessToken);
        delete result.data.accessToken;
        delete result.data.did;
        assert.deepEqual(result.data, {
            username: 'Installer',
            role: 'USER'
        })
        result = await axios.post(
            GetURL('accounts', 'login'),
            JSON.stringify({
                username: 'Installer2',
                password: 'test'
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        SaveToken(result.data.username, result.data.accessToken);
        delete result.data.accessToken;
        delete result.data.did;
        assert.deepEqual(result.data, {
            username: 'Installer2',
            role: 'USER'
        })
    })

    it('/accounts', async function() {
        const result = await axios.get(
            GetURL('accounts', ''),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                }
            }
        );
        assert.deepEqual(
            result.data.map(v => {
                delete v.did;
                delete v.parent;
                return v;
            }),
            [
                {
                    username: 'Installer'
                },
                {
                    username: 'Installer2'
                },
                {
                    username: 'Registrant'
                },
                {
                    username: 'VVB'
                },
                {
                    username: 'ProjectProponent'
                }
            ]

        )
    })


    it('/accounts/session', async function() {
        let result;

        result = await axios.get(
            GetURL('accounts', 'session'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('StandardRegistry')}`,
                }
            }
        );
        delete result.data.did;
        delete result.data.iat;
        delete result.data._id;
        delete result.data.hederaAccountId;
        delete result.data.id;
        delete result.data.password;
        delete result.data.walletToken;
        delete result.data.createDate;
        delete result.data.updateDate;
        delete result.data.parent;
        assert.deepEqual(result.data, {
            role: 'STANDARD_REGISTRY',
            username: 'StandardRegistry',
        })

        result = await axios.get(
            GetURL('accounts', 'session'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        delete result.data.did;
        delete result.data.iat;
        delete result.data._id;
        delete result.data.hederaAccountId;
        delete result.data.id;
        delete result.data.password;
        delete result.data.walletToken;
        delete result.data.createDate;
        delete result.data.updateDate;
        delete result.data.parent;
        assert.deepEqual(result.data, { username: 'Installer', role: 'USER' });
    });

    it('/accounts/register', async function() {
        let result;

        result = await axios.post(
            GetURL('accounts', 'register'),
            {username: 'apiTest', password: 'apiTest', password_confirmation: 'apiTest', role: 'USER'},
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        delete result.data.password;
        delete result.data.id;
        delete result.data._id;
        delete result.data.parent;
        delete result.data.walletToken
        delete result.data.createDate;
        delete result.data.updateDate;
        assert.deepEqual(result.data, {
            username: 'apiTest',
            did: null,
            role: 'USER',
        })
    });
}

module.exports = {
    Accounts
}

const axios = require('axios');
const assert = require('assert')
const {GetURL, sleep, SaveToken, GetToken} = require('../helpers');

function Accounts() {
    it('/accounts/login', async function() {
        let result;
        result = await axios.post(
            GetURL('accounts', 'login'),
            JSON.stringify({
                username: 'RootAuthority',
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
            username: 'RootAuthority',
            role: 'ROOT_AUTHORITY'
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
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(
            result.data.map(v => {
                delete v.did;
                return v;
            }),
            [
                { username: 'Installer' },
                { username: 'Installer2' },
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
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        delete result.data.did;
        delete result.data.iat;
        assert.deepEqual(result.data, { username: 'RootAuthority', role: 'ROOT_AUTHORITY' })

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
        assert.deepEqual(result.data, { username: 'Installer', role: 'USER' });
    });

    it('/accounts/register', async function() {
        let result;

        result = await axios.post(
            GetURL('accounts', 'register'),
            {username: 'apiTest', password: 'apiTest'},
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        delete result.data.id;
        delete result.data.password;
        assert.deepEqual(result.data, {
            username: 'apiTest',
            did: null,
            role: 'USER'
        })
    });
}

module.exports = {
    Accounts
}

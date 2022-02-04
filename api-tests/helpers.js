const axios = require("axios");
const BASE_URL = 'http://localhost:3002'

let tokens = [
];

async function GenerateTokens() {
    tokens = [];
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
    result = await axios.post(
        GetURL('accounts', 'login'),
        JSON.stringify({
            username: 'Auditor',
            password: 'test'
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(result.data.username, result.data.accessToken);
}

function SaveToken(name, token) {
    tokens.push({token, name});
}

function GetToken(name) {
    return (tokens.find(t => t.name === name) || {}).token;
}

function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time)
    })
}

function GetURL(service, ...methods) {
    console.log([BASE_URL, service, ...methods].join('/'));
    return [BASE_URL, service, ...methods].join('/');
}

module.exports = {
    sleep,
    GetURL,
    SaveToken,
    GetToken,
    GenerateTokens
}

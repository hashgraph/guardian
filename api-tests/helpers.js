import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

let tokens = [
];

async function GenerateTokens() {
    this.timeout(60000);
    tokens = [];
    let result;
    let username;
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
    username = result.data.username;
    result = await axios.post(
        GetURL('accounts', 'access-token'),
        JSON.stringify({
            refreshToken: result.data.refreshToken
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(username, result.data.accessToken);
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
    username = result.data.username;
    result = await axios.post(
        GetURL('accounts', 'access-token'),
        JSON.stringify({
            refreshToken: result.data.refreshToken
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(username, result.data.accessToken);
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
    username = result.data.username;
    result = await axios.post(
        GetURL('accounts', 'access-token'),
        JSON.stringify({
            refreshToken: result.data.refreshToken
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(username, result.data.accessToken);
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
    username = result.data.username;
    result = await axios.post(
        GetURL('accounts', 'access-token'),
        JSON.stringify({
            refreshToken: result.data.refreshToken
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        }
    );
    SaveToken(username, result.data.accessToken);
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
        }, time);
    })
}

function GetURL(service, ...methods) {
    console.log([BASE_URL, service, ...methods].join('/'));
    return [BASE_URL, service, ...methods].join('/');
}

function GenerateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export {
    sleep,
    GetURL,
    SaveToken,
    GetToken,
    GenerateTokens,
    GenerateUUIDv4,
};

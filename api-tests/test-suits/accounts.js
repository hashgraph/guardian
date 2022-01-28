const axios = require('axios');
const {GetURL, sleep} = require('../helpers');

async function Login() {
    this.timeout(1000000);
    const body = JSON.stringify({
        username: 'RootAuthority',
        password: 'test'
    });
    // await sleep(20000);
    const result = await axios.post(GetURL('accounts', 'login'), body, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
    console.log(result);

}

module.exports = {
    Login
}

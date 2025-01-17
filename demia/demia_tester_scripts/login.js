const axios = require('axios');
const { baseUrl, username, password } = require('./constants');

const login = async () => {
    try {
        const response = await axios.post(`${baseUrl}/api/auth/login`, { username, password });
        const { token } = response.data;
        console.log(`Login successful. Token: ${token}`);
        return token ;
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = login;

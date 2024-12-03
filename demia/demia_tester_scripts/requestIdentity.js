const axios = require('axios');
const { baseUrl } = require('./constants');

const requestIdentity = async (credentials) => {
    try {
        const response = await axios.get(`${baseUrl}/api/admin/identity/create`, {
            headers: {
                Authorization: `Bearer ${credentials}`
            }
        });
        console.log("Identity creation response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Identity request failed:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = requestIdentity;

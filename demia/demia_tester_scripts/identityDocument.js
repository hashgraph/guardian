const axios = require('axios');
const { baseUrl } = require('./constants');

const identityDocument = async (did) => {
    try {
        const response = await axios.post(`${baseUrl}/api/user/identity/document`, { did });
        console.log("Identity document response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting identity document request:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = identityDocument;

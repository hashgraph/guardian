const axios = require('axios');
const { baseUrl } = require('./constants');

const siteAnalyticsRequest = async (token, siteId) => {
    try {
        const response = await axios.post(`${baseUrl}/api/context/${siteId}/analytics`, { filters: ["ch4_destroyed"] }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Site analytics response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting site analytics request:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = siteAnalyticsRequest;

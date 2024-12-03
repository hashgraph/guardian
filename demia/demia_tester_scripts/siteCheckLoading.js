const axios = require('axios');
const { baseUrl, site_id } = require('./constants');

const siteCheckLoading = async (token, siteId) => {
    try {
        const response = await axios.get(`${baseUrl}/api/context/${siteId}/loading`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting site loading request:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = siteCheckLoading;

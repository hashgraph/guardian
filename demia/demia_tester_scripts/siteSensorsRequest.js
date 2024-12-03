const axios = require('axios');
const { baseUrl } = require('./constants');

const siteSensorsRequest = async (token, siteId) => {
    try {
        const response = await axios.get(`${baseUrl}/api/context/${siteId}/sensors`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Site sensors response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting site sensors request:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = siteSensorsRequest;

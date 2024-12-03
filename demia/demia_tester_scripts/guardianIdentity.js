const axios = require('axios');
const { baseUrl, site_id } = require('./constants');

const guardianIdentity = async (token) => {
    try {
        const profileResponse = await axios.get(`${baseUrl}/api/user/guardian/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Profile response: ", profileResponse.data);
    } catch (error) {
        console.error('Error posting guardian profile request:', error.response ? error.response.data : error.message);
        throw error;
    }

    try {
        const response = await axios.post(`${baseUrl}/api/user/guardian/identity`, { site_id }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Guardian identity response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting guardian identity request:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = guardianIdentity;

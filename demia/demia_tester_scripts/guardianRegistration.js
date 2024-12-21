const axios = require('axios');
const { baseUrl, site_id, registry_params, link_params } = require('./constants');

const guardianRegistration = async (token, siteId) => {
    const linkParams = {
        login: link_params
    }

    const registryParams = {
        site_id: siteId,
        registry_params,
    };
    try {
        const link_response = await axios.post(`${baseUrl}/api/auth/guardian/link`, linkParams, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Guardian linking response: ", link_response.data);

        const response = await axios.post(`${baseUrl}/api/auth/guardian/register`, registryParams, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Guardian registration response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Guardian registration post failed:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = guardianRegistration;

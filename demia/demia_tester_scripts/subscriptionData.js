const axios = require('axios');
const { baseUrl } = require('./constants');

const subscriptionsData = async (token) => {
    try {
        const response = await axios.get(`${baseUrl}/api/user/subscriptions`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Subscription data response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Subscription data get failed:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = subscriptionsData;

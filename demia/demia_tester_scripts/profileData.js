const axios = require('axios');
const { baseUrl } = require('./constants');

const profileData = async (token) => {
    try {
        const response = await axios.get(`${baseUrl}/api/user/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Profile data response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Profile data get failed:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = profileData;

const axios = require('axios');
const { baseUrl } = require('./constants');

const createSite = async (token, siteRequest) => {
    try {
        let new_id = crypto.randomUUID();
        siteRequest['project']['name'] = "Test Site " + new_id.slice(0,6);
        siteRequest['project']['id'] = crypto.randomUUID();

        const response = await axios.post(`${baseUrl}/api/admin/create_new_project`, siteRequest, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("New site response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error adding new site:', error.response ? error.response.data : error.message);
        throw error;
    }

}

const addNewStream = async (token, siteRequest) => {
    try {
        const response = await axios.post(`${baseUrl}/api/admin/new_stream`, siteRequest, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("New site response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error adding new stream:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = {addNewStream, createSite};

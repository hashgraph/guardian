const axios = require('axios');
const { baseUrl, msg_address } = require('./constants');
const {makeMockSensorData, DataSendRequest} = require("./util");

const dataTransmission = async (token, site_id) => {
    try {
        let data = makeMockSensorData();
        let dataRequest = new DataSendRequest(
            site_id,
            "Flowmeter 4.3",
            data
        )

        const response = await axios.post(`${baseUrl}/api/context/data/send`, dataRequest, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Data transmission response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting data transmission:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = dataTransmission;

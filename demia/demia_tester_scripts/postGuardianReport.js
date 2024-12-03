const axios = require('axios');
const { baseUrl, site_id } = require('./constants');

const postGuardianReport = async (token, siteId) => {
    try {
        const start = new Date(), end = new Date();
        end.setTime(start - (7*24*3600000));
        const response = await axios.post(`${baseUrl}/api/context/guardian/report`, { site_id: siteId, start, end  }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Guardian report post response: ", response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting guardian report:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = postGuardianReport;

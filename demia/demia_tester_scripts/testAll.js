const login = require('./login');
const requestIdentity = require('./requestIdentity');
const {addNewStream, createSite } = require('./addNewStream');
const profileData = require('./profileData');
const subscriptionsData = require('./subscriptionData');
const identityDocument = require('./identityDocument');
const guardianRegistration = require('./guardianRegistration');
const guardianIdentity = require('./guardianIdentity');
const postGuardianReport = require('./postGuardianReport');
const siteSensorsRequest = require('./siteSensorsRequest');
const siteCheckLoading = require('./siteCheckLoading');
const siteAnalyticsRequest = require('./siteAnalyticsRequest');
const dataTransmission = require('./dataTransmission');
const { auth_identifier, announcement, site_id, createNew } = require('./constants');
const {createNewSiteRequest} = require('./util');
// Simulating the full testing flow
const main = async () => {
    try {
        // Step 1: Login to get credentials
        const token = await login();

        // Step 2: Request identity creation
        const identityResponse = await requestIdentity(token);
        const did = identityResponse.userId;

        // Step 3: Prepare the request for the new stream
        const newStreamRequest = createNewSiteRequest(did, auth_identifier, announcement, site_id);
        let siteId;

        // Step 4: Add new stream
        if (createNew) {
            let res = await createSite(token, newStreamRequest);
            siteId = res.project_id;

            console.log("New site created. Waiting for it to finish loading before sending data...");
            do {
                await new Promise(r => setTimeout(r, 5000))
            } while(await siteCheckLoading(token, siteId) == true)
            console.log("Site loaded, Sending trasmission...");

            // Step 4a: Send data to the site
            for (let i = 0; i < 10; i++) {
                await dataTransmission(token, newStreamRequest.project.id);
            }

        } else {
            siteId = site_id;
            await addNewStream(token, newStreamRequest);
        }

        // Step 5: Fetch profile data
        await profileData(token);

        // Step 6: Fetch subscriptions data
        await subscriptionsData(token);

        // Step 7: Fetch identity document request
        await identityDocument(did);

        // Step 8: Post Guardian registration
        await guardianRegistration(token, siteId);

        // Step 9: Fetch Guardian identity request
        await guardianIdentity(token);

        // Step 10: Post Guardian report
        await postGuardianReport(token, siteId);

        // Step 11: Fetch site sensors request
        await siteSensorsRequest(token, siteId);

        // Step 12: Fetch site analytics request
        await siteAnalyticsRequest(token, siteId);

        console.log("All tests completed successfully.");
    } catch (error) {
        console.error('Test run failed:', error.response ? error.response.data : error.message);
    }
};

main();

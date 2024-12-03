## Tester Scripts

This directory contains scripts to test various functionalities of the Demia API. The main script, `testAll.js`, simulates the full testing flow by making a series of API calls.

### Prerequisites
If you are running the api container locally, you will need to ensure you have the necessary environment variables 
set up the `.env` file in the root directory of the project. Refer to the main [README.md](../README.md) for details on the required environment variables.


### Configuration

The `tester_scripts/constants.js` file contains base information required for running the example scripts. Below is an example of the configuration with generic arguments:

```javascript
const baseUrl = 'https://api.demia.net'; // http://localhost:8000 for local testing
const username = 'your_username';
const password = 'your_password';

// Project Details (Only change these if you want to test an alternative 
// project from the Demo Project)
const auth_identifier = 'project_auth_identifier';
const announcement = 'project_announcement_address';
const site_id = 'project_site_id';
const msg_address = 'placeholder_message_address'; // You can leave this one alone

module.exports = { baseUrl, username, password, auth_identifier, announcement, site_id, msg_address };
```

### Running the Tests

To run the tests, navigate to the `tester_scripts` directory and execute the `testAll.js` script:

```sh
cd tester_scripts
npm install 
npm run start
```

### API Calls Overview

The `testAll.js` script performs the following sequence of API calls:

1. **Login**
    - **Function**: `login()`
    - **Description**: Logs in to get credentials (access token and user ID).


2. **Request Identity Creation**
    - **Function**: `requestIdentity(credentials)`
    - **Description**: Requests the creation of a new identity using the provided credentials.


3. **Add New Stream or Create Site**
    - **Function**: `createSite(newStreamRequest)` or `addNewStream(newStreamRequest)`
    - **Description**: Depending on the `createNew` flag, either creates a new site or adds a new stream.


4. **Send Data to the Site**
    - **Function**: `dataTransmission(newStreamRequest.project.id, credentials)`
    - **Description**: Sends data to the newly created site (if `createNew` is true).


5. **Fetch Profile Data**
    - **Function**: `profileData(credentials)`
    - **Description**: Fetches profile data using the provided credentials.


6. **Fetch Subscriptions Data**
    - **Function**: `subscriptionsData(credentials)`
    - **Description**: Fetches subscriptions data using the provided credentials.


7. **Fetch Identity Document Request**
    - **Function**: `identityDocument(did)`
    - **Description**: Fetches the identity document request using the DID.


8. **Post Guardian Registration**
    - **Function**: `guardianRegistration(credentials)`
    - **Description**: Posts the Guardian registration using the provided credentials.


9. **Fetch Guardian Identity Request**
   - **Function**: `guardianIdentity(credentials)`
   - **Description**: Fetches the Guardian identity request using the provided credentials.


10. **Post Guardian Report**
    - **Function**: `postGuardianReport(credentials)`
    - **Description**: Posts the Guardian report using the provided credentials.


11. **Fetch Site Sensors Request**
    - **Function**: `siteSensorsRequest(credentials)`
    - **Description**: Fetches the site sensors request using the provided credentials.


12. **Fetch Site Analytics Request**
    - **Function**: `siteAnalyticsRequest(credentials)`
    - **Description**: Fetches the site analytics request using the provided credentials.

### Utils
Additionally, there are 2 service functions that are available for setting up default values

1. **Prepare New Stream Request**
   - **Function**: `createNewSiteRequest(did, auth_identifier, announcement, site_id, credentials)`
   - **Description**: Prepares the request for creating a new stream.


2. **Generate Mock Sensor Data**
   - **Function**: `makeMockSensorData()`
   - **Description**: Generates mock sensor data with random values for testing purposes.

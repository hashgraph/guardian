const baseUrl = 'https://api.demia.net';
const username = 'test_user@test.net'; // Replace with your own username
const password = 'Password'; // Replace with your own password


// True if you would like to create a new site from scratch and send data manually (takes longer but is a more dynamic and live test)
const createNew = false;

// Demo Project in testnet
const auth_identifier = "87b0b686dcef3beab98fc54eebd9f10a41d2f0e2fc4b379099a3b04c2ea2e283";
const announcement = "b78a87b095bc0d7c10b51583acb6b455e5c9749cacc8b314c356c6654f07f54d249a13d3e898d9b8:f929b7e8878bda9ebd6aacb0";
const site_id = "086406b781fa965050e08cf3c60a2c84070d8cedf8d9dff44241e6271b6e4cb1";

// Empty message address
const msg_address = "00000000000000000000000000000000000000000000000000000000000000000000000000000000:000000000000000000000000"

// Registry parameters for guardian registration
const registry_params = {
    operatorId: "0.0.4992026", // This is the operatorId of the "Installer" guardian account
    operatorKey: "302e020100300506032b657004220420c073087e41090e20d50b94f940cfab491e26de21644614ba352e711f55849d21", // This is the operatorKey of the guardian account
    policy: "DemiaTest", // This is the guardian policy that is to be attached
}

// Link parameters for guardian registration
const link_params = {
    username: "Installer",
    password: "test",
}

module.exports = {
    baseUrl, username, password, auth_identifier, announcement, site_id, msg_address,
    registry_params, link_params, createNew
};

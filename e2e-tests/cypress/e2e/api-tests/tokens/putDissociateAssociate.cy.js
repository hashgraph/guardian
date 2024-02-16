//in progress
// import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
// import API from "../../../support/ApiUrls";
//
// context("Tokens",{ tags: '@tokens' }, () => {
//     it("should be able to dissociate and associate token", () => {
//         let username = "Installer";
//         cy.request({
//             method: 'POST',
//             url: API.ApiServer + 'accounts/login',
//             body: {
//                 username: username,
//                 password: 'test'
//             }
//         })
//             .then((response) => {
//                 cy.request({
//                     method: 'POST',
//                     url: API.ApiServer + 'accounts/access-token',
//                     body: {
//                         refreshToken: response.body.refreshToken,
//                     }
//                 })
//                     .then((response) => {
//                         const accessToken = "Bearer " + response.body.accessToken;
//                         let SRDid
//                         let hederaKey
//                         let hederaId
//                         cy.request({
//                             method: 'POST',
//                             url: API.ApiServer + 'accounts/standard-registries/aggregated',
//                             body: {
//                                 username: username,
//                                 password: 'test'
//                             },
//                             headers: {
//                                 accessToken
//                             }
//                         }).then((response) => {
//                             cy.request({
//                                 method: 'POST',
//                                 url: API.ApiServer + 'profiles/push/' + username,
//                                 body: {
//                                     hederaAccountId: hederaId,
//                                     hederaAccountKey: hederaKey,
//                                     parent: SRDid,
//                                     vcDocument: {
//                                         field0: ""
//                                     }
//                                 }
//                             })
//                         })
//                     });
//             });
//     });
// })

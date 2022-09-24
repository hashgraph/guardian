
// context('Policies', () => {
//     const authorization = Cypress.env('authorization');
  
//     it('check returns of the blocks', () => {
//       const urlPolicies = {
//         method: "GET",
//         url: Cypress.env("api_server") + "policies",
//         headers: {
//             authorization,
//         },
//     };
  
//     cy.request(urlPolicies).should((response) => {
//         expect(response.status).to.eq(200);
//         const policyId = response.body[0].id;
//         const blockId = response.body[0].uuid;
    
//       cy.request
//       const url = {
//         method: 'POST',
//         url: Cypress.env('api_server') + 'policies/' + policyId + '/blocks/' + blockId,
//         headers: {
//           authorization,
//         }
//       };
//       cy.request(url)
//         .should((response) => {
//           expect(response.status).to.eq(200)
      
//         })
//     })
//   })
//   })
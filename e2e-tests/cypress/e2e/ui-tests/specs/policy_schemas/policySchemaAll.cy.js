import { AuthenticationPage } from "../../pages/authentication";
import { SchemasPage } from "../../pages/policySchemaPage";
import { PoliciesPage } from "../../pages/policies";

const home = new AuthenticationPage();
const schema = new SchemasPage();
const policies = new PoliciesPage();

describe("Workflow Policy Schemas",  { tags: '@ui' }, () => {
    const policyname =  "policyTest"+ Math.floor(Math.random() * 999);
 
    before(() => {
        cy.viewport(1440, 900);
        home.visit();
        home.login("StandardRegistry");
        // create policy
       policies.openPoliciesTab();
       policies.createPolicyButton();
       policies.fillNewPolicyForm(policyname);
       cy.writeFile('test.env.json', {
        policyname: policyname,
    
      });
       home.logOut("StandardRegistry");
      });
  
   
    it("create Policy schema ", () => {
        var policyschemanameDefault =  "policyschema_create_Default"+ Math.floor(Math.random() * 999);
        var policyschemanameVC =  "policyschema_create_VC"+ Math.floor(Math.random() * 999);
        var policyschemanameEVC =  "policyschema_create_EVC"+ Math.floor(Math.random() * 999);
        cy.viewport(1440, 900);
        home.visit();
        home.login("StandardRegistry");
        schema.openSchemasTab();
        schema.clickPolicySchema();
        schema.verifyButtonsAndHeadersPolicySchema();
        schema.createPolicySchema(policyschemanameDefault,'DEFAULT',policyname);
        schema.createPolicySchema(policyschemanameVC,'VC',policyname);
        schema.createPolicySchema(policyschemanameEVC,'EVC',policyname);
        home.logOut("StandardRegistry");

    });

    it("Edit Policy schema", () => {
        var policyschemaname =  "policyschema_EDIT"+ Math.floor(Math.random() * 999);
        cy.viewport(1440, 900);
        home.visit();
        home.login("StandardRegistry");
        schema.openSchemasTab();
        cy.readFile('test.env.json').then((env) => {
            const pname = env.policyname;
            schema.clickPolicySchema();
            schema.createPolicySchema(policyschemaname,'VC',pname);
          });
          
        schema.editPolicySchema(policyschemaname,'VC');
        home.logOut("StandardRegistry");

    });

    it("Publish Policy Schema", () => {
        var policyschemaname =  "policyschema_publish"+ Math.floor(Math.random() * 999);
        cy.viewport(1440, 900);
        home.visit();
        home.login("StandardRegistry");
        schema.openSchemasTab();
        cy.readFile('test.env.json').then((env) => {
            const pname = env.policyname;
            schema.clickPolicySchema();
            schema.createPolicySchema(policyschemaname,'VC',pname);
          });
          schema.PublishPolicySchema(policyschemaname)
        home.logOut("StandardRegistry");

    });


    it("Delete Policy Schema", () => {
        var policyschemaname =  "policyschema_Delete"+ Math.floor(Math.random() * 999);
        cy.viewport(1440, 900);
        home.visit();
        home.login("StandardRegistry");
        schema.openSchemasTab();
        schema.clickPolicySchema();
        cy.readFile('test.env.json').then((env) => {
            const pname = env.policyname;
          schema.createPolicySchema(policyschemaname,'VC',pname);
          });
          schema.DeletePolicySchema(policyschemaname)
        home.logOut("StandardRegistry");

    });

    it("Import Policy Schema by IPFS", () => {
    
      cy.viewport(1440, 900);
      home.visit();
      home.login("StandardRegistry");
      schema.openSchemasTab();
      schema.clickPolicySchema();
     schema.importSchemaButton();
     schema.importSchemaMessage("1674822599.228034003")
      home.logOut("StandardRegistry");

  });

  it("Import Policy Schema by File", () => {
    
    cy.viewport(1440, 900);
    home.visit();
    home.login("StandardRegistry");
    schema.openSchemasTab();
    schema.clickPolicySchema();
   schema.importSchemaButton();
   schema.importSchemaFile('schemas_1684324834016.schema')
    home.logOut("StandardRegistry");

});

it("Export by File", () => {
  var policyschemaname =  "policyschema_export"+ Math.floor(Math.random() * 999);
  cy.viewport(1440, 900);
  home.visit();
  home.login("StandardRegistry");
  schema.openSchemasTab();
  schema.clickPolicySchema();
  cy.readFile('test.env.json').then((env) => {
           const pname = env.policyname;
             schema.createPolicySchema(policyschemaname,'VC',pname);
          });
          schema.exportSchemaFile(policyschemaname);
  home.logOut("StandardRegistry");

});

it("Compare Policy Schema", () => {
  var policyschemaname1 =  "policyschema_compare1"+ Math.floor(Math.random() * 999);
  var policyschemaname2 =  "policyschema_compare2"+ Math.floor(Math.random() * 999);

  cy.viewport(1440, 900);
  home.visit();
  home.login("StandardRegistry");
  schema.openSchemasTab();
  schema.clickPolicySchema();
  cy.readFile('test.env.json').then((env) => {
           const pname = env.policyname;
            schema.createPolicySchema(policyschemaname1,'VC',pname);
            schema.createPolicySchema(policyschemaname2,'VC',pname);
            cy.reload();
             schema.comparePolicySchema(policyschemaname1,policyschemaname2,pname);
          });
       
  home.logOut("StandardRegistry");

});

   
});

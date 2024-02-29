import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { SchemaValidationPage } from "../../pages/schemavalidationpage";

const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new SchemaValidationPage();


describe("Error Validation on schema fields", () => {

    const errorNumber = 'Please make sure the field contain a valid number value'; // prefix , postfix
    const errorInteger = 'Please make sure the field contain a valid integer value';
    const errorCommmon = "Please make sure the field contain a valid value"; //String , Boolean , Time , Image , Account
    const errorDate = "Please make sure the field contain a valid date value";
    const errorDateTime = "Please make sure the field contain a valid datetime value";
    const errorDuration = "Please make sure the field contain a valid duration value";
    const errorURL = "Please make sure the field contain a valid URL value";
    const errorURI = "Please make sure the field contain a valid URI value";
    const errorEmail = "Please make sure the field contain a valid email address";
    const username = "USER" + Math.floor(Math.random() * 9999);
    const incorrectValueNumber = "StringNumber";
    const incorrectValueInteger = "String686";
    const incorrectValueDate = "7/d/34";
    const incorrectValueDateTime = "7/d/34";
    const incorrectValueDuration = "YUI";
    const incorrectValueURL = ".com";
    const incorrectValueURI = "http//";
    const incorrectEmail = "www@.com";
    const incorrectValue = "NO VALIDATION"

  
    before(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1688062484.609595734");  //required field validation  dummy policy
        policies.openPoliciesTab();
        policies.publishPolicy();
        home.logOut("StandardRegistry")
    });

    it("Error Validation on schema fields", { tags: '@ui' }, () => {
        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup();
        registrant.checkAddEntity();
        registrant.checkErrorcondition('Schematype_Number', errorNumber, incorrectValueNumber, 56);
        registrant.checkErrorcondition('Schematype_Integer', errorInteger, incorrectValueInteger, 90);
        registrant.checkErrorcondition('Schematype_String', errorCommmon, incorrectValue, "string value");
        registrant.checkErrorcondition('Schematype_Boolean', errorCommmon, incorrectValue, true);
        registrant.checkErrorcondition('Schematype_Date', errorDate, incorrectValueDate, "6/1/2023");
        registrant.checkErrorcondition('Schematype_Time', errorCommmon, incorrectValue, "13:45:30");
        registrant.checkErrorcondition('Schematype_DateTime', errorDateTime, incorrectValueDateTime, "6/21/2023, 2:58 AM");
        registrant.checkErrorcondition('Schematype_Duration', errorDuration, incorrectValueDuration, "P1D");
        registrant.checkErrorcondition('Schematype_URL', errorURL, incorrectValueURL, 'http://example.com');
        registrant.checkErrorcondition('Schematype_URI', errorURI, incorrectValueURI, 'http:resource');
        registrant.checkErrorcondition('Schematype_Email', errorEmail, incorrectEmail, 'test@gmail.com');
        registrant.checkErrorcondition('Schematype_Image', errorCommmon, incorrectValue, 'image.png');
        registrant.checkErrorcondition('Schematype_Enum', errorCommmon, incorrectValue, 'ENUM');
        registrant.checkErrorcondition('Schematype_Prefix', errorNumber, incorrectValueNumber, 78);
        registrant.checkErrorcondition('Schematype_Postfix', errorNumber, incorrectValueNumber, 50);
        registrant.checkErrorcondition('Schematype_Account', errorCommmon, incorrectValueNumber, "0.0.67677");
        registrant.submitApplication();
        home.logOut("Registrant");
    });
});

export { };

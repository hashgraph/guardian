import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { SchemaValidationPage } from "../../pages/schemavalidationpage";


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new SchemaValidationPage();


describe("Multiple Value Error Validation", () => {

    const errorTitle = "Please make sure all fields in schema contain a valid value";
    const errorNumber = 'Please make sure all fields contain a valid number value'; // prefix , postfix
    const errorInteger = 'Please make sure all fields contain a valid integer value';
    const errorCommmon = "Please make sure all fields contain a valid value"; //String  , Time , Image , Account
    const errorBoolean ="Please make sure the field contain a valid value"
    const errorDate = "Please make sure all fields contain a valid date value";
    const errorDateTime = "Please make sure all fields contain a valid datetime value";
    const errorDuration = "Please make sure all fields contain a valid duration value";
    const errorURL = "Please make sure all fields contain a valid URL value";
    const errorURI = "Please make sure all fields contain a valid URI value";
    const errorEmail = "Please make sure all fields contain a valid email address";
    const incorrectValueNumber = "FiftySix:FiftyFive";
    const incorrectValueInteger = "1@#:3rrr";
    const incorrectValueDate = "7/d/34:2022/23/233";
    const incorrectValueDateTime = "7/7979/34:787/df3/89";
    const incorrectValueDuration = "YUI:890";
    const incorrectValueURL = ".com:@wrongvalue";
    const incorrectValueURI = "http//:htp:8989";
    const incorrectEmail = "www@.com:4545";
    const incorrectValue = "NO VALIDATION"
    
    before(() => {

        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1688307452.702141220");  //Multiple value  Error field validation   policy
        policies.publishPolicy();
         home.logOut("StandardRegistry")


    });

    it("Multiple Value Error Validation", { tags: '@ui' }, () => {


        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup();
        registrant.checkMultipleInputErrorcondition('Schematype_Number', errorNumber, incorrectValueNumber, 56);
        registrant.checkMultipleInputErrorcondition('Schematype_Integer', errorInteger, incorrectValueInteger, 90);
        registrant.checkMultipleInputErrorcondition('Schematype_String', errorCommmon, incorrectValue, "string value");
        registrant.checkMultipleInputErrorcondition('Schematype_Boolean', errorCommmon, incorrectValue, true);
        registrant.checkMultipleInputErrorcondition('Schematype_Date', errorDate, incorrectValueDate, "6/1/2023");
        registrant.checkMultipleInputErrorcondition('Schematype_Time', errorCommmon, incorrectValue, "13:45:30");
        registrant.checkMultipleInputErrorcondition('Schematype_DateTime', errorDateTime, incorrectValueDateTime, "6/21/2023, 2:58 AM");
        registrant.checkMultipleInputErrorcondition('Schematype_Duration', errorDuration, incorrectValueDuration, "P1D");
        registrant.checkMultipleInputErrorcondition('Schematype_URL', errorURL, incorrectValueURL, 'http://example.com');
        registrant.checkMultipleInputErrorcondition('Schematype_URI', errorURI, incorrectValueURI, 'http:resource');
        registrant.checkMultipleInputErrorcondition('Schematype_Email', errorEmail, incorrectEmail, 'test@gmail.com');
        registrant.checkMultipleInputErrorcondition('Schematype_Image', errorCommmon, incorrectValue, 'image.png');
        registrant.checkMultipleInputErrorcondition('Schematype_Enum', errorCommmon, incorrectValue, 'ENUM');
        registrant.checkMultipleInputErrorcondition('Schematype_Prefix', errorNumber, incorrectValueNumber, 78);
        registrant.checkMultipleInputErrorcondition('Schematype_Postfix', errorNumber, incorrectValueNumber, 50);
        registrant.checkMultipleInputErrorcondition('Schematype_Account', errorCommmon, incorrectValueNumber, "0.0.67677");
        registrant.submitApplication();
        home.logOut("Registrant");
    });
});

export { };

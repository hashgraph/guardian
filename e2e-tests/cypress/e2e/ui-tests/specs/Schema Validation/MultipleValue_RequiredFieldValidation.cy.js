import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { SchemaValidationPage } from "../../pages/schemavalidationpage";


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new SchemaValidationPage();


describe(" Multiple value Required Field Validation", () => {

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
    
    before(() => {

        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1688078390.350129003");  //Multiple value field validation   policy
        policies.publishPolicy();
         home.logOut("StandardRegistry")


    });

    it("Multiple Value Required Field Validation", { tags: '@ui' }, () => {


        home.login("Registrant");
        home.checkSetup("Registrant");
        registrant.createGroup();
        registrant.checkTitleError('Applicant Details', errorTitle);
        registrant.checkMultipleInputrequiredcondition('Schematype_Number', errorNumber, 56);
        registrant.checkMultipleInputrequiredcondition('Schematype_Integer', errorInteger, 90);
        registrant.checkMultipleInputrequiredcondition('Schematype_String', errorCommmon, "string value");
        registrant.checkMultipleInputrequiredcondition('Schematype_Boolean', errorBoolean, true);
        registrant.checkMultipleInputrequiredcondition('Schematype_Date', errorDate, "6/1/2023");
        registrant.checkMultipleInputrequiredcondition('Schematype_Time', errorCommmon, "13:45:30");
        registrant.checkMultipleInputrequiredcondition('Schematype_DateTime', errorDateTime, "6/21/2023, 2:58 AM");
        registrant.checkMultipleInputrequiredcondition('Schematype_Duration', errorDuration, "P1D");
        registrant.checkMultipleInputrequiredcondition('Schematype_URL', errorURL, 'http://example.com');
        registrant.checkMultipleInputrequiredcondition('Schematype_URI', errorURI, 'http:resource');
        registrant.checkMultipleInputrequiredcondition('Schematype_Email', errorEmail, 'test@gmail.com');
        registrant.checkMultipleInputrequiredcondition('Schematype_Image', errorCommmon, 'image.png');
        registrant.checkMultipleInputrequiredcondition('Schematype_Enum', errorCommmon, 'ENUM');
        registrant.checkMultipleInputrequiredcondition('Schematype_Prefix', errorNumber, 78);
        registrant.checkMultipleInputrequiredcondition('Schematype_Postfix', errorNumber, 50);
        registrant.checkMultipleInputrequiredcondition('Schematype_Account', errorCommmon, "0.0.67677");
        registrant.checkTitleErrorRemoved('Applicant Details', errorTitle);
        registrant.submitApplication();
        home.logOut("Registrant");
    });
});

export { };

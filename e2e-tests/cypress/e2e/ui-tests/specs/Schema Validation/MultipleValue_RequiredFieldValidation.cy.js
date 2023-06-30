import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { SchemaValidationPage } from "../../pages/schemavalidationpage";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";
import { slowCypressDown } from 'cypress-slow-down';


const homepage = new HomePage();
const configpage = new ConfigPage();


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new SchemaValidationPage();


describe("Required Field Validation", () => {

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
    const username = "USER" + Math.floor(Math.random() * 9999);
    //slowCypressDown(200);
    before(() => {

        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1688078390.350129003");  //required field validation  dummy policy
        policies.publishPolicy();
         home.logOut("StandardRegistry")

        homepage.createUserAccount(username);
        cy.wait(3000);
        var option = "GENERATE";
        configpage.finishsetupUser("StandardRegistry", username, option);
        configpage.verifyHeaderLabelsOnLoginPageForUser();
        home.logOut(username);

    });

    it("Required Field Validation", { tags: '@ui' }, () => {

var username = 'USER8515'
        home.login1(username, "test123");
        home.checkSetup(username);
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
       // registrant.checkMultipleInputrequiredcondition('Applicant Details', errorTitle);
       // registrant.submitApplication();
        home.logOut(username);
    });
});

export { };

import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { SchemaValidationPage } from "../../pages/schemavalidationpage";


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new SchemaValidationPage();


describe("Required Field Validation", () => {

    const errorTitle = "Please make sure all fields in schema contain a valid value";
    const errorNumber = 'Please make sure the field contain a valid number value'; // prefix , postfix
    const errorInteger = 'Please make sure the field contain a valid integer value';
    const errorCommmon = "Please make sure the field contain a valid value"; //String , Boolean , Time , Image , Account
    const errorDate = "Please make sure the field contain a valid date value";
    const errorDateTime = "Please make sure the field contain a valid datetime value";
    const errorDuration = "Please make sure the field contain a valid duration value";
    const errorURL = "Please make sure the field contain a valid URL value";
    const errorURI = "Please make sure the field contain a valid URI value";
    const errorEmail = "Please make sure the field contain a valid email address";
  
    before(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1688641418.524718524");  //required field validation  dummy policy
        policies.publishPolicy();
         home.logOut("StandardRegistry")
    });

    it("Required Field Validation", { tags: '@ui' }, () => {
        home.login("Registrant")
        home.checkSetup("Registrant");
        registrant.createGroup();
        registrant.checkTitleError('Applicant Details', errorTitle);
        registrant.checkrequiredcondition('Schematype_Number', errorNumber, 56);
        registrant.checkrequiredcondition('Schematype_Integer', errorInteger, 90);
        registrant.checkrequiredcondition('Schematype_String', errorCommmon, "string value");
        registrant.checkrequiredcondition('Schematype_Boolean', errorCommmon, true);
        registrant.checkrequiredcondition('Schematype_Date', errorDate, "6/1/2023");
        registrant.checkrequiredcondition('Schematype_Time', errorCommmon, "13:45:30");
        registrant.checkrequiredcondition('Schematype_DateTime', errorDateTime, "6/21/2023, 2:58 AM");
        registrant.checkrequiredcondition('Schematype_Duration', errorDuration, "P1D");
        registrant.checkrequiredcondition('Schematype_URL', errorURL, 'http://example.com');
        registrant.checkrequiredcondition('Schematype_URI', errorURI, 'http:resource');
        registrant.checkrequiredcondition('Schematype_Email', errorEmail, 'test@gmail.com');
        registrant.checkrequiredcondition('Schematype_Image', errorCommmon, 'image.png');
        registrant.checkrequiredcondition('Schematype_Enum', errorCommmon, 'ENUM');
        registrant.checkrequiredcondition('Schematype_Prefix', errorNumber, 78);
        registrant.checkrequiredcondition('Schematype_Postfix', errorNumber, 50);
        registrant.checkrequiredcondition('Schematype_Account', errorCommmon, "0.0.67677");
        registrant.checkTitleErrorRemoved('Applicant Details', errorTitle);
        registrant.submitApplication();
        home.logOut("Registrant");
    });
});

export { };

# Policy Workflow Step 2

Next, we add specific Actions by clicking on the “Request” button on the top navigation bar.

This creates a new Action Workflow Block with additional fields we can use to define a specific request action.

First, we give this new action the name we want.

We then set the “Default Active” and add “Installer” as permission.

As a next step, we set the “Schema” field through a drop-down based on pre-configured schemas for the document relevant for this policy action request – in our case we select “IRec-Application-Details” as the required data schema for the request.&#x20;

Note - the creation of schemas is a prerequisite to policy creation.

We then set the Id Type using the drop-down, and select “Owner” as the type of identifier used within the Policy Action. This option selects the DID of the document owner as the identifier utilized as the subject in the verifiable credential that is created from this document

Next, we select the “Type” drop-down in the UI box and select “PAGE” indicating that the UI used for this request will be a full UI window. This will open up the Title and Description fields which we will fill in next.

![](https://i.imgur.com/R2bbEjN.png)

**Programmatically this workflow step looks like this:**

```
 "children": [
    //First step after the selection of the INSTALLER roles is to fill out the VC form.
    {
      //"requestVcDocument" - a type of the block which creates a form from the schema, and sends the document to the server.
      "blockType": "requestVcDocument",
      "tag": "add_new_installer_request",
      "defaultActive": true,
      "permissions": [
        "INSTALLER"
      ],
      //"schema" - uuid of the schema, which will be used to build the form.
      "schema": "1a5347ba-5e5f-49a7-8734-3dcc953a03ed",
      //"idType" - when the documents is saved it would automatically get an ID.
      // In this example the document ID would be the DID of the current user.
      // Can be one of these values:
      //   "UUID" - new uuid.
      //   "DID" - new DID.
      //   "OWNER" - DID of the current user.
      "idType": "OWNER",
      "uiMetaData": {
        //"type" - style of the render of the form, one of these values:
        //  "page" - the form is rendered as a page.
        //  "dialog" - displays a button, which opens a dialogue with the form when clicked.
        "type": "page",
        // The page contains title and description, as well as the form.
        "title": "New Installer",
        "description": "Description"
      }
    },
```

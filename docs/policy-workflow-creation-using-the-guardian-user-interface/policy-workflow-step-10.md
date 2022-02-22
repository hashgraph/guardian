# Policy Workflow Step 10

Next, we want to add a documents page to capture the data for a sensor using the “Documents” button in the top navigation bar.

Similar to other Policy Action Steps, we give it a name, select permissions, make it active by default, and give the document a Data Type. Since we are dealing with verifiable credentials, we set this to VC.

Note that the “sensors\_grid” document is directly connected to the “sensors\_page” block as you can see on the left-hand side.

Next, we select the “Schema” for the document, give it a type and ensure that only owners can edit the form by selecting the “Only Own Documents” flag.

Lastly, we add custom fields to the form.

\[When Field 1 is shown]: Note that since we are dealing with verifiable credentials, which have a credential subject according to the W3C standard, and since we are dealing with DIDs as identifiers, the credential subject ID is set to be a DID.

\[When Field 2 is shown]: Note, that when we choose the Type button, we can now determine the Action this button will perform. In our case, it opens a Dialog Box. The Dialog Content is VC since we are again dealing with Verifiable Credentials in this form.

![](https://i.imgur.com/G6cyyUP.png)

Below are screenshots of the UI field inputs

![](https://i.imgur.com/ZHLujkk.png)

***

![](https://i.imgur.com/PSbFR16.png)

***

![](https://i.imgur.com/xRhVGAm.png)

***

![](https://i.imgur.com/JH45eMa.png)

**It'll be easier to see the programmatic example of this workflow step after step 11 is exampled below.**

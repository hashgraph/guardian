# 📱 Mobile operation for the Standard Registry

### **Creation of a new account**

The first adaptation relates to the redesign of the creation of new accounts. This redesign for mobile solves the overflow previously present while still maintaining the descriptions.

Here the images below to show the selection of account type and selection of username and password in order to create a new account.

<figure><img src="../../../.gitbook/assets/2 (6).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/1 (1) (2).png" alt=""><figcaption></figcaption></figure>

### New header for mobile

The header was also adapted for mobile for all types of users. The balance was maintained as one of the elements always present. The new header for mobile, these elements are always present.

<figure><img src="../../../.gitbook/assets/3 (3).png" alt=""><figcaption></figcaption></figure>

The various menus and submenus (in case there are any) have been moved upon clicking on the hamburger menu, presenting the user with the following.

Also some information about the user is also presented, such as the name of the user (in this case "user1234") and his respective Hedera ID and HBar balance.

<figure><img src="../../../.gitbook/assets/5 (3).png" alt=""><figcaption></figcaption></figure>

### Standard Registry first registration into Guardian

Some screens for the Standard Registry were also adapted, starting with the registration into Guardian after creating a username and password and also the mobile adaptation to associate Hedera credentials and initial form upon creating an account.

<figure><img src="../../../.gitbook/assets/12 (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### Standard Registry creating / editing a token

Among the adaptations for the Standard Registry, the creation / edition of a new token was also added.

Below are the images show the creation of a "New Token" form for the Standard Registry.

![](<../../../.gitbook/assets/14 (1) (2).png>) ![](<../../../.gitbook/assets/15 (5).png>)

Here below are the images to show the creation of a "Edit Token" form for the Standard Registry. On the left for a non published and on the right for a published token.

![](<../../../.gitbook/assets/16 (1) (1) (1) (1) (1).png>) ![](<../../../.gitbook/assets/17 (6).png>)

### Standard Registry importing policies flow (from IPFS)

The importing of policies was also adapted from the click on the "Import" button under the "Policies" menu, up until the preview of the policy the User is about to import.

![](<../../../.gitbook/assets/18 (1) (3).png>) ![](<../../../.gitbook/assets/19 (5).png>)

Below you can see the preview of the imported policy

<figure><img src="../../../.gitbook/assets/20 (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

### Standard Registry publishing a draft of a policy

Finally, the publishing of a draft policy, defining its version, was also adapted.

<figure><img src="../../../.gitbook/assets/21.png" alt="" width="284"><figcaption></figcaption></figure>

### Branding

The branding page has been created exclusively for this purpose, that can be accessed only by Standard Registries clicking on the user icon as seen in the following images.

<figure><img src="https://lh6.googleusercontent.com/-wO_IZFVNv9oEWIyrF9XGN7QkeLNwFdD7RP0QEl1JxUsg17uCgKPVIbnqqpPa9ckFWo0B7sa2A6GjwqM7BFsUKPRBAlVlwyCGT41Q6NwSX1OTgBGzaMU8N_voa9LNiOPWEhmlhP0sjGi7ICZLRVtc7Q" alt="" width="375"><figcaption></figcaption></figure>

Once you have clicked on "Branding", you can see the features you can apply to configure the appearance.

<figure><img src="https://lh6.googleusercontent.com/MbhDM5lGIKNpdFPbZIK0iu6SxUIIacxpv77PZLLRdFsnbW7FoaeuXTn4qBJjTGjPdM6MYzslxY8GpgfZNOFiYpE-1umZMdRmzXvKmQ9xTEaNxsR51cnivgG3t_08dT8X8FS1yBUoTlITaHHPas6HEao" alt="" width="563"><figcaption></figcaption></figure>

In this page, besides saving the configuration, it is possible to preview the changes applied, bearing in mind that these would disappear once the page has been reloaded:

<figure><img src="https://lh5.googleusercontent.com/eWTf7Os2okmMUx_Y1PT6IewSnXDOUxoTA5_wggDOJnI7jxNaucoeJ0hxw_sVomHVP2grtcgdx34NqXxeKKUjBl21p3XlWG9OdU6QTthFCRoqdu8s6DKiTMIIXe3NhWXvazaKX-3t-W-_pv0uVHSfOrA" alt="" width="563"><figcaption></figcaption></figure>

Here is the "Preview" of the changes that would be made to the appearance.

<figure><img src="https://lh4.googleusercontent.com/nzUP1J3zqWt09lexNOP7DCfnpcTT0kfrDvyjcW5kQEDDaB4ALB7teTDaSPNNITun7e7Hh8R-hMZe_A2IRc8-JWYCEAZLkk8xNrBrE96Y7MjO6jx9ZqbyqvJ1iJthVLhZK6vO7GAThUbxHTtnUYfsZ7c" alt="" width="563"><figcaption></figcaption></figure>

\\

Upon saving, the changes should be persistent throughout the use of Guardian:

<figure><img src="https://lh3.googleusercontent.com/aJSAgkREpcZkBvOoE4qWUOZKxWfvHLY_mCkM5J_dbaa4SD2nY36xUpgAad2xq5TFwcGvAvgUXGSAsInR2x17gxoAuaN6LPnjpJ9GnGhexmbrg0Uj0YVZiZmV79t8MpGHzUeDpSaGfax3O0N87L4uUJ0" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/X1-PxOyDhRsBSjBH-jubE72K4fj4ZGq1mPElAOvnJcS_PF5jazmT50HYChsKFZXNM0qByJftZVLpR31ZAR4FBbVdwa0gbAiGpODookbOmXFLVRJ4adlP7A0LJiuFfHwCwbnmV-I8aMk511K_G6wHtWk" alt="" width="563"><figcaption></figcaption></figure>

For the persistence of the data, the /branding endpoint was created with both POST and GET requests in order to push and fetch the changes from the Mongo database. It is worth noting that the /branding POST method is restricted to Standard Registries.

In order to reset the changes made to the branding features that came originally with Guardian, simply click the "Reset" button, which can be seen on the top right of the page.

<figure><img src="https://lh4.googleusercontent.com/MyPpGRj5FL-kBgPVL__-tP3TSVH7I2O3fr685xTpPPvP74mpSbr31sOifqNKe4vEvsvlrUvpHmviWuF4a3EbFpGTJ_WEwK5DoawpRGvxbFbmZ7ZyqlKCTrCjGjcE77TWX7o6uYgdU3nn5irtRcCxXLI" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/R0lN9zzpNYbYwXPj1gcTsuWMgdztkMsIikFX9eTCEy2AEb4UcPVgDnDp85Fwj9w-nWLvWD0uJ5UhBnmlbrJ2I-gRDUUzfkAP11ksUxJK_RWldZrzhKy_WKRAXQt5Rv3rcgAc3mj3D-KOEIZ8O_IQr6k" alt="" width="563"><figcaption></figcaption></figure>

\\

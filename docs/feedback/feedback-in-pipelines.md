# Feedback in Pipelines

Here are some examples of rules and processes that can be created for receiving and ingesting user feedback in the Hedera Guardian application.

## Examples of Rules and Processes when receiving feedback

### Define feedback channels

Define the channels through which users can provide feedback, such as email, chatbot, in-app feedback forms, social media, or any other channels that are relevant to Hedera Guardian application.

Feedback forms are better ways to collect feedback. Here are some of the key benefits of implementing feedback forms for collecting feedback:

* **Ease of use:** Feedback forms are easy to use for customers, as they don't require any special knowledge or technical skills. Users can simply fill out the form and submit it, making the process simple and streamlined.
* **Consistency:** Feedback forms provide a consistent way to collect feedback, ensuring that all responses are organized and structured in the same way. This makes it easier to analyze the feedback and identify common themes or issues.
* **Efficiency:** Collecting feedback through a form is often more efficient than other methods, such as phone or email. It allows customers to provide feedback at their own convenience, without the need for real-time interaction with a customer support representative.
* **Accuracy:** Feedback forms can help to ensure that the feedback received is accurate and complete. The form can include specific questions and prompts to guide users in providing detailed and specific feedback, reducing the risk of misunderstandings or incomplete information.
* **Data analysis:** Feedback forms can be easily analyzed using automated tools and software, allowing businesses to quickly identify patterns and trends in customer feedback. This can help businesses to make data-driven decisions and improve their products or services.

Overall, implementing feedback forms is an effective way to collect and analyze feedback, providing valuable insights into the needs and preferences of customers.

2. **JotForm** is better suited for the Guardian application system, because it is a cloud-based form builder that allows users to create custom forms for a variety of purposes, including collecting feedback. Here is how it works:
   * **Creating a form:** Users can choose from a variety of pre-designed templates or start from scratch to create their own custom form. They can add different form fields, such as multiple-choice questions, text fields, and rating scales, and customize the form's design to match their branding.
   * **Sharing the form:** Once the form is created, users can share it with their audience through different methods, such as embedding it on their website, sending a link via email, or sharing it on social media.
   * **Collecting responses:** As users' audience fills out the form, JotForm collects the responses in a centralized location. Users can view the responses in real-time and analyze the data using JotForm's built-in reporting and analytics tools.
   * **Integrating with other tools:** JotForm integrates with a variety of other tools, such as **Google Sheets**, **Salesforce**, and **Mailchimp**, making it easy for users to automate their feedback collection and follow-up processes.

Link to illustration video : [https://www.youtube.com/watch?v=VwC6g5Ym0RQ](https://www.youtube.com/watch?v=VwC6g5Ym0RQ)

Overall, JotForm provides a user-friendly and customizable solution for collecting feedback, with robust reporting and integrations to help users make the most of their feedback data.

### Establish feedback guidelines

Establish guidelines for users to follow when providing feedback, such as being clear and specific about the issue, providing steps to reproduce it, and avoiding profanity or inappropriate language.

Here are the model guidelines for Hedera Guardian application.

_At Hedera Guardian, we value your feedback and strive to continuously improve our application. To ensure that your feedback is actionable and can help us make meaningful changes, we ask that you follow these guidelines when submitting feedback:_

* _**Be clear and specific:** When submitting feedback, please be as clear and specific as possible about the issue you're experiencing or the feature you'd like to see. This helps us understand the problem or request and determine the best course of action._
* _**Provide steps to reproduce:** If you're experiencing a bug or issue, please provide clear and concise steps to reproduce it. This helps us identify the root cause of the issue and work towards a resolution._
* _**Avoid profanity or inappropriate language:** We want to create a positive and respectful community for everyone using our application. Please refrain from using profanity or inappropriate language when submitting feedback._
* _**Be constructive:** Feedback is most valuable when it's constructive and offers suggestions for improvement. Please provide actionable and specific suggestions for how we can improve the application._
* _**Include relevant details:** If applicable, please include relevant details such as the version of the application you're using, the device you're using, and any error messages you're receiving._

_By following these guidelines, you can help us improve Hedera Guardian and provide a better experience for all users. Thank you for your feedback and support._

### Categorize feedback

Develop a taxonomy for categorizing feedback based on the type, severity, and source of the feedback. This can help in prioritizing feedback and identifying areas that require immediate attention.

Give users the option of selecting a category or tag when they submit feedback. For example, tags could be "bug report," "feature request," or "general feedback."

For Hedera Guardian application, here's a possible taxonomy for categorizing feedback based on type, severity, and source:

**Type:**

* _**Bug report:** Feedback that identifies a problem or issue with the application._
* _**Feature request:** Feedback that suggests a new feature or improvement to an existing feature._
* _**General feedback:** Feedback that does not fit into the other categories._

**Severity:**

* _**Critical:** Feedback that identifies a severe problem that prevents the user from using the application._
* _**Major:** Feedback that identifies a significant problem that affects the user experience but does not prevent usage._
* _**Minor:** Feedback that identifies a minor problem or a suggestion for improvement that does not significantly impact the user experience._

**Source:**

* _**User feedback:** Feedback submitted by users of the application._
* _**Internal feedback:** Feedback from internal stakeholders such as developers, testers, or project managers._
* _**Customer support feedback:** Feedback received through customer support interactions._

_**Security:**_

* _Feedback related to security vulnerabilities or concerns._

_**Performance:**_

* _Feedback related to the speed or efficiency of the application._

_**User interface:**_

* _Feedback related to the visual design or usability of the application._

_**Integrations:**_

* _Feedback related to the integration of the application with other tools or systems._

_**Documentation:**_

* _Feedback related to the documentation or help resources for the application._

**Note**: When collecting feedback, users should be prompted to select the appropriate category or tag to help prioritize and route the feedback to the appropriate team or individual for review and action.

### Set up a feedback tracking system

Use a ticketing system to capture and organize user feedback. Assign each feedback item a unique ID and track its status throughout the feedback pipeline.

Here is an example of how to set up a feedback-tracking system for Hedera Guardian application:

* **Choose a feedback-tracking tool:** There are many feedback-tracking tools available such as Trello, Asana, Jira, etc. But for the Hedera Guardian application Trello is recommend since it is very simple to learn and particularly, operate.
* **Create a feedback board:** Create a board or a project in the feedback-tracking tool Trello and set it up with the necessary columns such as "To Do," "In Progress," "Completed," etc.
* **Add categories or tags:** Add categories or tags to the feedback board to help categorize the feedback. As mentioned earlier, tags could be "bug report," "feature request," or "general feedback," or other categories relevant to your project.
* **Link feedback submission form (JotForm) to the feedback board:** Link the feedback submission form to the feedback board using the tool's integration options. For example, if you are using Trello, you can use the Trello Power-Up to link the form to the board. Here is the [link](https://www.jotform.com/help/454-using-the-jotform-power-up-in-trello/) to refer to the Trello board integration with JotForm.

### Assign feedback ownership

After the Trello board has been set up, assign ownership of feedback to specific team members or departments, such as product management or development, to ensure that feedback is acted upon in a timely manner.

### Prioritize feedback

Prioritize feedback based on its severity, frequency, and impact on the user experience and your business goals. This can help in identifying critical issues that require immediate attention.

### Monitor feedback progress

Monitor the progress of feedback items in the feedback board. Make sure that feedback items are moving through the columns and that team members are taking appropriate actions.

### Close feedback items

When a feedback item is resolved, close it in the feedback board. This will help keep the board clean and ensure that team members are focused on active feedback items.

### Analyze feedback trends

Use the feedback board to analyze feedback trends. Look for common themes in feedback items and use this information to prioritize future development efforts.

### Provide feedback to users

Keep users informed about the progress of their feedback items. Send them regular updates on the status of their feedback and let them know when it has been resolved.

By creating the above rules and processes, it can be ensured that user feedback is collected, categorized, and acted upon in a timely and efficient manner, leading to a better user experience for the Guardian application.

## Implementation

### **JotForm Account Setup**

Step 1 :Create a profile on JotForm website and Login

[https://www.jotform.com/](https://www.jotform.com/)

<figure><img src="https://lh4.googleusercontent.com/SK0lhArjvSYTjxPhTAY_L2n8vMVKBor-q2dkffIMMkvidyscBDmuOqS1K1DnR4BOo8D1T-J4v3ECLyaHJRJ2GEeUrfucT5uBgxvekE7AJJEZ3An8MJqEYwnxmR1BpL6g99mq4WgQAaKgegXxKAbV2Os" alt=""><figcaption></figcaption></figure>

Step 2: Click on "Create Form"

<figure><img src="https://lh3.googleusercontent.com/05NuIc32gC9BwbmVJ-YHM9AXAbgtFpE0mm4imDedFD9CDvT1p-xb7RYvIIzyVZE4QkB0e3mOvY_999d3QdZH1b-wOBU-A0e4JbIhxhxYk8RbnIY-3FQ3r8XcJ6s_MM_S0vMX2ZZeOHcSbuE8WLEEPJA" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/rVKNBk6u8ARUlVYrHBdbQR96N75pj9p0uz0sGRhIbDdIqDEbfrtw4XsmP4qDH84VyTCqwHagC10rnH4m60QTZC4TJF4Y9a-Scb5PSQnWb11tnMPROJ7--WilH8ojUtjNokcbykjB5XefaLF3WDYPBzU" alt=""><figcaption></figcaption></figure>

\
Step 3: Click on (Start from Scratch)

<figure><img src="https://lh6.googleusercontent.com/KjxdYaK6b323y3oaDIAwGvAGZDKTj3i6ax7LDXF9Jstd1rdSDwPVQcoiQoSYwwL6bH67LvvTpMA-o-kKBOnZpSGPyJbU4mOZkleqfCgOn9E4CzrncbZ6FvJn3Ge98fv8s7VBTOCUmGismzqJuQNDzGk" alt=""><figcaption></figcaption></figure>

Step 4: Select form Layout ( Classic Form )

<figure><img src="https://lh4.googleusercontent.com/8e-7fh2SLJzKTOjaj__4pQT-VaPqjjlo-Jc8SBSd3c-9MM1cihlpaM0SfCStrw0DZb1sklCODCFjFkbR52F0Iskl7BWtn8D0RqWi2AcPoxfBYwAyOTkvOQBhecKBvlz2oLE-_CCKM4tT0QsaanMHAW4" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/SY2bDp4v7nOxvsINQim7X0uX-D-SmA5TALm1VljqPy4E0Jw6FZt4IFJgwYLVRLe0zP7ucKVebI33NwKu2gEONi6HA5U76nmp5ubCUqKRvEvUVvfBxrRCwiGrbQ4I4Is1RaoA9vVACRUruhSiX5A2JnQ" alt=""><figcaption></figcaption></figure>

Step 5: Add a logo for your organization

<figure><img src="https://lh6.googleusercontent.com/jRKg-ApAD9uq1p0DKx-79ptU1FmoC6mM4B5SX3xre_BHQ9R67bKBIAYuhGe5HVHoPB8pHwz2gP7lx3SmhDA9YKVV8l8-SV49lBkHXIH7ZvhUCPpXg8mtvEQ5UxIYXuC9Bh7q5JksVd5yMEOQnGjch24" alt=""><figcaption></figcaption></figure>

Step 6: Update the “Form” object to create a form heading

<figure><img src="https://lh4.googleusercontent.com/3v2egcUu_zDTgStE0k9YctDAndMsjLSoZPfodM55Wts5C41Xy_U101W3L0i_mqfG2u8kKDoqGAPAxnSme0ApfUU5YMGNdYKDkKZsd-_6QIZvge6qqfgFhYZAgrdOyE6LmFd5-reBoCiD_XYr-pM5nHQ" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/d0_dyKBp-KSjbJoPJ4UXPsaDK770AKdqiJrhgCT02PGRmnr1oyXpZ2aO4rioP5evnJ23Lg_cpuyUgRQ9HW0937PrwNjfvKfj9y453V4-ZcGty2iAUQpKZaMQ3ymQ3U2R3DkPZIZ_VamHzrIclnVe9GM" alt=""><figcaption></figcaption></figure>

Step 7: Add different objects on your form by selecting from the options on the left hand side panel

<figure><img src="https://lh5.googleusercontent.com/WueJnYOg8WMjpxc8qWNpK4hwmK59kGdQqiNliL6hjecjSQvbCFwRT61WtV9zCpLoeBxVTDvdQD_EGMjEOXV-KOs_Zi7joe_UUyQLJQimwnPMjVc0G194ns62UVL7d6UNeCYtAjFlPk3FWkT6eUemfjo" alt=""><figcaption></figcaption></figure>

\


<figure><img src="https://lh3.googleusercontent.com/yGEMzi41dB-Qll_vtU0Xb2Ik7Kevn2x4jh6HWwGDaGuvs6vlZKpJxVrfAgksdzk27_LJ9StzvWwvZbitrq0c9FjelkHtSiuCaA2bpToFxdYDiTKOiMgmX8OnTuC8hpvXFzaeOWKAjP7VE-4npU4uKjU" alt="" width="375"><figcaption></figcaption></figure>

Eventually the form should look like this

<figure><img src="https://lh4.googleusercontent.com/8uy3i8oXr1PuqFsVDEtrqwqijuV2M88xEWDZi4AxR_eS1G-49uAE3RxjKsyATsyVd7d1JbX7n2a--_egcepWH1WwQQTiid0ZpT6U4FiSicQI29wmAInxGy8pBsI2C73J3B7ARWvgmYehssGl-d7taHE" alt="" width="375"><figcaption></figcaption></figure>

Note : A more HGF specific form should look like [this](https://docs.google.com/document/d/1SQsy9\_XiIY0mhawKGwINOd192lBnfq6B13oEiPympH8/edit#heading=h.8fig23olbuye)

Step 8 : Publish the form

<figure><img src="https://lh4.googleusercontent.com/OZZTmzGiV-3dSjIL6yOREO9hlD-i3_TGEeg6COqT2DIs1-FowJedNeopT11UBijxkVNdeoltYpYl01WRf-DU6o_X9kbuwuWdvXfXUKZaDgPCynSNtS8388dxDjMBBg-NP8r6rR9JjJjrDt9HT5sSZLw" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/wm0LLMjkUFs4e8buElAPZO2znLCBAakyQPFZGD5wWjQKxI4dEHARHL0qek6NsTOguLaUFQVzvM97OEsGp7-R7kGRUYqlBOyJH6D1XgMoj43qV4pQHk3o24Ys2iJ18SsEICsQAz8eeBAGMFkd3g_AkuY" alt=""><figcaption></figcaption></figure>

\\

COPY LINK will give you the following url https://form.jotform.com/231232735256452

Note : This link can be placed on the Guardian application’s home page using a button or a link.

Step 9: Access the form by pasting the above url in the browser, and then populate & submit the form.

<figure><img src="https://lh5.googleusercontent.com/RInwiTe-y7MuORECeFwX1BNKdOfhVwN19jZ2HJ2dv53P1P3OQKt1TlTiqnOxD-DRSIW2QiObXqciAEyHMi9ENx_phPdMFIeTIDjx8UKVz4m80SeEzuU4pM0ie-cPwqwm_8y3pnHuIajuc3uAW2DppcY" alt=""><figcaption></figcaption></figure>

The above submission will send an email to the recipient.

<figure><img src="https://lh6.googleusercontent.com/FH7Z8EB0catupQsK6fqpjQw4JgJbKErfy15nLLEYb_cFXJ0Ro5H62401vFfcDcwVXhQ72SpsIhBIaFgK7kYZGep5AOzbkRymAdq0Jk1AuZV093UjNDQxKANzo7b-mgJ55BZ8zMz8YcVrgT8xjNda4Hk" alt=""><figcaption></figcaption></figure>

The above submission will ALSO send an email to the sender..

<figure><img src="https://lh6.googleusercontent.com/ZOYGX2iXGGOqi-wkq5LFcD2pa0MJouUD5y3HbtN9FqH0ujw69CKHI1VFw6JinUMEcZKPXbh7Xkj_VeU5S4BCA5AupeWkcJwa-UhWd47APhxYTTVJHNzXltA3IoX9MBfnT2YRpGQRRIko9iNSirSjADU" alt=""><figcaption></figcaption></figure>

Step 10: Check and verify the submitted data- Method 1

![](https://lh3.googleusercontent.com/WxGqwoNGrv\_TBiHXe5me2kkbZ\_ValJxoA5MjnqEbTV03YV0VZfQKIvUeOFwrpO-DFUL07YEKidttyWk0LwKMbwKNVsq8UyOzSY1T-0aMyMTRzu8huGRXT7Y\_Wv0KT\_8zcNk4XI04EHqapwkZhIKcT20)

<figure><img src="https://lh5.googleusercontent.com/Pc5Hli18gI4TPmP-jUXfawoRc4u8foTW_vMEPCpbD1btYE8nu5ovhYuDtXHqYgIbtZ9XQD9CPwym99D19gmx2bDcTQLtdduWVWRJ-Cgi62LgKJWh8XFS0DK0qrGXpVjRQM6dHcZN6b4yQ2p5D_IWOXA" alt=""><figcaption></figcaption></figure>

\
\\

Step 11:Check and verify the submitted data- Method2

<figure><img src="https://lh4.googleusercontent.com/9wFBS4yrzfFCer1nRfJ9uTBoWROqoTcLPeJiSITdMv1xwgwltmlU9BShmSVQaNrIEUhal9g4JCqdJ0w_vwoca8JOCjrVqLCwPkmY4BYUH_Nfe89ygXZZeeJFZT6N4d7Qr4QuAFQSKxLotIfa4pITpC4" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/t5-6zWFIXjo-BRG1_lh_MVBfFJ9jmjH3e7GdAOlgsLEhAXO74j0iOz9G4vGHtJ6q7r2Kyr72XNKoXrTN2NzUIRBRGg02g6OuS5_qJ2Rp0HL1H3OoO5rdTO9lEBFvMKzjz3tj-W7UI8D3R1Ippu0y6F4" alt=""><figcaption></figcaption></figure>

### Trello Account Setup

Step 1 :Create a profile on Trello website and Login. Here's a step-by-step guide to creating a profile on the Trello website: [https://www.trello.com/](https://www.trello.com/)

#### Create Trello User Profile

\
1\. Open your web browser and go to the Trello website (https://trello.com).

2\. Click on the "Sign Up" or “Get Trello for free” button in the upper right corner of the screen.

<figure><img src="https://lh4.googleusercontent.com/pX6FNE0y-zHA6m45FsBTTvtvrFeMm8QxAxtFyKN8BmRmQ1onS1PiCpc43CkTfg2fbUuYws7tDOJddSM1VXmUkasKI7whFLBzHemDlclqgKX0LCezTJNMPs1mAcBjUDbVGrJgfjZWILeYwCrTUh5GN68" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/gxqnd8Vlcq6CLQEtctGzKTjmojAssok7Bq90kgOz0nHlvsS277pJqsUN9shYuSFoGKS_JjMJAvMV8J-bIWj6JVFllNlP1JgEiB61M7mHTHqlgSp4gbdIKfL4vHimgkPOI6uCAK8Z_w3ju0CrLbk93Hg" alt=""><figcaption></figcaption></figure>

Step 3: You will be prompted to create your account using a number of options. Select one of them to continue.

Step 4. Trello will send you a confirmation email to the email address you provided. Check your inbox and click on the confirmation link in the email to verify your account.

Step 5. Once your account is verified, you will be redirected to the Trello website. You can now start using Trello to create boards, lists, cards, and collaborate with others.

#### Create Trello Workspace

Step 1: After signing in to your account, create a "Workspace"

<figure><img src="https://lh3.googleusercontent.com/n0-BnVMukE672oHANJBQWrN8hctVbN_GZax7q6aiG83_QfQk-LzHj9EshVHk3JteKOak95kSBS2dU79KwIXU4aEXF2CMe7DgTospBmVU_T_rYSe3mfVGlT6c2rQOl5LMLQwalhIXFJ6cU100aGlI8Z0" alt=""><figcaption></figcaption></figure>

Step 2: Enter a name for your new Workspace, and choose the Workspace type.

<figure><img src="https://lh5.googleusercontent.com/cedfi5J8jtteX8yq0xfQ3dI28qn2Sqq25r-DXwf3OXiqg-xrIBO2NfaDR4CK2QdPF8mlD2cdNweFwYeUBjwdxXY5d6NleKdx6Rwa777RiTSMG72xKpyOWeC43ZwCWbxSWZ3a1OJKs6KC30PQ6CW0zf4" alt=""><figcaption></figcaption></figure>

Step 3: Click on the "Continue" button to create the Workspace.

Step 4: Once your Workspace is created, you can invite members to join it, create boards, lists, and cards, and start collaborating with your team.

<figure><img src="https://lh5.googleusercontent.com/MlcJ9X1aHQwEyQv8UBk0jG_BveZDW0BKjeJdiMPFbPMQDATMv5eB93N2YeTySU5_gwzkAWOu8PkmtYQnr0sfo2OriiVsSe3k-PW_vozliQUUY90j3lSJiu8OKOSW7yUZ-ENoJqh70Av4MPoquEWq2ck" alt="" width="563"><figcaption></figcaption></figure>

#### Create Trello Board

Step 1: Click on the “Board” button displayed under a Workspace in the Trello interface.

<figure><img src="https://lh5.googleusercontent.com/onYnlq9vGtREYeH-AL-l3EUyugIMTqc2X4OV11wTgRivwLzExwCkCWWbSwx_zv_Q8D4bcwzYWPb7ysLJyiWuSvxPcTcE5xItmkVkbEvfcI-n_nPSD-eJNCjtyg6ZkyYLZTkWYzVfAaSq2J0XPY16CsU" alt=""><figcaption></figcaption></figure>

Step 2: Click on “Create Your First Board”.

<figure><img src="https://lh5.googleusercontent.com/Up9JktoYRsiFD_28A4Xv_WwCRsCTapO5ljv9KfoYRIleGRMu9w3d1Z6p2SuqPubywRqdmxhRYvZNtHcA4fuJwXYHjTaNy9tgWPC1d8ahQwtwjLmmQ2y7L5zImF2BcKOHCp1Mi0G_9f2GvA-b0T6DfK4" alt=""><figcaption></figcaption></figure>

Step 3: Enter a name for your new board and click on the “Create” button.

<figure><img src="https://lh3.googleusercontent.com/44xpifBLFRcaGaXML6ATtFCgCkENQ_2I_KpKNqsmHjdqYcGWBr_QzcI8It1663dtSTesB_CdFdTdkaGabOvvo5ACW5gMveGqlYWXkZEzWmaQNsbScHONVJwjhM_IJAQ6R3O0JJdhXgo7IlLMEwyXtmQ" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/oFL2L9H_BRSrpeZb8GbucGK62fJ6qR0gE4F5uwJVlaN3JnZV0W3aa89iLQpysHq_Obsr-O2IPzTY8ImTFIrPQrmYcqNBx6ueJKbgic-0XHDh_T5PnlArzDslfK0MrbNoa42npPbWpY9i4HJ3tYJaNMM" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/8bE41ziNxaCD1egFMt7Tiky3zTxMRvQpBJc5nc2SlQjkWgBCN5HSmECM7vWUQuslBxVqn_PZ2Ybv1eAlvXuaZNLh1b0onqCAKWKak17-nmS45xNytZl4Gzp-4E6eHEdONXoxicK-726u7S8df0XCEd4" alt=""><figcaption></figcaption></figure>

#### Create Tags

Step 1: Create tags like "bug report," "feature request," or "general feedback," or other categories relevant to your project.

<figure><img src="https://lh4.googleusercontent.com/XUzzfp0cpFZWQEi6oRMgna5OPrmvqWpSMP90PVzO8OvKpZVzMGW0sPd3-JG7DZGiJvvfvVYAAv7S4SuGja1XcRW77kiZjn6NRDiTc7ME_Ut90cyFPcNTkewl9PlYE4tzzbmSECXKv7tAqcseGfVl8Lc" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/rMsdCoGhrdbzeMs1eZkPdySxNGx1ofRzAdFHlqRiGuT6rju1NoTpXB_pbaUOuXhughTXQClaaUon2geaYX-KIrpZve8z3b5KmeFQWx_OW6g7Xv_KkOtlyUiPBTXp-revGq6v1RMtXB67twwZt-_T9Xc" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/jzZU7vBPk9Ga-csBSMeehIqRFlez2sr5uWDFviBYiFoICUPWsA4MPXUfw1nbLg3wWpRxxtWSSA3i-PgEMXIuzipRwbdkXzAiWWkbiJ4qwsUTcuMSj87tBSkcYCmMMDrrQjesOBNI_GjdTCcaqEJMyZE" alt=""><figcaption></figcaption></figure>

Step 2: Add categories or tags to the feedback board to help categorize the feedback.

<figure><img src="https://lh3.googleusercontent.com/z_uyXmElYI4XvlbElv1yQ55ciTMNKxNzBJ9a1aZaKFA9fxnql9gMq6PvQywsLlAB3vBXkLdAY8WgiSUkBLYa3Y3Je97HDL-J6ktloU8MWg0NMgXtniE5ArNk_m9E_VIP82neUDM48OfkfJR3cWW3qAk" alt=""><figcaption></figcaption></figure>

### JotForm and Trello Integration

Integrating JotForm with Trello can be a useful way to streamline your workflow and keep your team organized. Here is the summary of steps to do it, which we will elaborate in connection with the Hedera Guardian application.

Step 1: First, you need to have a JotForm account and a Trello account. If you don't have one, sign up for both.

Step 2: In JotForm, go to the form that you want to integrate with Trello. Click on the "Settings" button in the top menu, and then select "Integrations".

<figure><img src="https://lh5.googleusercontent.com/oTc7RGnsnClhwa-6MTsVDPeDQ4ZH2RAX-EmAb-cHOxmR41Pk4-fBayoe2MvOgPaikR1P8fjWutfBEiWy59BcFPx3wx1bv8ytIITl1mwNuDjTmQSoYs2s11jqoUR-d2eyTgEyP04-mTGcFeYkMV5OqmU" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/pEZex4szKwb3MXBFzvq8VYTpnaeyyeVopmOOW_Nsnlb7xbYYQWXdaNHEUzOamyme47rjhEccZU72sikg0ncgS9Ht26xcqjNcwhmlYw5tT7aIov1Xnw1BA2xo1tSn8b9bkBugHkP5vPSiFdeT1il5VJk" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/Gw_ayHEexICLQDmPkmHI9r2wG502pxjL13nZ4TVHdf7Lx6r8DrNEEU6gko-tQ-ot3iLBtNo8K5dDEEAgacjGRqLrQgLvLS0uZg2BYF6cKfxvnOU17v_v66iWI5ubhjng2o-5dV5nUi-7ZlFYSkf15Zg" alt=""><figcaption></figcaption></figure>

Step 3: In the Integrations menu, look for the Trello icon and click on it. Then, click the "Authenticate" button.

<figure><img src="https://lh5.googleusercontent.com/NZ_WRdzGuHTNfMcH2EkNvBBNB9MGwhdeMGarSZOvKoiEmUCGEbUOQ_FPl8v3cLxFlsrvCYhlVvcVe9TO2HxlMrxDQ47ogEulNkUg6DxSDSolp7dlTiR7FMDqw9Mlh1QQnDyXYNSAF7dnTwomvBXd2Kw" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/A7QfcfsfDtrz6FksNwLTq2irvEZ-3OWGbU_OJTm4hOHgoYIndsw1NAHVbV1i1YkTeF7DMeyivwVyK_oMzV8acQcoYfk1ViFOebikYUmmMeMXA2ZkXjGVDig3-mf0mj6UA0uxKHSuCdglWLugxLUHNn4" alt=""><figcaption></figcaption></figure>

\
Step 4: A popup page will open in a separate window asking to check if you want to give Trello access to JotForm. Click on the “Allow” button.

<figure><img src="https://lh6.googleusercontent.com/WJofXjlnkHEupoAcVgxyYX64N-vw2ZbtAPJqVT2KYP5_p4cqCukuShpZBIrIT7Cdi_uh9n4Rrf_mRueDKRYfbKrA-s0krHKIMWCGUEkQkvop4R7tZdk_nj8T69RXt8ZutO3fMXOW-R5_1eEvcUSnzQY" alt="" width="375"><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/PlG6j8lH_WWDkH11Fl0ctmBRySbSy01-zwhhES5bvyssLfX1SsrxgFRcJTtCjqDw0iuptRQ2Zlfjvdl1-LWRgvmiux-v7GlIlla460O8aMKuymd_v6zyveMKw3Rp479DAlb0gg2eCc4nMkOvgMOzTWU" alt="" width="375"><figcaption></figcaption></figure>

Step 5: Select what type of integration you want, a.Create Card or b.Update Card. Select ”Create Card”.

<figure><img src="https://lh3.googleusercontent.com/_MN-mcQ8gC4TV5i0zmuYeSJJXwOgeOFEj0BeawwBYZDYIWvLaZdRjUeRcTDZLzcm6uUqLn50gU8YCdZMlY1pzZE9VMq7A1PojwbPM3BBZWp5FvK9VYA38AZpdKSNyN__8VzKFk0C3_RJcd2YMCsdI6s" alt=""><figcaption></figcaption></figure>

Step 6: Select the board to which you want to create the card. Since it has integrated with Trello hence will show the list of Boards from Trello. Select “HGF\_BOARD” board.

<figure><img src="https://lh6.googleusercontent.com/LUmQdN3OTLp2oGS7DiWrfcBRp8CMkXtLpKAUS85MfkHh5kFscngSsAuC771a2rzx8kqii_VtAGVaDwQ0Xzi5lac-RLn6fCVcy6a52wKuVFhFfPfB33oTQ-J-adfZsYeCESP_9tvNj0rgaqXnQTGqwM0" alt=""><figcaption></figcaption></figure>

Step 7: Select a list from this board. Choose “To Do”

<figure><img src="https://lh4.googleusercontent.com/ghsxSRk9cs-AVrIELyEcmzTlhY1w1DyNKDQyFzv75b09Yu4RhCHLeYHvLc_zWVZysnQvgC9D8AHVrkS7N3boEJqiN_IVDRzigqXAF1i1Rfe0C-ixQZ1i47jI_cc1E9TlfxK1d-PWJrilCD7QOLwWCRQ" alt=""><figcaption></figcaption></figure>

Step 8: Enter the field matching between JotForm and Trello. Finally click on “COMPLETE INTEGRATION”

<figure><img src="https://lh3.googleusercontent.com/OhN4K06Imm1B_nWssCGatwl_dqxuMzyYRPP3PMC2ftVF42HzLex242HHgC3FomholN9GteYacp339dHAlUJ6ebYCr4WC4K7S4nIX3trv_5JSCD2h6M9XPq4Xm-rvDbiiFSX8iXxQkw97k47cibqdvoY" alt=""><figcaption></figcaption></figure>

Step 8: Click on “FINISH” button to complete the integration process.

<figure><img src="https://lh3.googleusercontent.com/3aii7UeLFrzj6J00LNeGOGTTsX-XGdE7n0XL_lyKs2X8hTgw-XvDsYUaYpD25zB_7iI_ensUBt5w4SLqQwN6iA4Z9B7FJKM97qgXdv36qAvl8Zib7ktucbC9RAvm6SmuVhcpE4SLl5vxC_IT_p_2K8A" alt=""><figcaption></figcaption></figure>

#### Test the integration

Step 1: Fill in the feedback form at [https://form.jotform.com/231232735256452](https://form.jotform.com/231232735256452) and submit.

<figure><img src="https://lh5.googleusercontent.com/tv_GvbweRbEbcorFh8DcOZ2gllqbEosmTu1UGzEcF95ZuhVBxOZzYFYX7N-lVvp9LEP8PbgawqBRElBobibie85G2K1-SZsELEX0XNjfdG8TW4v_durD7msKd6-u9nBFBi0-lgF-4YUgkW4jcsCEX3U" alt="" width="375"><figcaption></figcaption></figure>

Check the Trello board. There should be an entry done via integration.

<figure><img src="https://lh4.googleusercontent.com/P2TGunEM-3voJbvremSGMTFSM3E0TFXSnVdXH8plY1AkNXiqA4y-76zdaf8JpnbNtrOcSvch42GRzgBszmouvt3Tk5SCYgk2s4-0v6aHJFh6l8WF_2OC0pWhjWIkcN8ZxjQwVBKNjUNO0GLHtljge3A" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/LVrtvClTHYVdapm-Pmc6LS5HJwwAaITRGaiugmLwOWFENSDZWPI-hOFA3VYsN6FtepX_A66_XJB5ar3wk_s53ITEdJmgfouSrcY4yNLLtVQrY-VpAcPEpw0yVgxx_hBPBIH0FgcMCF57i3ax6BG3lk4" alt=""><figcaption></figcaption></figure>

Now, when someone submits the form, a new card will be automatically created in Trello with all the form data. This can help you keep track of form submissions and assign tasks to team members.

### MonkeyLearn Account Setup

Step 1 :Create a profile on MonkeyLearn website and Login. Here's a step-by-step guide to creating a profile on the MonkeyLearn website: [https://monkeylearn.com/](https://monkeylearn.com/)

<figure><img src="https://lh4.googleusercontent.com/2Y0qlKMAv0UL-MkijTfzb-CBBXFWKBcAdv3RLtgU5cBUIJyF0o2DOSq9BEWyeEdiR29GbcbzctP3l6V3qQbZfWdu-d4-WaavyH4-PilEfeYsjhgdKwMlS_0AgeI8stvGm94293jXRyWayMwPfQ-4aIA" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/KsRTaZc3CSDgsoacli2NyQwQZaM9raRsN2cUbNlD-b06r-cK-3G9qieCsZN9yVSZilbCL267_wx46Vy_nNE7rUu6lOZNU3IhPCZVVG3oGhTB7AR6Pmxas-mWWILJOOkHMxygUdG-pxtId_OdYEWQmyQ" alt="" width="375"><figcaption></figcaption></figure>

Note : We have selected “Other” because there was no option to select “Feedback”.

<figure><img src="https://lh3.googleusercontent.com/whAXc7c8-nSxOInM4EsVqI71VcPB9iZNBN6Bs1Wqnj5-zTA9Yg4M24v87m3qr2bJbS-er-e22rVLJ70GfOGKWfidmmehSPhafSpdwFZ0on3dcmTrFdTYsP9e8kZmU84qAiTI6vExidHCw9OgkbEdbDw" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/yTtl4cuTzJM163dAfKfFc4wI6C91Th4l6VlyRD6EgZMFDpPklTDAoMmkkVq3L1nJL_8m0mi26J-uJSuzC46ienWbicZYHucd9ZlZhGuXY0cYpz1POpJ-WWpI9oIA87JAvQ30tnwluywwbHJ8e8wLKLg" alt="" width="375"><figcaption></figcaption></figure>

Step 2 : Login to your inbox and confirm the email address which will complete the account registration.

<figure><img src="https://lh4.googleusercontent.com/Hx9qaoIGF7Sb6NTAnHklKJY78ZMWM3fZswloeCf6G9E_XYGIDAvGRaHwU4DLPayMFmnLtj8cqKnwwwXUbTCMKElSxm-PI7XvzCRxWcpQ4pCYXrviI35Xf2QBWT2gJE8Eknl5V1X4a4zcTcia1HhtcmM" alt=""><figcaption></figcaption></figure>

Step 3 : Login to your MonkeyLearn account and go to “Premade Models”

<figure><img src="https://lh5.googleusercontent.com/smIzqJ6yzAm7m0hrXcs_cwtB7hRNWd3fPLPlJrd-Z89vNeOtez4oIqHIL5tAoZcjX7NCwRI71GXc9rSEgYI_3WxyB1nM5JNkpFucf_-zDyOUu0xsNiEDGJfouxw1xy0EsxBRPdHKfhrgzprRoszAltc" alt=""><figcaption></figcaption></figure>

Step 4 : CLick/ Select “Sentiment Analysis” option as shown below.

<figure><img src="https://lh6.googleusercontent.com/9ciLgsThFqE4tMIszvt4-Mvtf4VCN637qFnoQfpK2ct7nsvMtV_KAgia-9w64Y5VuOUqO_zbqm0i-t6JCqL6jjzoH20rmQgAQRQgX4CIdweMireeM_dlfhOeWNaurwpKgyymgfh4sJKwTuztIxc9eng" alt=""><figcaption></figcaption></figure>

Step 5 : Take a note of “Model ID” and “YourAPI Key”

<figure><img src="https://lh3.googleusercontent.com/G2wOn_Dr_-B9EtxvaPs_YDKknjfcUoxIiuNeKUZmtUxBTkWUV4Qln2_RF0-oKdyG7pCkbKz4BZOTB1uEUYtUkn51c1YRNFby5h5YHfrv4f6NzsZJYFo2J0P2U_5DlgTLFkI2WlPf7ABfPw4pKXFUH3Y" alt=""><figcaption></figcaption></figure>

### Integrate JotForm with MonkeyLearn

Step 1 : Login to your JotForm account and select the form you wish to integrate with MonkeyLean.

<figure><img src="https://lh5.googleusercontent.com/hDW65-OTxGMrZ_GgGYvJqfjPi6E8d45NaYyXUkMmIzvms3xAzFdgaCwtIBp4xTaKqbbw5GLXyz6HesIYEKM5bHqD7SA7Q5jlE3Fjq4m6q-CBh_l0ZcS0bs_6FJUOBmcltvBTAYwYuw_VjcFVN7haCac" alt=""><figcaption></figcaption></figure>

Step 2: On the “SETTINGS” tab search for “WebHooks” and click-open it.

<figure><img src="https://lh4.googleusercontent.com/7gfLNAdJTrLWaF51YIv_97E8ZiDWmAauZJ4SAVS3DlVp0KuE2sJVAQdz8K9AfOBBHyRlsKUMhDBYONuj-VBJnuJcEyLbf9ehmcaJByg6_zb3lmJVm1kUXbeTW3aVwNqzBHdZwYgQbbzex-VAGsVa3uU" alt=""><figcaption></figcaption></figure>

Step 2: In the “Add Webhook” text box enter the following Webhook URL[https://api.monkeylearn.com/v3/classifiers/7fa12eb2c01f4e271caed477aad50430b68e38f3/classify/](https://api.monkeylearn.com/v3/classifiers/7fa12eb2c01f4e271caed477aad50430b68e38f3/classify/)

**Note** : The structure of Webhook URL is something like this->: The URL of the MonkeyLearn API, which should be https://api.monkeylearn.com/v3/classifiers/{<mark style="color:red;">classifier\_id</mark>}/classify/.

Replace {<mark style="color:red;">classifier\_id</mark>} with the “Your API Key” of your MonkeyLearn model which you took a note of in the Step 5 of section “MonkeyLearn Account Setup”

<figure><img src="https://lh4.googleusercontent.com/Vv1hmjbbHcDb1VV3wpoTJVRxFtfuzsjqJ-qHUqbVNDQkOlbdzgCs5rCVxm16yE2xf93f1FyloMOeIVPbdEkyeho2Z6FKBOM5v-cgZnfVU6uqXAa-DUURNvsIxTUDkH54jFSX1A9VFXvt8EAXMEOx394" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/zeOL8KN9VxQrGWMZpDTQYqF_NcPGkkUm-hYjFXWsuCr7AWaMYqaz-cHRxfbySqAiLwtFOWUVmN79a1RwIRA7Y98jHjWPKPxT4gHVYVz4qDcZ2o6Yxp3NSMBpiRcxFqDdaLYghY0kHQymYrF04d-HcYM" alt=""><figcaption></figcaption></figure>

### Zapier Account Setup

Step 1 :Create a profile on Zapier website and Login. Here's a step-by-step guide to creating a profile on the Zapier website: [https://zapier.com/](https://zapier.com/)

![](https://lh5.googleusercontent.com/1LvhgOMCwdypWKrfdDNtJbixJ24i7YvaAej4m3sF\_Sx11BeSWKPKNSF4woFKGLefTYs3FbxZyRAJ-3hWKI1lI7ENR7vg0IDLDfdFd3-8SiA2syGVkLvW0\_PYdoZfsu6a4M9DsBlN6E-rA2UfwjbDGsE) ![](https://lh5.googleusercontent.com/xyTlSNRCsShEDYo1hH25Rx-PrWrjVym5be2fEZex2Dhr7ImPC9KDJ7j0Xrj3PjOdVpIwo96N9nT3zKky4\_ZzZBrUs9PuDl4zUi1wmp32Tp\_2t9jOnKMLm\_m9Sd8wgSy\_uS03q67ge5gOoUN9Wv783I8)

<figure><img src="https://lh6.googleusercontent.com/nKmcac6RKHCpsRf8ghIf4X79VOARazTPSxsOSCjDFNA4ZJBW4Cr9SkjouMaNwwkZdl9S6umGmriTZuyI8FZE9O0bQ5TWBAeL_6xupqsLMOk0YGLpLSjcGdCBMSEYfIBpbsm3uMB0TBzXrtMeerqmtgA" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/d17d9GaQcqSh1JBrTc5xMoVkzFzJRTy9o5oG1D1tHUk2REjh-gwwjZiLf3SGgyjM7d2zJ0Yhda2Q2iWObL6e5r2-zpf0U9-VtvPpyYLDqt68kSi0IA7AwSY0-6Rxnn0n-Vzg-zKGNqnWK9BImOpG_5E" alt=""><figcaption></figcaption></figure>

Note : Up to here your Zapier account has been created. Now we will connect your MonkeyLearn and JotForm accounts to Zapier in the next steps.

Step 2: Create Zap by clicking on “Create Zap” on your Zapier dashboard.

<figure><img src="https://lh3.googleusercontent.com/EPcorv6dQe6pEgrcPPJCSZEwMveFBd4N2wVHtljXv5B0jRagqtACtRQtDtxZyDdsqOOLywoekImDpO6Ue3-dGyaeBXi_WsvTGVAsxk3X_H9mcqpMfETrGEXohqabfi4KqwTlVcwgCYW9Snq7uzkbNI4" alt=""><figcaption></figcaption></figure>

Step 3: Choose "JotForm" as the trigger app and "New Submission" as the trigger event.

<figure><img src="https://lh4.googleusercontent.com/jN5k4HHE0Y12oV5mqMjizoDmy2RkzD1zIeA6EZiitlV8rjPrVp9p1DRIAMyaXR4vzHigG4tgybBsA48HbpYWPi0Xc_y6o2Rhv2vNKp6xsEUZIBCU5K1GjFANNbOxbOqNUdHDOkLxjvt9JN_-8Nu8d1Q" alt=""><figcaption></figcaption></figure>

Step 4: Rename “Trigger” to “1. New Submission in Jotform”, and set up the “App & Event” section as shown below.

<figure><img src="https://lh6.googleusercontent.com/BCgi39HdSQVPdR9J2IANzj-HdRaUGl7sZ1GUHX73_yrSNkkqYkV1NdZbI6DHgWPwf-etqKmLWKWues5-DdzONB42CCuymACG1nMhD4T7r79SSZpzI8srZJxzGTCokCFuZ64ga2qCXIW72RcZy6vh8oU" alt=""><figcaption></figcaption></figure>

Step 5: In the “Account” section select the JotForm account created earlier. Then test the connection.

<figure><img src="https://lh6.googleusercontent.com/9JrD_00wJAhFkWMFHH-WF_2cmnV5CEHtbF-3VyDHzfuCyBY7ku4vKk1kzZHl9PFsi7pV4s_pxcBF5cDRyi7FfYNe0jGHIJlHO2YUE8UZ8k2c6q9GZt4fi6SwXsaGPz7oaia7Rjjqh0GKtQSldX9FMQk" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/LpMs8px7D1idXcXiSLTHyu9PU1zjxYJdiLg3-kOmQwzkPF2ZE9zNV5ILKS5n34Ht88RQ6A-_6Ue0PZRL8EReXd1q3DmTkwkY9Hkd0k2MP7zfKqV1UyXepDA184Z-DludES-9jMfwAVdwQxtqMid9mgM" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/_u82ZHbC7dUVGvByfdLCjaDYjNNa_-uKxLDuvp-ldzUkxMktG7lXjsnuT3RFO0ai7n8RqakSllLvfa7bWPTIX3cc2PXBx3NxFJMjUoxu5SvihGF87TtHyEQtpm6QaXyw0WbxcRSnW3-bM67w7wc7h4w" alt=""><figcaption></figcaption></figure>

Step 6: In the trigger section select the form created in the JotForm application.

<figure><img src="https://lh5.googleusercontent.com/pRNwIoE0MceA-IgqUGCJUMdzoEdI9GosXODS1MW4m30CnW3hSmFbrmjTsMiNWh5GLz4kqHIjjX6TIR8SjATF5KnwWu4eiMfzMhZ04JjLAb4U_mQDJ0DpAxjBKc1zqNOcHLW7uLZlJ8JqFkUHuO4PS0k" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/OvUF7929dqu8DRRkdsc_4-CcNVt5ju8G0d4gWJU7gBnpRSumg16V3zrLF142CFj65diTtNte4J2Qg9BHWPPkLX6sb6rpLvoW5mXGusEoK12uYIx0HsQdaGixIDHVw3jBx5CYyvz0jxpEV0anRmgaEhY" alt=""><figcaption></figcaption></figure>

Step 7: In the “Test” section select one of the past submissions. The click on Continue.

<figure><img src="https://lh6.googleusercontent.com/MrG1L43iiboCJ-kIJb0WuUgWbPn4T-razcNtOy7AJc-oXEvnYWNrq5ROmf2te5Xohu9WG9Z5xnT_ZKe1QNtJK3BvuN5uZ--tX01SRDzndHsd-R-gVL-DI-g9lQopVry3UCEmNf3U7ehN8c91ADn0pMI" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/7BEguv0rKy3F5R0ieI97A2F4Cyeoo9UIupHb0b6bQ3m_dOHWanKFxG-dINy_13qCj00H06-CKKEveMTzqLaUhkY8NvqMsUnZzXgvOwfLe4qXE4J1YzgN5owU9gnb4dGI9P_OundUiIK6oajvPMwBwgA" alt=""><figcaption></figcaption></figure>

**Note:** By now we have set up the “Trigger” in the Zapier application. Now we will create an “Action” to be followed when the “Trigger” happens.

Step 8: Click on ![](https://lh4.googleusercontent.com/mC7YCUgU2dRfle9K9FFcEERiANTgAiGGaPBfhpvXVEWJRtfid5H-uNLEI4DrNP73yAIVPnYPIH1Ql-TIPwhuZIppgzcJhF\_UZ0tmQRq74yJ0JHylWqkIKXBZU6XdTWl8EwibMKnESnRko9OyyIwy8qE) icon below the Trigger setup and choose "MonkeyLearn" as the action app and "Classify Text" as the action event. Also, rename the section to

<figure><img src="https://lh4.googleusercontent.com/6Fq7g2_m5bgavTuYpikwVnP3r0nPGIkHIpHTx6qa-DhTPiaMX_DfpATG9hUpKoAd-8lHvnCzZxGdElQjGHC2ec6m4STLVcH4tJx9QwJ1wQ8SWu7X4gfsHAYCJs6YFy-XCRQBMbfh7NIDaaXdGhzdhVA" alt=""><figcaption></figcaption></figure>

Step 9 : In the “Account” section select the MonkeyLearn account created earlier. Then test the connection.

<figure><img src="https://lh4.googleusercontent.com/GJe22KvFmPTYhe8ubtYgTRqwnZInx0ePLS9VqjiN6aDi5xxpJItQYq5gTC33P99M4FNURKY6u0B_wiXqrcYqM4im2fRn8YfrMPpU8ONv0fm_bfIize3IqTJJUFeB6Ior_3sHmlku0WY95kAeHXQtsrY" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/61pVCqg5Dho8Idb9gJWu3hnFRR8W1MvmKEQBAgA8k1D7isBUMeqHR3kBoroQTyUS1IOGF6oJBdJrks6eLNDlS90-EC8q7bYtq1CgAKzWGNGfTBkxFrVJ68ebzgLQcvslxZYMcxQh-cOquuBwOQvdqeA" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/uTduEjhAiDyibzBAqpGT4DDvw_HXXkPuXUxJE20LH8z5kw5CEduXDCUlRquXmxiVPEqb77ixBhucLJA-oeBfUKWRhx60uvaZWGiRxEEr2JoxtNatNnX_6sE4z_HX9R4bUhU1j-QkWds9RJyx50HX-cY" alt=""><figcaption></figcaption></figure>

Step 10 : In the “Action” section, in the “Classifier” text box, select the Model ID of your MonkeyLearn model which you took a note of in the Step 5 of section “MonkeyLearn Account Setup”

<figure><img src="https://lh4.googleusercontent.com/XkSrivpKn2xcWkpLjX6XHqqqUAulM-4lA68YDQIYfhp26TjOoyPVCQo1OchVjOZIQQZAPbBbKtq9cjLQrwS8lEyZ6WVz2U6hxz76UDeG1y11yjbNzV0EMPlW96fsGX3UnhAsiSqGMeGOMSX0uYQcCSA" alt=""><figcaption></figcaption></figure>

Step 11: In the “Text” textbox, select field(s) which is/are storing/ capturing the “sentiments” on the JotForm setup earlier. In our case we have only one field “Describe Your Feedback” which we want to use for sentiment analysis.

![](https://lh3.googleusercontent.com/nA-UrgA2VEl8rL84ogbVsrIJ5ROO8xUP2944Boc3aiomQK3tzB51LJ6S3r4sbzRMtC9tV2DvmThfAy3PIyBEq2Oz1mT9\_IMdY6NXir935XQbd9FrG-DY3OytN9ArzUlrywDCfUxVaKEE4zI5lHiQCy0) ![](https://lh5.googleusercontent.com/npIdJoj0owj-a0qUwIii2QBJB0djMB9QXVArTF0ggzFTAmG9A4MjE4diSj6KAqaaZopDLrNcSij7wW00mleJ0LjITEBD5HCZJ2nkmP7EuyxR20hUAIk4nYJ41n4X7l5SbsAVgrVACoc3xRgoCROun94)

Step 12: Select “Yes” in the “Use Production” selection. Then click on Continue.

<figure><img src="https://lh4.googleusercontent.com/2T2vlofOm2DNhQZXSRAN5RIaW1BUu4Lz7bJ4Iab9ew29Am17OE84nJvjIACkxkjcqOrHNWLKIK-ipcR8-swbdRgmCcmADHP5peCmY-i6oVc2YJH-sP5GtkE4XT5uLC1hrWP8riHkvV3a9Pa-1CnzIkQ" alt=""><figcaption></figcaption></figure>

Step 13: In the “Test” section text the setup. It will show the error message. This is expected since we are not providing any data for testing for the field “Describe Your Feedback”.

<figure><img src="https://lh3.googleusercontent.com/jw9by6l1Nzkyprbn4xaQvFYlP1c1uZWpY8badutApiWQhVSwyel-oOhZf0p857Ne0YgPztdnMwxd-D8jSrdWE_mA6_iDE8REAtfTfMhOc1rx_f0M36P_6RLxzC70a0WzxptmdPXLolXtWNRrhskkspQ" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/wofQw0MDqSm-kfHyuM-Q3q4auqHsIdZX1KmEv2f5pMMRshzCnjgphahGrCKv1fzuh1t5bveHhM9YcM1VSTbJnm_ViwYkj8bgJqlcC6rh7SNRVF25sIRLTHrw85GyXvnlnyyQeDuBzgI7JBbr-9kRkVg" alt=""><figcaption></figcaption></figure>

Step 14 :Finally publish the Zap

<figure><img src="https://lh4.googleusercontent.com/nvRN3eV0sX-gzXrGlLWq2C9cvHfW6nbXSY7oDC5EtTjmWJyIrWLnYn49U7UtfS6spZmM2V4r3gg98pWjQ4IMuQeDJnmUvb62f9-BQfAfbkjpu5orBX-jAIK9RHhcjTrPX8pNh376VRp1B9ibiHboBVU" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/jgXA6xrqXK8U8NpCgSjs0wAYBVoSMnMky3m9caan0yv3oBWwvb26hRC6Kn_bXb9Klf0ajUzNc9QsmKV1RU1cQq9CCBfRmmx1C13tZcDOa4Xwx-jfVNFifIC4QMZB8GnUJMTwRHdaVjRu66z5L3_krUY" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/TwsOTOmwp7_gxEUhryWfjZIZ6ccop3a-j1SyxVF8xq9w_gnE3zudfCLvvVp9HSHwAgUvqHEP6PQXZIugxxbzIaeJnyhpY2Vyca6iuF8yghUW1rBzB3qSq9ThoYs_ifSbgfxCZhaF6Q4jlY2bmz44WfI" alt=""><figcaption></figcaption></figure>

Note : By now the integration of JotForm and MonkeyLearn is done via Zapier. Whenever the JotForm is submitted then Zapier will send that data to MonkeyLearn and get the feedback analyzed, meaning MonkeyLearn will send the result as “Negative” or “Positive” back to Zapier. If you have taken a Silver level subscription for the JotForm then the individual form can be updated back with that result, provided we have already created a field on that form to receive the feedback analysis.

Now in the next section we are going to test the Zapier integration.

#### Test the integration

Step 1 : Fill in the feedback form at [https://form.jotform.com/231232735256452](https://form.jotform.com/231232735256452) and submit.

<figure><img src="https://lh4.googleusercontent.com/1wUoapb8LwKii_OQm1gxU1PGe6Wisbj8kPh2kMUglyz99E8lfdIKhXLKRCa7W6lh0JOFzyN0ki_B-T_THWHOpRp33MFMVgMjrx0DiEzkSseYB2-patM566wvuOI5fsJvIWa2amrOpVHBG5gLF5S5sq8" alt=""><figcaption></figcaption></figure>

Step 2: Check result in the JotForm submissions.

<figure><img src="https://lh6.googleusercontent.com/F0FHCTR4yuvNWMl4ofovc1nA86q3AIaBU27UqpZFiLJtjRYaepdK7ET91GRUkKGkHqtaIWLtZm_FrhoU3DjXzWz1y-pb1IDfow-sB14vai1uT_JMPy3LWiiNdJhBSFkTq-Yuuczeog2sTfnRTjFFTVY" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/aYPrV6c_SWDQxDfhAVaTsuN-AUU9GGg9UPFoos9fOi8BTaH62Z1AKlZYxFqljRXU0mLd8UkbOB0XZ8Aw_tEHURUbJrI42dts6Gb1KzmoKKuYp97TD7ATg8KQNWCD5ZYNq6ULcTyUkYm7joaAD26VBCc" alt=""><figcaption></figcaption></figure>

Step 3: Check the Zapier “History”.

<figure><img src="https://lh5.googleusercontent.com/2bU3OC3WyWz3PjbUFRxXC8V3_iuXnb4yf-OVnCK32XUEcVhPkthHIPO9JuHCsY7SaJU5fTZnzFurNfZoMTckEqGtvwG7YqB0SF1BXON1a3k0Yr5i8ZxTUU9_HzpgRKNBCoN5HGRK5Poxo4MNuET_DrU" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/0z0K-vSZ07s5hQOW8OrXtaefgk11qqkm1Cmc6X4fXr7C4mXC5xczJjQ4vQFfRLDtYeIKUo4VqxK5a9smJWZ3aph1qYSsOVItmLk7xQu6m0I93LcsTMUEBwNF5A46LpcAFgVGNBG5WXe3d5FsYMM1qnM" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/p3fPWOLboYe3HjEYcNU6JjMPyrrE2R9Vhgt9d0M-1rxxAmzechyhWbh-61HSeO5mI0883q6_fG43fMks1uEMjvsLMCdn_UUV621t3SKrEppiAVUQ26f_iVMSlZhGRFKhn9UNmcOYbHOjkRbjVQw46wY" alt="" width="563"><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/35eZEMl1I87IxN64SndaPi9MNYl2eXOp1DIEoyWkmdHD2smiN84ApXinF93YPr1fOHLHCmtd4xeYEeX4zcmw3kFnL8yTy6v4GUzSWTtnE-go8ToFYt5M6Aoq6jnEBEe74n3-pveTziarYBaLqMdtwww" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/iMf6clCLaEyyT4eFk4KUMuWwlQU6qgZg8h047xMZZOT0KaXj5yT-0QSdaZQ8QizLb-bWKFnBQNcLDr8-VBas_QKIwInwTqmaOW0OegSW5iVJbUiEreEqqRAKrr5m-InGQacupzQWm0nF-JEiFD0vcZ8" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/rDl_9pOvxMNbkK4J4F3GWJnlUHT6LrSDmuOcDg7NkN4QKNpaUr5NzAm_e6dXP9H9STeyMbQkClktnSZB_Z0aZV0wZQ7i6C8fJfzP-kKAPLWTrWtwOSOawLx_pwEbuyuF2urit6zdz13qp3Nw8oCEKSg" alt=""><figcaption></figcaption></figure>

Note : The sentiment analysis engine of MonkeyLearn has sent a “positive” result of the feedback received from JotForm via Zapier. As said earlier, If you have taken a Silver level subscription for the JotForm then the individual form can be updated back with that result, provided we have already created a field on that form to receive the feedback analysis. See below how that field can be created on the form in JotForm.HGF Specific JotForm

<figure><img src="https://lh3.googleusercontent.com/cssBn0HTKL9qaej2myBSJ3onGYnrJTdrcG9vkJj-cx3vA8qqx6YFpp2rdhi63DctNjIPqdGUyw3yZrYyI_7CSK_jS6ED-tFGqRUDxg_YxOY8-OzIQUQw68Vy36VkPkEjE-1uudhYmqmZR4ziUKymv5k" alt=""><figcaption></figcaption></figure>

### HGF Specific JotForm

<figure><img src="https://lh3.googleusercontent.com/0ab7GoAei_hbutkspFHOfaUXxlPJXP4MnWFJ7nGsAIb9j7eOSABO9CB1S9UTBCbzqTbngBjPu22a29I-5vuGUAyPBrOxRuNZKDUXfBMVr8egM_ovHSOUokqiOayhZ-2SSZ2mN8cX1fObWBaYf0Nim4Q" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh4.googleusercontent.com/M-qz5xu8vXMWA7Cm31FoY9YLL1VjUrvYJQy7Zygjwmg4YmGtrzzqUIqnTctbekZ_ryGg4MV-wExCRuRGFNvSn2DKUbdoVLqLS9Wiqtu68TRvKEvSaARQT9PSlhigU0InLvow7vjdwUWNLGbeQBLqFk4" alt=""><figcaption></figcaption></figure>

\\

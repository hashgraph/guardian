# Performing UI Automation Testing

Following command is used to run all UI tests in an interactive dashboard that allows you to see the status of the tests while they are running and at the same time view the application under test.

```
npm run ui-only 
```

To run a UI test for specific policy you can open Cypress dashboard by running the following command from /e2e-tests folder:

```
npx cypress open 
```

After executing this command, you will see a welcome window where you need to select

'E2E Testing' as shown below:

<figure><img src="../../.gitbook/assets/image (7) (3).png" alt=""><figcaption></figcaption></figure>

Click on the button ' Start E2E Testing in Electron '.

<figure><img src="../../.gitbook/assets/image (9) (3).png" alt=""><figcaption></figcaption></figure>

and then select test under ui-tests/specs/policies

<figure><img src="../../.gitbook/assets/image (8) (4).png" alt=""><figcaption></figcaption></figure>

Finally, all the selected test runs and you can see the key components of the Test Runner that you need to pay attention to when executing tests.

<figure><img src="../../.gitbook/assets/image (2) (1) (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

**Test Status Menu:** The menu shows a summary of the number of tests passed, passed, failed, or incomplete, and the time spent on the test.

**URL Preview:** Shows the URL of the test, helps track the URL.

**Viewport Size:** Set the size of your application's viewport to test responsive web applications.

**Command Log:** Shows command logs as they run for all tests. In Cypress runner we can observe the requests that are sent to the server.

**App Preview Screen:** You can see the app while the test is running.

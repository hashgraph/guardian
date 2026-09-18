# Auto Testing using UI

## **Add test data to the Policy**

Tests can be added to the Policy, when such a policy gets published then the added tests get embedded into the policy file.

Such tests are imported/exported together with their respective policies.

{% hint style="info" %}
**Note:** Tests can be run only when the policy is in the dry-run or demo status.
{% endhint %}

### 1. Adding Tests

Tests can be added to the policy via the corresponding menu option as shown on the screenshots below:

<figure><img src="../../../../.gitbook/assets/0 (18).png" alt=""><figcaption></figcaption></figure>

![](<../../../../.gitbook/assets/1 (20).png>)

### 2. Running Tests

To launch a test navigate to the tests list using the ‘Test details’ menu option\


<figure><img src="../../../../.gitbook/assets/2 (22).png" alt=""><figcaption></figcaption></figure>

\
Select the desired test in the grid and press _**Run (or Re-Run)**_

![](<../../../../.gitbook/assets/3 (19).png>)

{% hint style="info" %}
**Note:** There could be only one active (running) test per policy, multiple policies can be running tests at the same time.
{% endhint %}

<figure><img src="../../../../.gitbook/assets/4 (17).png" alt=""><figcaption></figcaption></figure>

### 3. View Test Results

Test results can be viewed in the test window

<figure><img src="../../../../.gitbook/assets/5 (20).png" alt=""><figcaption></figcaption></figure>

There are potential outcomes of running policy tests

1. **Stopped** – test was stopped by the user
2. **Success** – test was successfully executed and the results are fully matching those originally captured

![](<../../../../.gitbook/assets/6 (19).png>)

3. **Failure (1)** – an error has occurred during the run of the test, the execution of the test was not completed

![](<../../../../.gitbook/assets/7 (19).png>)

4. **Failure (2)** – test was executed, however test results (i.e. the produced artifacts) differ from those originally captured

![](<../../../../.gitbook/assets/8 (20).png>)

Detailed comparison of the execution results (documents) can be performed by clicking on the ‘Show more details’ button.

![](<../../../../.gitbook/assets/9 (17).png>)

![](<../../../../.gitbook/assets/10 (18).png>)

### 4. Removing Tests

Tests which are not being run can be deleted.

![](<../../../../.gitbook/assets/11 (15).png>)

### 5. Access from the grid

Tests can be managed and run from the Manage Policies grid.

<figure><img src="../../../../.gitbook/assets/12 (13).png" alt=""><figcaption></figcaption></figure>

This view allows to:

* Add a test to the policies if it does not yet have any tests
* Run the most recently added test
* Re-run the most recently run test
* Monitor the status of the test being run

## 2. Demo Mode

To simplify the UI of policy testing (useful for novice users) a new ‘**Demo**’ mode of policy import has been introduced. In this mode all policy processing is ‘read-only’, policy editing is not possible, and no communication with external systems such as Hedera network and/or IPFS is performed. Policy execution in the **Demo** mode is similar to **dry-run**.

To use demo mode the corresponding option should be selected on the policy import dialogue.

<figure><img src="../../../../.gitbook/assets/13 (13).png" alt=""><figcaption></figcaption></figure>

# MGS performance testing

## Description
There are tests with full workflow for IREC-7 policy:
- Create tenant
- Create users
- Create standard registries
- Provide hedera credentials 
- Import policy
- Publish policy
- Associate token
- Grant KYC
- Choose role
- Create and approve application
- Create and approve device
- Create and approve issue
- Verify balance increase

short workflow for IREC-7 policy:
- Import policy
- Publish policy
- Associate token
- Grant KYC
- Choose role
- Create and approve application
- Create and approve device
- Create and approve issue
- Verify balance increase

view workflow for IREC-7 policy:
- Create and approve issue
- Verify balance increase
- Policy list viewing and verifying
- Token list viewing and verifying
- Profile viewing and verifying

dry workflow for IREC-7 policy:
- Import policy
- Publish policy
- Dry run policy


## Navigation

- [Software requirements](#software-requirements)
- [Installation](#installation)
- [Usage Short Flow](#usage-short-flow)
- [Usage Full Flow](#usage-full-flow)

## Software requirements
- Download apache-jmeter-5.5

- Download and install plugins

- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install, configure and deploy Guardian application


## Installation

1. Clone the repo

   ```shell
   git clone https://github.com/EnvisionBlockchain/managed-guardian-service
   ```

2. Change the tree for "performance-testing"

3. Download apache-jmeter-5.5 from official site

4. Download and install JMeter Plugins Manager. More details:https://jmeter-plugins.org/wiki/PluginsManager/

5. Install "Custom Thread Groups" plugin by JMeter Plugins Manager. There is should be found by UI in Apache JMeter: Options->Plugins Managers->Available Plugins

6. Install "WebSocket Samplers by Peter Doornbch" plugin by JMeter Plugins Manager. There is should be found by UI in Apache JMeter: Options->Plugins Managers->Available Plugins

7. Change Guardian's port number in "User Defined Variables". If Open Source project built by docker - need to enter 3000, for case when project built by yarn - need to enter 4200.

## Usage Short Flow
### Pre-requests
1. Open Apache-jmeter: execute {path-to-apache-jmeter}/bin/ApacheJMeter.jar

3. Open test for short flow: File-Open-{path-to-repo}/PT/ShortFlow.jmx

4. Some operations requires hedera tokens. In case with low balance on hedera account to execute tests correctly need to change hedera account on Guardian Open Sourse. To fix INSUFFICIENT_PAYER_BALANCE error change hedera account on Guardian Open Sourse:
- Login on Guardian Open Sourse
- Click on Administration
- Click on Settings
- Fill new variables(Hedera key, id, IPFS)

### Configure tests options
1. To configure thread options(number of users, ramp-up time) need to change same properties on "Policy workflow" thread group. For example, 10 users and 150 seconds ramp-up time: test will create 10 policies and mint 10 tokens for each policy. Each user will start for 15(150\10) seconds later than previous user.

2. There is limit of number of users. To increase max number need to add usernames and passwords to userdatashort.csv file. Limit number equals number of rows in this .csv.

3. To debug test need to turn on "Debug PostProcessor"(allows to read variables), "Summary Report" and "View Results Tree"(allows to read list of executed requests).
After the step, need to click on "Summary Report" to see results(requests, response, bodies and headers, variables). "View Results Tree" shows some metrics and general information about execution.

4. To pre-configure test for report generation need to turn on "Aggregate Report".

### Run tests by UI
1. To first run need to prepare enviroment: run "Tenant creation" and "Users creation".

2. After previous step, clear all reports, turn on "Policy workflow".

3. Click on "Start" button

4. Generate and analyze report.

### Report Generation
1. Click Tools-Generate HTML Report

2. Check that {path-to-repo}/results_short/report is empty.

3. Fill "Results file"({path-to-repo}/results_short/result.csv), "Output directory"({path-to-repo}/results/report), "user.properties file({path-to-apache-jmeter}/bin/user.properties)" and generate report.

4. Open 
{path-to-repo}/results_short/report/index.html

## Usage Full Flow
### Pre-requests
1. Open Apache-jmeter: execute {path-to-apache-jmeter}/bin/ApacheJMeter.jar

2. Open test for full flow: File-Open-{path-to-repo}/PT/FullFlow.jmx

4. Some operations requires hedera tokens. In case with low balance on hedera account to execute tests correctly need to change hedera account on Guardian Open Sourse. To fix INSUFFICIENT_PAYER_BALANCE error change hedera account on Guardian Open Sourse:
- Login by Guardian Open Sourse
- Click on Administration
- Click on Settings
- Fill new variables(Hedera key, id, IPFS)

### Configure tests options
1. To configure thread options(number of users, ramp-up time) need to change same properties on "Full flow for N users" thread group. For example, 10 users and 150 seconds ramp-up time: test will create 10 SRs, 10 users, 10 policies and mint 10 tokens for each policy. Each user will start for 15(150\10) seconds later than previous user.

2. There is limit of number of users. To increase max number need to add usernames and passwords to userdata.csv file. Limit number equals number of rows in this .csv.

3. To debug test need to turn on "Debug PostProcessor"(allows to read variables), "Summary Report" and "View Results Tree"(allows to read list of executed requests).
After the step, need to click on "Summary Report" to see results(requests, response, bodies and headers, variables). "View Results Tree" shows some metrics and general information about execution.

4. To pre-configure test for report generation need to turn on "Aggregate Report".

### Run tests by UI
1. Turn on "Flow for tenant creation", "Full flow for N users" and "Flow for tenant deletion".

2. Click on "Start" button

### Report Generation
1. Click Tools-Generate HTML Report

2. Check that {path-to-repo}/results/report is empty.

3. Fill "Results file"({path-to-repo}/results/result.csv), "Output directory"({path-to-repo}/results/report), "user.properties file({path-to-apache-jmeter}/bin/user.properties)" and generate report.

4. Open 
{path-to-repo}/results/report/index.html

## Usage View Flow
### Pre-requests
1. Open Apache-jmeter: execute {path-to-apache-jmeter}/bin/ApacheJMeter.jar

2. Open test for full flow: File-Open-{path-to-repo}/PT/ViewFlow.jmx

4. Some operations requires hedera tokens. In case with low balance on hedera account to execute tests correctly need to change hedera account on Guardian Open Sourse. To fix INSUFFICIENT_PAYER_BALANCE error change hedera account on Guardian Open Sourse:
- Login by Guardian Open Sourse
- Click on Administration
- Click on Settings
- Fill new variables(Hedera key, id, IPFS)

### Configure tests options
1. To configure thread options(number of users, ramp-up time) need to change same properties on "View Flow" thread group. For example, 10 users and 150 seconds ramp-up time: test will mint 10 tokens and view lists and profiles for each user. Each user will start for 15(150\10) seconds later than previous user.

2. There is limit of number of users. To increase max number need to add usernames and passwords to userdata.csv file. Limit number equals number of rows in this .csv.

3. To debug test need to turn on "Debug PostProcessor"(allows to read variables), "Summary Report" and "View Results Tree"(allows to read list of executed requests).
After the step, need to click on "Summary Report" to see results(requests, response, bodies and headers, variables). "View Results Tree" shows some metrics and general information about execution.

4. To pre-configure test for report generation need to turn on "Aggregate Report".

### Run tests by UI
1. Turn on "View Flow".

2. Click on "Start" button

### Report Generation
1. Click Tools-Generate HTML Report

2. Check that {path-to-repo}/results/report is empty.

3. Fill "Results file"({path-to-repo}/results/result.csv), "Output directory"({path-to-repo}/results/report), "user.properties file({path-to-apache-jmeter}/bin/user.properties)" and generate report.

4. Open 
{path-to-repo}/results/report/index.html

## Usage Dry run Flow
### Pre-requests
1. Open Apache-jmeter: execute {path-to-apache-jmeter}/bin/ApacheJMeter.jar

2. Open test for full flow: File-Open-{path-to-repo}/PT/FullFlow.jmx

4. Some operations requires hedera tokens. In case with low balance on hedera account to execute tests correctly need to change hedera account on Guardian Open Sourse. To fix INSUFFICIENT_PAYER_BALANCE error change hedera account on Guardian Open Sourse:
- Login by Guardian Open Sourse
- Click on Administration
- Click on Settings
- Fill new variables(Hedera key, id, IPFS)

### Configure tests options
1. To configure thread options(number of users, ramp-up time) need to change same properties on "Full flow for N users" thread group. For example, 10 users and 150 seconds ramp-up time: test will create 10 SRs, 10 users, 10 policies and move it to "Dry Run" status. Each user will start for 15(150\10) seconds later than previous user.

2. There is limit of number of users. To increase max number need to add usernames and passwords to userdata.csv file. Limit number equals number of rows in this .csv.

3. To debug test need to turn on "Debug PostProcessor"(allows to read variables), "Summary Report" and "View Results Tree"(allows to read list of executed requests).
After the step, need to click on "Summary Report" to see results(requests, response, bodies and headers, variables). "View Results Tree" shows some metrics and general information about execution.

4. To pre-configure test for report generation need to turn on "Aggregate Report".

### Run tests by UI
1. Turn on "Policy workflow".

2. Click on "Start" button

### Report Generation
1. Click Tools-Generate HTML Report

2. Check that {path-to-repo}/results/report is empty.

3. Fill "Results file"({path-to-repo}/results/result.csv), "Output directory"({path-to-repo}/results/report), "user.properties file({path-to-apache-jmeter}/bin/user.properties)" and generate report.

4. Open 
{path-to-repo}/results/report/index.html

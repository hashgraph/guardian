# MGS performance testing

## Description
There are tests with few workflows:
### Flow for mint tokens in Dry Run and Publish mode for iRec-3 policy:
- Create users
- Create standard registries
- Provide hedera credentials 
- Import policies
- Dry-run/Publish policies
- Assign policy to users
- Associate tokens
- Grant KYC
- Choose roles
- Create and approve application
- Create and approve device
- Create and approve issue
- Verify balance increase

### Flow for mint tokens in Dry Run and Publish mode for CDM policy:
- Create project participants
- Create validation and verification bodies
- Create standard registries
- Provide hedera credentials 
- Import policy
- Dry-run/Publish policies
- Assign policy to users
- Associate tokens
- Grant KYC
- Choose roles
- Create and approve applications
- Create and approve projects
- Create and approve reports
- Verify balance increase



## Navigation

- [Software requirements](#software-requirements)
- [Installation](#installation)
- [Usage Flows](#usage-flows)

## Software requirements
- Download apache-jmeter-5.6.3

- Download and install plugins

- Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install, configure and deploy Guardian application


## Installation

1. Download apache-jmeter-5.6.3 from official site

2. Download and install JMeter Plugins Manager. More details:https://jmeter-plugins.org/wiki/PluginsManager/

3. Install "Custom Thread Groups" plugin by JMeter Plugins Manager. There is should be found by UI in Apache JMeter: Options->Plugins Managers->Available Plugins

4. Install "WebSocket Samplers by Peter Doornbch" plugin by JMeter Plugins Manager. There is should be found by UI in Apache JMeter: Options->Plugins Managers->Available Plugins


## Usage Test Flows 

### Pre-requests(UI)
1. Balance on hedera account which provided in .env.guardian settings on Open Source. 
- Publish: ~25 HBar for iRec-3 and ~960 for CDM; for one thread.
- Dry Run: ~5 HBar for iRec-3 and CDM; for one thread.

2. Setup INITIAL_BALANCE="5" and INITIAL_STANDARD_REGISTRY_BALANCE="20" properties  in .env.guardian on Open Source for iRec; and INITIAL_BALANCE="5" and INITIAL_STANDARD_REGISTRY_BALANCE="950" for CDM.

3. Setup ACCESS_TOKEN_UPDATE_INTERVAL=6000000 property in .env.auth settings on Open Source

4. Setup MIN_PASSWORD_LENGTH=4 property in .env.auth settings on Open Source

5. Setup PASSWORD_COMPLEXITY=easy property in .env.auth settings on Open Source

6. Provide filepath to .csv and folders with report's results in "CSV Data Set Config" and "Aggregate Report" elements.

### Run tests by CLI(recommended)

1. Make sure all listeners are disabled in the test flow.

2. Run command from load-tests folder:

```jmeter -n -t flowFile.jmx -l logsFile.jtl -e -o reportFolder```

3. Analyze report.

### Pre-requests(UI)

1. Open Apache-jmeter: execute path-to-apache-jmeter/bin/ApacheJMeter.jar file

2. Open any flow: File->Open->path-to-repo/load-tests/*.jmx

### Configure tests options
1. To configure thread options(number of users, ramp-up time) need to change the properties on "Policy workflow" thread group. For example, 10 users and 150 seconds ramp-up time: test will create 10 policies and mint tokens for each policy. Each user will start for 15(15 = 150 \ 10) seconds later than previous user.

2. There is limit of number of users. To increase max number need to add usernames and passwords to userdatashort.csv file. Current limit is 1000 users.

3. To debug flow need to turn on "Debug PostProcessor"(allows to read variables), "Summary Report" and "View Results Tree"(allows to read list of executed requests).
After this step, need to click on "Summary Report" to see results(requests, responses, bodies and headers, variables). "View Results Tree" shows some metrics and general information about execution.

4. To pre-configure flow for report generation need to turn on "Aggregate Report".

### Run tests by UI

1. To first run need to prepare enviroment: run "Create OS users" with number of threads equal to the number of "Policy Workflow" threads.

2. After previous step, clear all reports, turn off "Create OS users". Turn on "Policy workflow".

3. Click on "Start" button and wait for the test run to complete.

4. Analyze logs and reports.

### Report Generation
Available only if "Aggregate Report" element is active.

1. Click Tools-Generate HTML Report

2. Fill inputs and generate report. User properties file can be find in apache-jmeter-5.6.3/bin folder; results file same with "Filename" property in "Aggregate report" element; output folder must be emtpy.

3. Open */report/index.html
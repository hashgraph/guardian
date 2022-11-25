# 💻 Performing API Automation Testing

The /e2e-tests folder comprises guardian Cypress test automation framework and automated UI and API tests

### Software Requirements

* Node.js 12 or 14 and above
* Follow steps from the [README](https://github.com/hashgraph/guardian/blob/main/README.md) to install and deploy Guardian application

### Installation

From /e2e-tests folder run the following command to install Cypress:

```
npm install cypress --save-dev
```

### Configuration

In cypress.env.json file update `authorization` key with `access_key` value which will be assigned to the RootAuthority after registration (bearerAuth)

### Usage

To run a specific test from UI you can open Cypress dashboard by running the following command:

```
npx cypress open
```

To run all tests sequentially use:

```
npx cypress run
```

For a single test use:

```
npx cypress run --spec path/to/file.cy.js
```



### &#x20;

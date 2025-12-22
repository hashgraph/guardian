# Chapter 23: API Integration and Automation

> Automating methodology operations and integrating with external systems using Guardian's REST API framework

Chapter 22 covered manual testing workflows. Chapter 23 shows you how to automate these processes using Guardian's comprehensive API framework. Using the same VM0033 patterns, you'll learn to automate data submission, integrate with monitoring systems, and build testing frameworks that scale.

Guardian's APIs enable programmatic access to all functionality available through the UI. This automation capability transforms methodology operations from manual processes into scalable, integrated systems that connect with existing organizational infrastructure.

## Guardian API Framework Overview

### Authentication and API Access

Guardian uses JWT-based authentication for API access. All API calls require authentication headers except for initial login and registration endpoints.

**Access Token API:**

```bash
curl 'https://guardianservice.app/api/v1/accounts/access-token' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'Referer: https://guardianservice.app/login' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
  -H 'Content-Type: application/json' \
  -H 'sec-ch-ua-mobile: ?0' \
  --data-raw '{"refreshToken":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAzMDU2OWVkLThjZWQtNGVmNS05ZjBlLTgwNDAwNjJhMWZiOCIsIm5hbWUiOiJnYXV0YW0iLCJleHBpcmVBdCI6MTc4ODkzNTYwMzYxMywiaWF0IjoxNzU3Mzk5NjAzfQ.JiaVXown792eHo2qxA2_d7VTrLdIL9zIPZ0UI-gZBtGn6ddSIVWsgwO2VRjGEsOHiymQNe8G4o8EwR79StZcfvz762ra52St38Gy9f_MQwVWCLv42oxqPTT8xTep41nnJoZbk85NQSR2rC6zrih4gV6Ue1MIj80TpJfwWC0Lz_4"}'
```

Refresh token is available in response of login(or loginByEmail) endpoints

```bash
https://guardianservice.app/api/v1/accounts/loginByEmail
```

**Base API URL Pattern:** All Guardian APIs follow the pattern: `https://guardianservice.app/api/v1/`. If you're using local setup - host would update to `http://localhost:3000` depending on your port configuration.

For dry-run operations, the typical URL structure is:

* Policy blocks: `/api/v1/policies/{policyId}/blocks/{blockId}`
* Dry-run operations: `/api/v1/policies/{policyId}/dry-run/`

### VM0033 Policy API Structure

Submitting data via APIs is much faster than manual form filling if schema is too big. Using the [VM0033 policy JSON](../../_shared/artifacts/vm0033-policy.json) we analyzed, here's how API endpoints map to actual policy blocks:

**VM0033 Key Block IDs from Policy JSON:**

* PDD Submission Block: `55df4f18-d3e5-4b93-af87-703a52c704d6` - UUID of `add_project_bnt`
* Monitoring Report Block: `53caa366-4c21-46ff-b16d-f95a850f7c7c` - UUID of `add_report_bnt`

For every dry run triggered, these IDs change so make sure you have the latest ones.

![Add Project Button JSON config](<../../../.gitbook/assets/image (172).png>)

**API Endpoint Construction:**

```bash
# VM0033 Policy ID from dry-run URL or policy JSON
POLICY_ID="689d5badaf8487e6c32c8a2a"

# PDD Submission endpoint
POST https://guardianservice.app/api/v1/policies/689d5badaf8487e6c32c8a2a/blocks/55df4f18-d3e5-4b93-af87-703a52c704d6
{Pass bearer token in Authorization header}
{With request Body - available in artifacts as [PDD_MR_request_body.json](../../_shared/artifacts/PDD_MR_request_body.json) }

# Monitoring Report submission endpoint
POST https://guardianservice.app/api/v1/policies/689d5badaf8487e6c32c8a2a/blocks/53caa366-4c21-46ff-b16d-f95a850f7c7c
{Pass bearer token in Authorization header}
{With request body - available in artifacts as [PDD_MR_request_body.json](../../_shared/artifacts/PDD_MR_request_body.json) }

```

![Authorization header can be extracted via dev tools console](<../../../.gitbook/assets/image-1 (9).png>)

## Dry-Run API Operations

### Virtual User Management for API Testing

Guardian's dry-run APIs enable automated testing with virtual users, simulating multi-stakeholder workflows programmatically.

**Creating and Managing Virtual Users:**

```javascript
// Create virtual users for automated testing
async function createVirtualUsers(policyId, authToken) {
  const endpoint = `https://guardianservice.app/api/v1/policies/${policyId}/dry-run/user`;

  // Create Project Developer virtual user
  const projectDeveloper = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      role: 'Project_Proponent'
    })
  });

  // Create VVB virtual user
  const vvbUser = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      role: 'VVB'
    })
  });

  return {
    projectDeveloper: await projectDeveloper.json(),
    vvb: await vvbUser.json()
  };
}

// Login virtual users and get their tokens
async function loginVirtualUser(policyId, virtualUser, authToken) {
  const endpoint = `https://guardianservice.app/api/v1/policies/${policyId}/dry-run/login`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      did: virtualUser.did
    })
  });

  return response.json();
}
```

### Automated Workflow Execution

Using dry-run APIs, you can execute complete VM0033 workflows programmatically to validate methodology implementation.

**Complete VM0033 Workflow Automation:**

```javascript
// Automated VM0033 workflow execution - This is just a sample code(not tested)
class VM0033WorkflowAutomation {
  constructor(policyId, ownerToken) {
    this.policyId = policyId;
    this.ownerToken = ownerToken;
    this.virtualUsers = {};
  }

  // Initialize dry-run environment
  async initializeDryRun() {
    // Set policy to dry-run mode
    await fetch(`https://guardianservice.app/api/v1/policies/${this.policyId}/dry-run`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.ownerToken}` }
    });

    // Create virtual users
    this.virtualUsers = await createVirtualUsers(this.policyId, this.ownerToken);

    // Login virtual users
    this.virtualUsers.projectDeveloperToken = await loginVirtualUser(
      this.policyId,
      this.virtualUsers.projectDeveloper,
      this.ownerToken
    );

    this.virtualUsers.vvbToken = await loginVirtualUser(
      this.policyId,
      this.virtualUsers.vvb,
      this.ownerToken
    );
  }

  // Execute complete project lifecycle
  async executeCompleteWorkflow() {
    try {
      // Step 1: Project Developer submits PDD
      const pddResult = await this.submitPDD();
      console.log('PDD submitted:', pddResult.id);

      // Step 2: VVB registers for validation
      const vvbResult = await this.registerVVB();
      console.log('VVB registered:', vvbResult.id);

      // Step 3: VVB validates project and submits validation report
      const validationResult = await this.submitValidationReport(pddResult.id);
      console.log('Validation completed:', validationResult.id);

      // Step 4: Project Developer submits monitoring reports
      const monitoringResults = await this.submitMonitoringReports(pddResult.id);
      console.log('Monitoring reports submitted:', monitoringResults.length);

      // Step 5: VVB verifies monitoring and submits verification report
      const verificationResult = await this.submitVerificationReport(monitoringResults[0].id);
      console.log('Verification completed:', verificationResult.id);

      // Step 6: Get final artifacts and token information
      const artifacts = await this.getArtifacts();
      console.log('Workflow completed with artifacts:', artifacts.length);

      return {
        pdd: pddResult,
        validation: validationResult,
        monitoring: monitoringResults,
        verification: verificationResult,
        artifacts: artifacts
      };

    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  async submitPDD() {
    return submitPDD(this.policyId, vm0033PddData, this.virtualUsers.projectDeveloperToken.accessToken);
  }

  async registerVVB() {
    const blockId = 'aeab02d2-d7fc-4d7a-93a5-947855da95c7'; // VVB registration block
    const endpoint = `https://guardianservice.app/api/v1/policies/${this.policyId}/blocks/${blockId}`;

    const vvbData = {
      document: {
        vvb_details: {
          organization_name: "Automated Testing VVB",
          accreditation_scope: "Wetland restoration methodologies",
          lead_auditor: "API Test Lead"
        },
        capabilities: {
          vm0033_experience: true,
          wetland_expertise: true,
          site_visit_capability: true
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.virtualUsers.vvbToken.accessToken}`
      },
      body: JSON.stringify(vvbData)
    });

    return response.json();
  }

  async getArtifacts() {
    const endpoint = `https://guardianservice.app/api/v1/policies/${this.policyId}/dry-run/artifacts`;
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${this.ownerToken}` }
    });
    return response.json();
  }
}

// Execute automated workflow
const workflow = new VM0033WorkflowAutomation('689d5badaf8487e6c32c8a2a', ownerToken);
workflow.initializeDryRun()
  .then(() => workflow.executeCompleteWorkflow())
  .then(results => console.log('Complete workflow executed:', results))
  .catch(error => console.error('Workflow failed:', error));
```

## Automated Testing Frameworks

### Cypress Testing Integration

Building on Guardian's API patterns, you could create automated testing suites that validate methodology implementation across multiple scenarios.

**VM0033 Cypress Test Suite(Sample):**

```javascript
// cypress/integration/vm0033-methodology.spec.js
describe('VM0033 Methodology End-to-End Testing', () => {
  let policyId = '689d5badaf8487e6c32c8a2a';
  let authTokens = {};

  beforeEach(() => {
    // Login and get authentication tokens
    cy.login('standard_registry', 'password').then((token) => {
      authTokens.owner = token;
    });
  });

  it('should execute complete VM0033 workflow via API', () => {
    // Initialize dry-run mode
    cy.request('PUT', `/api/v1/policies/${policyId}/dry-run`, {}, {
      headers: { 'Authorization': `Bearer ${authTokens.owner}` }
    }).then((response) => {
      expect(response.status).to.eq(200);
    });

    // Create virtual users
    cy.request('POST', `/api/v1/policies/${policyId}/dry-run/user`, {
      role: 'Project_Proponent'
    }, {
      headers: { 'Authorization': `Bearer ${authTokens.owner}` }
    }).then((response) => {
      const virtualUser = response.body;

      // Submit PDD using virtual user
      const pddData = {
        document: {
          project_details: {
            G5: 'Cypress Test Project',
            project_description: 'Automated test wetland restoration'
          }
        }
      };

      cy.request('POST', `/api/v1/policies/${policyId}/blocks/aaa78a11-c00b-4669-9022-bd2971504d70`, pddData, {
        headers: { 'Authorization': `Bearer ${virtualUser.accessToken}` }
      }).then((pddResponse) => {
        expect(pddResponse.status).to.eq(200);
        expect(pddResponse.body).to.have.property('id');
      });
    });
  });

  it('should validate calculation accuracy against test artifacts', () => {
    // Load VM0033 test case data
    cy.fixture('vm0033-test-case.json').then((testData) => {
      // Submit test data and verify calculations
      cy.request('POST', `/api/v1/policies/${policyId}/blocks/aaa78a11-c00b-4669-9022-bd2971504d70`, {
        document: testData.input
      }, {
        headers: { 'Authorization': `Bearer ${authTokens.owner}` }
      }).then((response) => {
        // Verify calculation results match expected values
        const calculatedValues = response.body.calculatedValues;
        expect(calculatedValues.baseline_emissions).to.be.closeTo(testData.expected.baseline_emissions, 0.01);
        expect(calculatedValues.project_emissions).to.be.closeTo(testData.expected.project_emissions, 0.01);
        expect(calculatedValues.net_emission_reductions).to.be.closeTo(testData.expected.net_emission_reductions, 0.01);
      });
    });
  });

  it('should handle concurrent user operations', () => {
    // Test multiple users submitting data simultaneously
    const userPromises = [];

    for (let i = 0; i < 5; i++) {
      const promise = cy.request('POST', `/api/v1/policies/${policyId}/dry-run/user`, {
        role: 'Project_Proponent'
      }, {
        headers: { 'Authorization': `Bearer ${authTokens.owner}` }
      }).then((userResponse) => {
        return cy.request('POST', `/api/v1/policies/${policyId}/blocks/aaa78a11-c00b-4669-9022-bd2971504d70`, {
          document: { project_details: { G5: `Concurrent Project ${i}` } }
        }, {
          headers: { 'Authorization': `Bearer ${userResponse.body.accessToken}` }
        });
      });

      userPromises.push(promise);
    }

    // Verify all concurrent submissions succeed
    cy.wrap(Promise.all(userPromises)).then((responses) => {
      responses.forEach((response, index) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('id');
      });
    });
  });
});
```

## Chapter Summary

API integration transforms Guardian methodology implementations from manual processes into automated, scalable systems. Using VM0033's patterns, you can automate data submission, integrate with external monitoring systems, build comprehensive testing frameworks, and manage production operations efficiently.

### Key API Integration Patterns:

**Automated Data Submission:**

* PDD and monitoring report API automation using requestVcDocumentBlock endpoints
* Multi-year monitoring data generation and submission workflows
* Error handling and validation for automated submissions

**Dry-Run API Operations:**

* Virtual user creation and management for multi-stakeholder testing
* Programmatic workflow execution and validation
* Artifact collection and analysis for testing validation

**External System Integration:**

* IoT sensor data transformation and submission to Guardian monitoring workflows
* Registry integration with automated project listing and status synchronization
* Real-time data pipeline integration for continuous monitoring operations

**Production API Management:**

* Rate limiting and retry logic for robust production operations
* Performance testing and load validation for production scalability
* Error handling and monitoring for long-term operational reliability

### Implementation Workflow:

1. **Establish API authentication** and access token management
2. **Map policy block IDs** to API endpoints using policy JSON structure
3. **Build automation scripts** for data submission and workflow execution
4. **Create testing frameworks** using Cypress and Guardian's dry-run APIs
5. **Integrate external systems** through data transformation and API orchestration
6. **Deploy production monitoring** with error handling and performance optimization

API integration enables methodology implementations that scale from prototype testing to production operations, supporting hundreds of projects and thousands of stakeholders while maintaining accuracy and compliance with methodology requirements.

***

**Next Steps:** This completes Part VI: Integration and Testing. Your methodology implementation is now ready for production deployment with comprehensive testing coverage and scalable API automation capabilities.

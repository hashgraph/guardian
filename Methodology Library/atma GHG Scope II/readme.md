# Overview 

The overall objective of this policy is to monitor Greenhouse Gas (GHG) emissions during the production life cycle stage for products within the atma.io digital product cloud. The calculation and tracking of emission data is based on the energy consumption during the production of a single item or batch of items.

The calculated GHG emissions are then published to a dedicated topic for easier display outside of the policy. At the end of each month the total emissions are aggregated and a emission token is minted. 

![](C:\Users\0157209\guardian-contrib\guardian\Demo Artifacts\atma GHG Scope II\ProcessOverview.png)

The policy was written and tested with version 2.6.3 of Guardian.   

## Roles

The policy comprises of a single role, outside of the standard registry, which is the organization or company responsible for tracking their product.

In the future, multiple roles may be added as different organizations may be involved in the product's life cycle.

## Setup

The emission tokens (fungible) are tied to the product, therefore it is necessary to create a separate instance of the policy for each product being tracked.

Before the policy can be used to track the GHG emissions during the production lifecycle, the following information must be stored within the policy:

- **Organization**: The organization associated with the product and its associated methodologies.
- **Entity**: The entities within the organization that are responsible for tracking the emissions.
- **Product**: Detailed information about the product, including its production process and materials used.
- **Lifecycle Stage**: The specific stage of the product's lifecycle that the emissions are being tracked for. Currently, only the 'production' stage is supported by the policy.
- **GHG Source**: The specific Green House Gas source associated with the lifecycle stage. This includes values such as "emission factors" and "global warming potentials"  which are used in the policy's emission calculation.

## Usage

Once the initial the setup is completed the policy is now able to receive production information and convert the energy consumption. 

Production data can be capture from within the guardian front-end via the 'Record Production Data' link in the "GHG Source" tab.  However are more typical use case for the policy is that this information is sent via Guardian API.  The included Postman collection also demonstrates how to submit production data programmatically to the policy

Additionally tokens `ProductToken` and `AtmaCarbonEmissionToken`   must be associated with the user that is interacting with the policy, this too can be done from within the guardian front end.

Once these steps are completed the rest of the data can be filled out by following the policy flow in the UI or using the postman collection with also includes plausible sample data. 

## Postman Collection 

To facilitate the quick setup of the policy a postman collection is included which automates the steps of setting up the policy. 

In order to run the postman collection a role (i.e. *organization*) should already be selected via the Guardian web interface. 

The following collection level variables must be set in postman before executing the collection.

| Variable          | Description                                                  | Example                             |
| ----------------- | ------------------------------------------------------------ | ----------------------------------- |
| `BASE_URL`        | Base URL of the Guardian API                                 | `https://example-server.com/api/v1` |
| `POLICY_NAME`     | policy Id, can be found in the URL of the policy editor in the guardian front-end | `63d0d96a3eb29608b2e30783`          |
| `POLICY_USER`     | username of the policy user                                  | `standard-user-123`                 |
| `POLICY_PASSWORD` | password of the policy user                                  | `hunter3`                           |

Afterwards the postman collection can be executed, either manually by triggering each request in sequence or automatically by running the collection as whole. 

**Note:** Since the Guardian API handles requests asynchronously, it may happen that requests fail initially due to unprocessed dependent data from previous requests. In such cases, it is advisable to simply retry the request. When running the Postman collection using the collection runner, it is recommended to use a timeout of 20,000 ms between requests to avoid this issue.

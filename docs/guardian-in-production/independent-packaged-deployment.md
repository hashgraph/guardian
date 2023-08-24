# Independent Packaged Deployment

## Introduction

Providing customers with a deployable solution that is easy to use and customizable. Customers expect the solution to work seamlessly right out of the box without requiring any additional configuration or setup. However, at the same time, they also want the flexibility to choose which components of the solution they want to deploy.

For example, in the case of a service standalone, customers may not want to deploy the front-end code, as it may not be relevant to their specific needs. Therefore, the solution must be designed in such a way that customers can easily select which components they want to deploy and which ones they want to exclude.

This level of extensibility is critical in ensuring that customers can tailor the solution to their unique requirements, without having to deal with unnecessary complexity or bloat. By providing customers with the ability to customize the solution to their needs, businesses can increase customer satisfaction and improve the overall user experience.

## Dependency tree

An important step for Guardian project to work as a deployable modular solution out of the box is to catalog its services and determine:&#x20;

* which ones are more likely to be replaced by others with exactly the same functionality but deployed using different infrastructure. An example of this could be an external mongodb DBaaS.
* which ones could be replaced with others with some compatibility (these are the ones that require more effort from a development perspective). An example of this could be to replace Vault with AWS secrets manager.
* which ones are optional, and aren’t required to provide the core functionality of Guardian. An example of this could be the frontend or api-docs.

For this purpose, a services dependency tree can be found below. In that tree, services are ordered based on the number of dependents, from the ones required by the highest number of other services, to the ones with less dependent services. A service with no dependents is more likely to be optional.

Furthermore, the services are grouped into external and internal ones. External services are more likely to be replaced by client managed ones or SaaS (we can also refer to them as third-party services).

### External (third-party services)

#### with dependants

* &#x20; mongo:6.0.3
* &#x20; mongo-express:1.0.0-alpha.4
  * &#x20; mongo
* &#x20; ipfs/kubo:v0.18.1
* &#x20; message-broker:2.9.8
* &#x20; vault:1.12.2

### Internal ( Guardian services )&#x20;

#### without dependencies but with dependants

* &#x20; api-docs
* &#x20; mrv-sender
* &#x20; topic-viewer

#### with dependencies and dependants

* &#x20; logger-service
  * &#x20; message-broker
* &#x20; auth-service
  * &#x20; mongo
  * &#x20; vault
  * &#x20; logger-service
* policy-service
  * &#x20; auth-service
* worker-service-1
  * &#x20; ipfs-node
  * &#x20; auth-service
* &#x20; worker-service-2
  * &#x20; ipfs-node
  * &#x20; auth-service
* guardian-service
  * &#x20; worker-service-1
  * &#x20; worker-service-2
  * &#x20; policy-service
* &#x20; api-gateway
  * &#x20; guardian-service

#### with dependencies but without dependants&#x20;

* &#x20; application-events
  * &#x20; guardian-service
* &#x20; web-proxy
  * &#x20; mongo-express (optional)
  * &#x20; api-docs (optional)
  * &#x20; mrv-sender (optional)
  * &#x20; api-gateway (optional)

## Roadmap Proposal

### Initial phase

Dependency on the first phase of Cloud Infrastructure topic.

#### Make internal services optional

Using configuration flags when installing or upgrading a Guardian instance, the user will be able to select which services to install. Take this yaml snippet as example:

```
internal_services:
	logger_service: true
	auth_service: true
	proxy_service: true
	guardian_service: true
	worker_service: true
	api_gateway: true
	application_events: false
	web_proxy: false
```

#### Direct replacement of external services&#x20;

Using configuration items, the user will be able to replace external services.

The replacement services must guarantee a secure way for Guardian to reach them.

It’s out of the scope of this document the setup and maintenance of those services.

For a production workload it’s recommended to replace the external servers using this approach.

```
mongodb:
	use_internal: true|false
	host: <needed when use_internal==false>
	username: <needed when use_internal==false>
	password: <needed when use_internal==false>
```

### Second phase

Dependency on 1 click deployment on different cloud providers, Cloud Infrastructure topic.

#### External services replacement with cloud provider SaaS

Using the IaC codebase settings, the user will be able to replace some external services with the managed equivalents provided by the cloud provider.

Those replacements will be deployed and configured  as part of the Guardian 1 click deployment.

Find below a couple examples of the use case for this milestone, for better understanding of it.

#### **Use case 1: a client wants to use AWS DocumentDB as a replacement for MongoDB.**

DocumentDB is a fully compatible direct replacement for MongoDB, so no backend development is needed. With the previous milestone the clients are capable of configuring the DocumentDB on their own, and then add the connection settings to the values.yml used by Helm to set up the Guardian instance. After finishing this milestone, which would add an additional module to the AWS terraform project, the DocumentDB itself will be created by terraform at the same time of spawning the Kubernetes cluster, by modifying the terraform variables; and the connection settings passed automatically to Helm to tight everything together. Additionally, the internal MongoDB instance won’t be installed.

#### **Use case 2: a client wants to use GCP Secret Manager as a replacement for Vault.**

GCP Secret Manager is a “same features replacement” for Vault, so the backend has to have logic to use the specific driver depending on the configuration provided. An additional module will be added to the GCP terraform project, which will register a vault for Guardian at the same time the Kubernetes cluster is created, and the configuration will be passed to the backend services to use the Secret Manager driver to fetch secrets instead of the default one (Hashicorp Vault). Additionally, the internal Vault instance won’t be installed.

**NOTE**: For now, the only service that supports this “equal features replacement” is Vault, which has an ongoing development on backend side to allow using different keyrings for the secrets storage purpose.

### Third phase with specific tools added

#### Security analysis tool - SonarQube Open source integration

Integrating a Node.js application with SonarQube is important for analyzing code security as it provides a powerful static analysis tool for identifying potential security vulnerabilities in the code. SonarQube is an open-source platform that supports various programming languages and provides a range of security-focused features, such as code scanning, vulnerability detection, and code quality analysis.

By integrating a Node.js application with SonarQube, developers can gain insights into the security and quality of their codebase, enabling them to identify and fix potential issues early on in the development process. This can help reduce the risk of security breaches and ensure that the codebase is reliable and maintainable.

SonarQube provides a range of security-focused plugins and rulesets for Node.js applications, including those for detecting common vulnerabilities such as SQL injection, cross-site scripting (XSS), and command injection. It also provides detailed reports and visualizations that help developers understand the severity and impact of any security issues that are identified.

In addition to security analysis, SonarQube can also help developers identify areas of the codebase that require refactoring or optimization, improving the overall quality and performance of the application.

Overall, integrating a Node.js application with SonarQube is an important step in ensuring the security and quality of the codebase. By using SonarQube's powerful static analysis tools, developers can identify and address potential security vulnerabilities and code quality issues, helping to ensure the reliability and maintainability of the application.

To add SonarQube to a Node.js project pipeline with GitHub, you can follow these general steps:

* Install and configure SonarQube:
* Install SonarQube server locally or use a cloud-based SonarQube service
* Install and configure SonarScanner for your Node.js project
* Create a SonarQube project:
* Create a new SonarQube project and generate a project key
* Assign permissions to the project to allow access from your pipeline
* Add SonarQube to your pipeline:
* Define the SonarScanner command in your pipeline script
* Add a SonarQube step to your pipeline configuration to run the scanner
* Pass the SonarQube project key and access token as environment variables
* Configure your GitHub repository:
* Add a webhook to trigger the pipeline when code is pushed to the repository
* Create a personal access token for the pipeline to access the repository
* Store the access token securely as a GitHub secret

Here's a sample pipeline configuration using GitHub Actions and SonarCloud:

```
name: Node.js CI with SonarCloud
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_PROJECT_KEY: your_project_key
```

Note: You'll need to replace your\_project\_key with the actual project key for your SonarQube project, and configure the SONAR\_TOKEN secret with an access token generated in your SonarCloud account.

# ⬆ Upgrading

## Introduction

This document can be used as a tool to implement an upgrade process in the Hedera Guardian application. It provides detailed step-by-step instructions for upgrading an open-source Hedera Guardian application from the current version to the target version. It includes expanded information and additional guidance for each section of the upgrade process. Please follow the instructions outlined below:

### Actors and Participants

The actors that will be involved in the guardian upgrading process are:

* Guardian Development Team
  * Solution development.
  * Documentation provisioning.
* Guardian Administrator (customer side)
  * Backup execution.
  * Scripting Execution.
  * Configuration customization.

## Theory

### Requirements

Depending on how large the upgrades are, there could be a lot of work keeping versions correct. Proper tools, documentation, and methodologies should be created to respond to upgrade needs (How will our customers upgrade their solution? What solutions need to be put in place? Etc.)

Related requirements:

1. Find a qualified source to create an enterprise-grade version of Guardian;
2. Consolidate, package, and normalize the solution architecture to match development best practices, supporting existing Hedera environments (currently defined as a local node, testnet, previewnet, or mainnet) **deployed on-premises and on clouds**;
3. **Cloud Infrastructure**: All Guardian source code and secrets should be deployed via **Infrastructure as Code in cloud**. In particular, the repo should contain all the artifacts and the documentation for the deployment of the Guardian on **Amazon Web Services**, **Google Cloud Platform** and **Microsoft Azure.**

### **Data Upgrading Process**

The upgrading of the Guardian functionalities may include the necessity of applying changes in the database schemas. In this case the Process of Upgrading is split between Developer and Customer.

Data Upgrading process involves the developer team providing the solution for Upgrading while the Customer is the solution executer. The main problem while upgrading a run time operational database is the migration of all data from the previous version schema to the new version.

The migration process guides the team to produce artifacts that will help to correctly define the migration itself and the customer to decide for upgrading and executing the data migration.

In this case the migration that we account for is an homogeneous migration: a migration from source databases to target databases where the source and target databases are of the same database management system. During upgrading the system, the schemas for the source and target databases are almost identical except for changes in some of the fields, collections and documents. For changing data the source databases must be transformed during migration.

<figure><img src="https://lh6.googleusercontent.com/Qrl-sFH7iOX48hMQd-2WenXxx_MZrwlzZt25Wje3PJlvtu7Y-o8rMKUJ4VcPWT7gLTjkuO72YK_xN073UyTYBcciEXyLVV_C8nxzwkwSlmhiUmPHM4n3cEBaLqTHgxbFTETL44x-F8UbZ19CUDk1yz4" alt="" width="563"><figcaption></figcaption></figure>

#### 1) Data Migration Profiling:

Without a good understanding of the Data model the organization could run into a critical flaw that halts the system and brings Guardian to stop for data corruption and inconsistency. This phase would have “Data Migration Model” as output. This document outlines all the data that needs to be migrated, the complete mapping between the Data Source and Data Destination and every transformation in terms of:

* **Data type**: to cast the source value into the target value based on type transformation rules.
* **Data structure**: to describe modification of the structure of a collection in the database model.
* **Data value**: to change the format of data without changing the data type.
* **Data enrichment and correlation** (adding and merging to one collection).
* **Data reduction and filtering** (splitting to several collections).
* **Data views**: to allow the maintenance of DAO contracts during Data reduction.

Furthermore, the document should:

* Map every data to User Functionality (Rest API) that involves that data.
* Map every data to messages data flows to realize the functionality.
* Specify data replication in the guardian data sources (only DB Data, Blockchain Data, Multi Service).
* Break the data into subsets to determine all the data changes that have to be applied together.

The document has to specify the following data parameters:

* Expected size of your data,
* the number of data sources,
* the number of target systems,
* Migration time evaluation per data size reading, writing, network latency and the expected time per expected data size.

#### 2) **Design phase**: this phase has the “Design Document” as output.

The type of data migration could be either big bang or trickle:

* In a big bang data migration, the full transfer is completed within a limited window of time. Live systems experience downtime while data goes through ETL (Extract, transform, load) processing and transitions to the new database.
* Trickle migrations, in contrast, complete the migration process in phases. During implementation, the old system and the new are run in parallel, which eliminates downtime or operational interruptions. Processes running in real-time can keep data migrating continuously.

The document should contain:

* the requirements and the timeline for the project. Allocate time for every testing phase and validation phase.
* Should define the migration type as described above.
* Should consider [security plans](https://www.talend.com/resources/gdpr-pillar-3-anonymize-pseudonymize/) for the data. Any data that needs to be protected should have protection threaded throughout the plan.
* Establish data quality and health checks by determining which[ data integrity problems](https://www.talend.com/resources/reduce-data-integrity-risk/) could arise from your data set.
* The Migration process needs to be detailed, taking care of:
  * Target database addressing using environment description.
  * Persistence of in-transit data: To resume at the point where special events happen, the system needs to keep an internal state on the migration progress: Errors, Connection Lost, large window processing of the data, provides process repeatability.
  * Define how to track the items that are filtered out from transformation/migration phases , you can then compare the source and target databases along with the filtered items.
  * For every batch of data define the exact plan and roll back strategy
  * Define Customer test to verify consistency: This check ensures that each data item is migrated only once, and that the datasets in the source and target databases are identical and that the migration is complete.
* Define roles and responsibilities of the data migration.
* A Validation phase has to be defined with:
  * Who has the authority to determine whether the migration was successful?
  * After database migration, who will validate data?
  * Which tool will help in data validation: this tool will be the main instrument to verify data consistency. This check ensures that each data item is migrated only once, and that the datasets in the source and target databases are identical and that the migration is complete.
* Define backup and disaster recovery strategies. Create a DB backup of Mongo: replica set is a very good solution for availability but to provide real backup solution define a dedicated backup Mongo copy.

#### 3) Build the Migration Solution

Break the data into subsets and build out migration of one category at a time, followed by a test. (TOOL) The Developer

#### 4) Build the consistency validation Test

Build the customer check to compare the source and target databases along with the filtered items.

#### 5) Back up

The data before executing. In case something goes wrong during the implementation, you can’t afford to lose data. Make sure there are backup resources and that they’ve been tested before you proceed (MongoDB: Replica set).

#### 6) Conduct a Live Test

The testing process isn’t over after testing the code during the build phase. It’s important to test the data migration design with real data to ensure the accuracy of the implementation and completeness of the application: consistency test. (TOOL)

#### 7) Execute the plan

Implementing what described in step 2. (TOOL)

Migrate data in batches. Migration can take a long time, so batching up the data will prevent any interruption in service. Once the first batch is successfully migrated and tested, you can move on to the next set and revalidate accordingly.

#### 8) Test your migration process

During the first batch of data being migrated, try to analyze all the steps and see if the process is completed successfully or if it needs to be modified before moving on to the next batch.

#### 9) Validation Test

You need to verify that your database migration is complete and consistent. Before you deploy this production-level data, test the new data with real life scenarios before moving it to production in order to validate that all the work done aligns with the overall plan.

#### 10) Audit

Once the implementation has gone live, set up a system to audit the data in order to ensure the accuracy of the migration. (Performance and monitoring)

### Migration Consistency

The expectation is that a database migration is consistent. In the context of migration, consistent means the following:

* **Complete**. All data that is specified to be migrated is actually migrated. The specified data could be all data in a source database or a subset of the data.
* **Duplicate free**. Each piece of data is migrated once, and only once. No duplicate data is introduced into the target database.
* **Ordered.** The data changes in the source database are applied to the target database in the same order as the changes occurred in the source database. This aspect is essential to ensure data consistency.

An alternative way to describe migration consistency is that after a migration completes, **the data state between the source and the target databases is equivalent**. For example, in a homogenous migration that involves the direct mapping of a relational database, the same tables and rows must exist in the source and the target databases.

### Tools Comparison

#### Self scripted tools

These solutions are ideal for small-scale projects and quick fixes. These can also be used when a specific destination or source is unsupported by other tools. Self-Scripted Data Migration Tools can be developed pretty quickly but require extensive coding knowledge. Self-Scripting solutions offer support for almost any destination or source but are not scalable. They are suitable only for small projects. Most of the Cloud-Based and On-Premise tools handle numerous data destinations and sources.

* Scalability: Small and 1 Location
* Flexibility: any data
* Maintenance, error management, Issues during execution

Some reasons for building database migration functionality instead of using a database migration system include the following:

* You need full control over every detail.
* You want to reuse functionality.
* You want to reduce costs or simplify your technological footprint.

#### On-Premise tools

On-Premise solutions come in handy for static data requirements with no plans to scale. They are data center level solutions that offer low latency and complete control over the stack from the application to the physical layers.

* Data center migration level.
* Limited scalability.
* Secure: give full process control.

#### CloudBased tools

Cloud-Based Data Migration Tools are used when you need to scale up and down to meet the dynamic data requirements (mainly in ETL solution). These tools follow a pay-as-you-go pricing that eliminates unnecessary spending on unused resources.

* Based on the cloud.
* Big Scalability.
* Has security concerns.

#### Data Migration Software parameters

**Setup**: easy set up in your environment.

**Monitoring & Management:** provides features to monitor the ETL process effectively. Enable users to take reports on various crucial data sets.

**Ease of Use**: learning curve.

**Robust Data Transformation**: data transformation feature after the data is loaded into the database. You can just useSQL.

| <p><br></p>              | **Setup**                       | **Monitoring & Management** | **Ease of Use**                  | **Robust Data Transformation**      | **Pricing / Open Source**  |
| ------------------------ | ------------------------------- | --------------------------- | -------------------------------- | ----------------------------------- | -------------------------- |
| **Custom functionality** | Npm/Coding                      | no                          | Yes integrated in the solution   | Tested Npm tool: migrate-mongo      | free                       |
| **AWS Data Pipeline**    | yes                             | yes                         | yes                              | yes                                 | $0.60 to $2.5 per activity |
| **Hevo Data**            | yes                             | yes                         | yes (Autoschema mapping)         | yes                                 | FREE (1 million events)    |
| **Talend Open Studio**   | yes                             | no                          | By GUI                           | yes                                 | Open Source / Free         |
| **MongoSyphon**          | JSON format configuration files | No                          | no GUI, SQL, scheduling via cron | early stage tool, SQL               | Open Source / Free         |
| **Meltano**              | yes                             | Airflow                     | yes                              | yes                                 | Open Source / Free         |
| **Singer**               | Python                          | No                          | No                               | taps and targets (Meltano provided) | Open Source / Free         |
| **AirByte**              | yes                             | No                          | yes                              | SQL, dbt                            | Free                       |

Several other tools and pricing both on open source and commercial:

* [https://www.talend.com/resources/understanding-data-migration-strategies-best-practices/](https://www.talend.com/resources/understanding-data-migration-strategies-best-practices/)
* [https://hevodata.com/learn/best-mongodb-etl-tools/](https://hevodata.com/learn/best-mongodb-etl-tools/)
* [https://hevodata.com/learn/data-migration-tools/](https://hevodata.com/learn/data-migration-tools/#AzureDocumentDB)
* [https://blog.panoply.io/top-9-mongodb-etl-tools](https://blog.panoply.io/top-9-mongodb-etl-tools)
* [https://airbyte.com/](https://airbyte.com/)
* [https://cloud.google.com/architecture/database-migration-concepts-principles-part-1](https://cloud.google.com/architecture/database-migration-concepts-principles-part-1)

### Services Upgradability Service Profiling and data migration mapping

To describe services we introduce “Services canvas”. A microservice canvas is a concise description of a service. It’s similar to a CRC (Class-responsibility-collaboration) card that’s sometimes used in object-oriented design. This is a template which allows a synthetic description of the service itself both for developers and stakeholder clarity. It will be compiled by developers and architects, and will be used as input during the delivery of the data migration process.

It has the following section: Service Name, Managed Data, Dependencies, Service API.

Canvas wil be used to describe the development realized in that very release in a way to be introduced incrementally. The Upgrade canvas is built not as a complete Service Canvas, but it must only describe the upgrading of the service/functionalities. In this way it will directly contain the same items really implemented in the release. A complete description of the service could also be provided in a SERVICE CANVAS that is out of the scope of the upgrading, much more difficult to be produced and more design oriented than the document.

| **Main Parameters** | <p><br></p>                                  |
| ------------------- | -------------------------------------------- |
| Name                | Name of Service                              |
| Description         | <p><br></p>                                  |
| Type of Development | < Creation, Update, Deletion >               |
| Version             | < Major, Minor, Patch >                      |
| Capabilities        | <ul><li>Main Service Functionality</li></ul> |

| **Managed Data**     |                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Collection Names:    | <p><br></p>                                                                                                     |
| Type of Development: | < Creation, Update, Deletion >                                                                                  |
| Data Model Reference | <p>If Creation: Document JSON Document Reference Link</p><p>If Update: Data Mapping Document Reference Link</p> |

| **Dependencies**                                                                                                                                                                                                 |                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invokes                                                                                                                                                                                                          | Invoked by                                                                                                                                                                                    |
| <p>&#x3C;Service1Name>:</p><ul><li>Service1FunctionName()</li></ul><p>&#x3C;Service2Name>:<br></p><ul><li>Service2FunctionName()</li><li>….</li></ul><p><br></p>                                                 | <p>&#x3C;Service2Name>:</p><p><br></p><ul><li>Service3FunctionName()</li></ul><p><br></p><p>&#x3C;Service3Name>:</p><p><br></p><ul><li>Service2FunctionName()</li><li>….</li></ul><p><br></p> |
| Subscribes to                                                                                                                                                                                                    | Subscribed by                                                                                                                                                                                 |
| <p>&#x3C;Service3Name>:</p><ul><li>&#x3C;eventName1> event</li><li>&#x3C;eventName2> event</li></ul><p>Saga reply channels:</p><ul><li>&#x3C;SagaName1> Saga</li><li>&#x3C;SagaName2> Saga</li><li>…..</li></ul> | <p>&#x3C;Service3Name>:</p><ul><li>&#x3C;eventName1> event</li><li>&#x3C;eventName2> event</li></ul><p><br></p>                                                                               |

| **Service API**                                                                                                                                                                                                                                                                                                     |                                  |                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| Commands                                                                                                                                                                                                                                                                                                            | Queries                          | Events                                                                                    |
| <p>Created:</p><p>Synchronous:</p><ul><li>FunctionName1()</li><li>FunctionName2()</li><li>…..</li></ul><p>Asynchronous:</p><ul><li>FunctionName3()</li><li>…..</li></ul><p><br></p><p>Updated:</p><p>Synchronous:</p><p>……</p><p>Asynchronous:</p><p>Deleted:</p><p>Synchronous:</p><p>Asynchronous:</p><p><br></p> | <ul><li>getFunctions()</li></ul> | <ul><li>Created</li><li>Authorized</li><li>Revised</li><li>Canceled</li><li>...</li></ul> |

\
[https://chrisrichardson.net/post/microservices/general/2019/02/27/microservice-canvas.html#:\~:text=A%20microservice%20canvas%20is%20concise,used%20in%20object%2Doriented%20design.](https://chrisrichardson.net/post/microservices/general/2019/02/27/microservice-canvas.html)

#### Service versioning and compatibility

To describe the compatibility between services in more detail it is possible to provide a square compatibility matrix.

To build this matrix it is possible to start with a dependency matrix detailing all the services dependent from one another in terms of service producers and service consumers. This matrix won’t be a complete correlation matrix but on the rows it will have just the upgraded and new services while on the columns it will show all services in the application.

| <p><br></p>   | **service1** | **service2** | **service3** | **service4** | **service5** | **service6** |
| ------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ------------ |
| **Service 1** | <p><br></p>  | x            | x            | <p><br></p>  | <p><br></p>  | x            |
| **Service 3** | <p><br></p>  | <p><br></p>  | <p><br></p>  | x            | x            | <p><br></p>  |
| **Service 4** | <p><br></p>  | <p><br></p>  | x            | <p><br></p>  | <p><br></p>  | <p><br></p>  |
| **Service 6** | <p><br></p>  | x            | x            | x            | <p><br></p>  | <p><br></p>  |

Starting from this table it will be easier to infer the dependency between different versions of one service with the dependent ones versions.

For example

Service1 2.1.3 release is compatible with Service2 starting from version 1 until version 2.

Service1 2.1.3 is compatible with only with version 3.2.x of service3 and just bug fixes of that

Service 2.1.3 is backward compatible with with all versions of service6 until 4.x.x

Service 3.2.3 ……\\

| <p><br></p>                                                    | **service1** | **service2**             | **service3**            | **service4** | **service5** | **service6** |
| -------------------------------------------------------------- | ------------ | ------------------------ | ----------------------- | ------------ | ------------ | ------------ |
| **Service 1 2.1.3**                                            | <p><br></p>  | <p>1.x.x</p><p>2.x.x</p> | <p>3.2.x</p><p><br></p> | <p><br></p>  | <p><br></p>  | 4.x.x        |
| <p><strong>Service 3</strong></p><p><strong>3.2.3</strong></p> | …..          | ….                       | ….                      | <p><br></p>  | ..           | <p><br></p>  |
| **Service 4**                                                  | <p><br></p>  | <p><br></p>              | ..                      | <p><br></p>  | <p><br></p>  | <p><br></p>  |
| **Service 5**                                                  | <p><br></p>  | <p><br></p>              | ..                      | <p><br></p>  | <p><br></p>  | <p><br></p>  |
| **Service 6**                                                  | <p><br></p>  | ..                       | ..                      | ..           | <p><br></p>  | <p><br></p>  |

This solution is about to provide upgrading delta Online reference.

Here are two tools to implement the complete matrix analysis for microservices:

* [https://dzone.com/articles/dependency-structure-matrix-for-software-architect](https://dzone.com/articles/dependency-structure-matrix-for-software-architect)
* [https://www.ndepend.com/docs/dependency-structure-matrix-dsm](https://www.ndepend.com/docs/dependency-structure-matrix-dsm)

#### Data Model Reference

In case of newly introduced data, the data model section of the canvas will be the JSON document file that describes the collection itself.

In case of a data update, the reference Data Model will be the link to the Data mapping document.

The Data mapping document describes the model for the data migration. The document should outline all the data that needs to be migrated, the complete mapping between the Data Source and Data Destination and every transformation in terms of:

* **Data type:** to cast the source value into the target value based on type transformation rules.
* **Data structure:** to describe the structure modification of a collection in the database model.
* **Data value:** to change the format of data without changing the data type.
* **Data enrichment and correlation** (adding and merging to one collection).
* **Data reduction and filtering** (splitting to several collections).
* **Data views:** to allow the maintenance of DAO contracts during Data reduction.

The canvas Itself provides the framework in which the data belongs. Overmore the document should:

* Map every data to User Functionality (Rest API) that involves that data.
* Map every data to message data flows to realize the functionality.
* Specify data replication in the guardian data sources (only DB Data, Blockchain Data, Multi Service).
* Break the data into subsets to determine all the data changes that have to be applied together.

Here is how the mapping will look like

| Mapping Indicator | Change Description | Key Indicator | Source Collection | Source Field name | Source Field Length | Source Data Type | Business Rule                                            | Target Collection | Target Field Name | Target Data Type | Target Field Length | Description & comments |
| ----------------- | ------------------ | ------------- | ----------------- | ----------------- | ------------------- | ---------------- | -------------------------------------------------------- | ----------------- | ----------------- | ---------------- | ------------------- | ---------------------- |
| A                 | Split              | na            | Collection 1      | Field1            | 50                  | string           | Direct Mapping                                           | Collection2       | Field1            | string           | 50                  | <p><br></p>            |
| A                 | Split              | na            | Collection 1      | Field2            | 50                  | string           | Direct Mapping                                           | Collection3       | Field1            | string           | 50                  | <p><br></p>            |
| C                 | Split              | na            | Collection 1      | Field3            | 50                  | string           | <p>if "Sales" then "S"</p><p>if "Transport" then "T"</p> | Collection3       | Field2            | string           | 1                   | <p><br></p>            |

The following information is contained in the table:

1\) Mapping indicator (Values A: Add, D: Delete, C: Change)

2\) Change description (Indicates mapping changes introduced)

3\) Key Indicator (Indicates whether the field is a primary key or not)

4\) Source Table/Collection Name

5\) Source Field Name

6\) Source Field Length

7\) Source Field Data Type

8\) Source Field Description(The description will be used as a meta data for end user)

9\) Business Rule to transform data if needed

10\) Target Table/Collection Name

11\) Target Field Name

12\) Target Data Type

13\) Target Field Length

14\) Description and comments

### Methodologies, best practice for microservices upgrading

#### 1) Services should be organized around business domain boundaries:

Architects recommend the use of “separation of concerns”: strong internal cohesion in each microservice and loose coupling microservices should be grouped according to their problem domain.

Architects need to have a strong understanding of the relation between impacted use cases and backend data flows in a way to always map use case modification in backend microservices upgrading and know how data modification impacts interservices messages between consumer and produced services and their APIs.

A service here has the sole authority over its data and exposes operations to other services.

#### 2) Keep admin scripts together with the application codebase

Guardian migration consists of a small script that runs as the first step of every first time installation performing a one-time load. Is it possible to write a small function to read and save data in batch into the database running these scripts offline.

Guardian already deals with this problem: Due to the long-term nature of some sustainability projects, Policy Engine (PE) maintains unlimited ‘read’ backward compatibility with 'old’ schema definition language elements. In other words, new PE versions will recognize and be able to process all existing valid policies with schemas defined starting from the beginning of Guardian existence. ([https://docs.hedera.com/guardian/guardian/standard-registry/schemas/schema-versioning-and-deprecation-policy](https://docs.hedera.com/guardian/guardian/standard-registry/schemas/schema-versioning-and-deprecation-policy))

<figure><img src="https://lh6.googleusercontent.com/gH_1XRPtZCQYbAhwQ0h88RmJIPpYoWAEQWvHlVMIF1RRNtnxymKtclI7srYsap4qyjX52B-5Msbyz6xG5F_SHXV8pMWbUI-sUYKpmADDZf7udl-B4QdnDDHUveOzIdFrspoGNoyzBfUYYQsbP8dY3mg" alt="" width="563"><figcaption></figcaption></figure>

**Guardian dials with Schema breaking changes**

* Removing or renaming an element;
* Changing any of its non-descriptive properties e.g. type or readOnly status.

Deprecation Notice:

* Issued via the deprecated meta-data annotation;
* Release Notes;
* VC revocation notice is issued into the corresponding Hedera Topic.

[https://docs.hedera.com/guardian/guardian/standard-registry/policies/policy-versioning-and-deprecation-policy](https://docs.hedera.com/guardian/guardian/standard-registry/policies/policy-versioning-and-deprecation-policy)

**Guardian dials with Policy Breaking changes**

* Removing or renaming a block, changing any of its non-descriptive properties.
* Changing used schema version to a new one with breaking changes. **(Changes Impact)**
* Changing workflow sequence, dependencies or bind block.
* Introducing new, or changing existing external data sources.

[https://docs.hedera.com/guardian/guardian/standard-registry/policies/api-versioning-and-deprecation-policy](https://docs.hedera.com/guardian/guardian/standard-registry/policies/api-versioning-and-deprecation-policy)

**Guardian dials with Breaking changes in general**

* Removing an API endpoint, HTTP method or enum value;
* Renaming an API endpoint, HTTP method or enum value;
* Changing the type of the field;
* Changing behavior of an API request.

#### 3) Every microservice should always explicitly declare all of its dependencies.

We should do this using a dependency declaration manifest. For NodeJS we have **NPM**.

A different possibility could be the use of dependency Management tools:

**ORTELIUS**: Ortelius is an open source, supply chain evidence catalog for publishing, versioning and sharing microservices and other Components such as DB objects and file objects. Ortelius centralizes everything you need to know about a component-driven architecture including component level ownership, SBOMs, vulnerabilities, dependency relationships, key values, deployment metadata, consuming applications and versions.

\
**ISTIO**: A completely different approach that has been found during the preparation of the present methodology. The approach suggests the usage of the Service Mesh pattern for microservices. Also this choice represents a viable path but needs rethinking to the platform architecture. Also the Documenting path proposed here will naturally facilitate the assumption of a similar pattern.

#### 4) A microservices app should be tracked in a single code repository and must not share that repository with any other apps.

Track it in a version control system. [Git](https://git-scm.com/) is the most popular version control system in use today and is almost ubiquitous.

**Versioning:**

All microservices should make it clear what version of a different microservice they require and what version they are.

A good way of versioning is through semantic versioning, that is, keeping versions as a set of numbers that make it clear when a breaking change happens (for instance, one number can mean that the API has been modified).

<figure><img src="https://lh6.googleusercontent.com/x8r8JqXXt9WeTdmc3x8FX20iQ756f5zb2l1bjMqGvBa82TRO4spDi7nVIDJdDWkizSkoo4-NJsmrAZF1iEyjlhai7D-BwdbSqt7tOHCDQ1JTGAKfXQECpNkF18mBH7uBu-ZXtmgs-3HRUan52LHOrY8" alt="" width="563"><figcaption></figcaption></figure>

**Version Technique**

* URI versioning: In this approach, developers add version information directly to a service's [URI](https://www.techtarget.com/whatis/definition/URI-Uniform-Resource-Identifier), which provides a quick way to identify a specific version of the service by simply glancing at either the [URL or URN](https://www.cbtnuggets.com/blog/technology/networking/networking-basics-whats-the-difference-between-uri-url-and-urn). Here's an example of how that looks:
  * [http://productservice/v1.1.2/v1/GetAllProducts](http://productservice/v1.1.2/v1/GetAllProducts)
  * [http://productservice/v2.0.0/GetProducts](http://productservice/v2.0.0/GetProducts)
* Header versioning: This microservice versioning approach passes version information through the HTTP protocol header “content-version” to specify a particular service.

#### 5) Microservice apps are supposed to dispose of a service and to handle it gracefully.

Application processes can be shut down on purpose or through an unexpected event. An application process should be completely disposable without any unwanted side-effects. Moreover, processes should start quickly.

An important part of managing dependencies has to do with what happens when a service is updated to fit new requirements or solve a design issue. **Other microservices may depend on the semantics of the old version or worse: depend on the way data is modeled in the database.**\
As microservices are developed in isolation, this means a team usually cannot wait for another team to make the necessary changes to a dependent service before going live. The way to solve this is through versioning. **All microservices should make it clear what version of a different microservice they require and what version they are.**\\

#### 6) Microservice apps are expected to run in an execution environment as stateless processes.

In other words, they can not store persistent state locally between requests.

## Upgrading Guardian

Guardian is a Microservices Application organized with an API Gateway and the Message System NATS. This architecture is natively thought of as a cloud application so it can be improved by deploying on cloud.

There are several benefits in deploying microservices architectures on cloud thanks to the Application Managers:

* The microservices are deployed independently and communicate by APIs. (We got it)
* The overall infrastructure gains resiliency to node failures. (Application Manager)
* The containerization can give the application bigger portability. (We got it)
* CI/CD strategies and automation are applicable to the microservices, making development cycles fast. (Could be implemented)
* It allows automatic resource allocation following the user demand and scaling the infrastructure horizontally.
* It allows the application to upgrade and maintain the availability of the overall system.

Our main target cloud infrastructures are: Azure, AWS, Google.

Although cloud targets infrastructures, **Azure** and **AWS**, namely, offer their own Containerized Application Manager infrastructure. Google developed the **Kubernetes** platform that became the standard de facto in the area. Overmore it is an open source platform so it is possible to use it on-premise as well. So Kubernetes became one of the most important Cloud Agnostic solutions. Both Azure and AWS provides their own container manager solution:

* Azure Container Apps (based on Kubernetes platform and technologies like [Dapr](https://dapr.io/), [KEDA](https://keda.sh/), and E[nvoy](https://www.envoyproxy.io/)),
* Azure App Services, optimized for web services **enables the deployment**:
  * From source code (gain cloud dependency);
  * From docker image;
  * From the docker-compose.yml file (the docker containers are inside a single AppService,single POD, rather than multiple AppServices as one might expect.)

and

* Amazon elastic container registry.

At the same time, they offer services that grant direct access to Kubernetes: Azure has its **Azure Kubernetes Service (AKS)** while AWS has Amazon **EKS (and obviously on EC2)**.

When it comes to physical upgrades what we want is for customers to be able to upgrade Guardian in the cloud that they choose to go with for their enterprise solution. There will be the need to deploy new versions **without downtime** to maintain overall application stability. Every service will rely on others to be up and running, so you also need to maximize the availability of every service.

Three common deployment patterns are available for zero-downtime deployments:

• **Rolling deploy** — You progressively take old instances (version N) out of service while you bring up new instances (version N+1), ensuring that you maintain a minimum percentage of capacity during deployment.

• **Canaries** — You add a single new instance1 into service to test the reliability of version N+1 before continuing with a full rollout (A-B TESTING). This pattern provides an added measure of safety beyond a normal rolling deployment.

• **Blue-green deploys** — You create a parallel group of services (the green set), running the new version of the code; you progressively shift requests away from the old version (the blue set). This can work better than canaries in scenarios where service consumers are highly sensitive to error rates and can’t accept the risk of an unhealthy canary.

## Implementation : Upgrade Guide for Hedera Application

The methodology that we follow to upgrade the system is the Blue-Green deployment. This allows us to upgrade while minimizing the downtime and the risks involved in the upgrade itself. We create a new instance of Guardian running the new version, the green instance, and in this instance we run all the tests, after which, we switch all the traffic on this. The current environment, the blues one, runs at the same time and continues the normal operative.

The upgrade process requires that the team or the person running/executing the process should have minimum 3 to 5 years of experience in the following technologies to implement the upgrade process.

a. Backend development experience in NodeJS and npm packages.

b. MongoDB installation, using, and troubleshooting.

c. AWS or Azure experience of CLI and infrastructure.

d. Shell scripting, YAML, and Docker & Kubernetes.

The upgrade process should take between 40 and 80 hours, depending on the individual steps and any issues that arise during the process.

### Tasks Checklist prior to the upgrade

### Test on a copy of the production

In general, before initiating the upgrade process, it is highly recommended to create a copy of the production environment and perform testing on the replicated instance. By testing on a copy, you can identify and address any potential issues without impacting the live production environment.

* If any issues are encountered during the testing phase, take the appropriate steps to address them and resolve them before proceeding to the next steps.

For the Guardian Upgrade process the Green Instance will be the copy on which all the tests are going to be executed.

### Review the release notes and documentation

Thoroughly review the release notes and documentation provided for the target version. These resources will help you understand the changes, new features, and any potential breaking changes in the upgraded version.\\

<figure><img src="https://lh6.googleusercontent.com/2L368pX30ogGl4adgM3f911u1cwIBZg8wVnXPoe-ZHpi7X6FOe20Kh16yYU3itt6bozrpJKH_QP49QjMHGiNggmb70i2hD8M1um6YIpuqYvtJUeVXRKfJpT_JA4q3iA2X_xzHUwQ3sakOlk5Ns0SdTY" alt="" width="563"><figcaption></figcaption></figure>

You can find the installation guide and release notes for the target version in the Hedera Guardian [documentation](https://docs.hedera.com/guardian/guardian/readme/getting-started) and in the Guardian [official repository](https://github.com/hashgraph/guardian/releases).

### Perform a Database and Environment backup operation

It is essential to create a complete backup of the existing Hedera Guardian application and its associated databases before proceeding with the upgrade. This ensures that the application data is safeguarded and can be restored if needed.

Refer to this document, [Backup tool](https://docs.google.com/document/d/1PG7dKgKHigNBS-Bs5lHIdgwvObKzAWwkTLk1XY\_9M0s/edit), for more details.

While backing up consider that until release 2.13.0 environment was described by **.env.docker**

files in every of the following folders: ./guardian, ./\<service-name>/ and for the following services: api-gateway, auth-service, guardian-service, logger-service, policy-service and worker-service.

But starting with release 2.13.0 environment is holded by two different kind of files depending on the kind of installation:

1. Complete Ecosystem: `.env.<GUARDIAN_ENV>.guardian.system`

At folder: ./guardian/configs

2. Single Service: `.env.<GUARDIAN_ENV>.<service-name>`

At folder: ./guardian/\<service-name>/configs/

Make sure to back up all these files. As for an example, starting from the implementation provided at [Backup tool](https://docs.google.com/document/d/1PG7dKgKHigNBS-Bs5lHIdgwvObKzAWwkTLk1XY\_9M0s/edit):

1. configure /usr/local/bin to contain the whole guardian tree folders.
2. change line 6 of script configs-backup.sh from:

zip -r -D /tmp/configs.zip /usr/local/bin/configs

To

zip -i "\*env.\*" -r /tmp/configs.zip /usr/local/bin/guardian\\

This will ensure that the complete ecosystem environment is backed up.

### Perform Guardian Vault backup operation

Starting with release 2.12.1, Guardan can store secret data in dedicated KMS. It can be a self maintained Hashicorp vault server or third party KMS provided by a cloud infrastructure. This storage is mainly used to store user wallets for all the users as long as some important operational server side data (Operator: system wallet, IPFS api key, Access Token account).

KMS stored secret data also needs to be backed up too.

As an example, here is provided a script to backup Hashicorp Vault secrets. The execution of the script would provide the snapshot for the consul server that contains the Vault storage and copies the cryptographic material to access the vault after it is restored using the snapshot. The file could be added to Guardian Application to create the backup that is going to be stored in the file guardian/vault/hashicorp/backup/secret-backup.snap.

Create the file guardian/vault/hashicorp/scripts/consul/consul\_backup.sh with the following content.

### consul-backup.sh <mark style="color:green;">#!/bin/bash</mark>

```
BASE_DIR=$PWD/vault/hashicorp
BACKUP_DIR=$BASE_DIR/backup/
VAULT_ROOT_TOKEN_PATH=$BASE_DIR/vault/.root
CONSUL_ADDR=http://localhost:8500
```

<mark style="color:green;">**# Executes a vault read command using curl**</mark>

<mark style="color:green;">**# $1: URI vault path to be executed**</mark>

<mark style="color:green;">**# $2: name of the snapshot file**</mark>

```
read() {
 URL=$CONSUL_ADDR/$1
 OUTPUT=$BACKUP_DIR/$2
 curl $URL --output $OUTPUT
}
```

<mark style="color:green;">**# Execute the complete snapshot for the consul server**</mark>

`execute_backup() {`

<mark style="color:green;">**# create a backup dir /vault/hashicorp/backup**</mark>

`mkdir $BACKUP_DIR`

<mark style="color:green;">**# backup root access file**</mark>

`cp $VAULT_ROOT_TOKEN_PATH $BACKUP_DIR/.root`

<mark style="color:green;">**# copy TLS material**</mark>

`cp -r $CERT_REPOSITORY_DIR $BACKUP_DIR`

<mark style="color:green;">**# execute read from server and backup in secret-backup.snap**</mark>

```
 read v1/snapshot secret-backup.snap
}
echo "execute backup"
execute_backup
```

#### Ensure prerequisite accounts (Optional: Only for the first time installation)

Make sure you have a Hedera Testnet Account and a Web3.Storage Account readily available for the upgrade process. These accounts will be required during the upgrade process to facilitate compatibility and connectivity with the Hedera network.

\
Refer to the Hedera Guardian GitHub [repository](https://github.com/hashgraph/guardian) for more details.

#### Identify and document version-specific customizations

If the prior version of the Hedera Guardian application has been customized by your company to cater to specific requirements, thoroughly document all the customizations made. It is important to have a clear understanding of the changes to ensure a smooth transition to the upgraded version. Follow data upgrading process best practice for your custom data.

#### Identify performance behavior

Collect metrics from the current Guardian running instance to analyze performance, logs, and metrics to identify current instance behavior as of monitoring[ tools](https://docs.hedera.com/guardian/monitoring-tools) available for Guardian since release 2.12.1.

### Tasks Checklist during the upgrade

#### Clone the Guardian repository

Begin by cloning the Guardian repository using Git. Run the following command to clone the repository to your local environment:

git clone [https://github.com/hashgraph/guardian.git](https://github.com/hashgraph/guardian.git)

#### Follow the installation guide

Consult the installation guide provided in the Hedera Guardian documentation for the target version. This guide will provide detailed instructions on setting up and configuring the upgraded Guardian application in your environment.

Detailed installation steps can be found in the Guardian [installation guide](https://docs.hedera.com/guardian/guardian/readme/getting-started).

#### Update configuration files

Depending on the kind of installation that you are following: running as docker containers by an orchestrator(docker compose) or running manually after building executables, modify the relevant configuration files to include the necessary information for your account. This information is essential for establishing the connection with the Hedera network and IPFS while enabling seamless interaction with the blockchain.

Upgrading to a release later than 2.13.0, the configuration files differ from previous versions:

* for the execution by the orchestrator, first configure the .env file in the Guardian Application folder. Copy and paste the .env.template and configure the variables there, mainly the GUARDIAN\_ENV. Then configure the right file `.env.<GUARDIAN_ENV>.guardian.system` at folder ./guardian/configs, and finally copy and paste `.env.template.guardian.system` as with the examples provided in the folder itself.
* for the manual execution in the same node or in the free deployment style, you need to configure each of the services separately. Configure first the ./\<service-name>/.env file for each of the services and, secondly, configure `.env.<GUARDIAN_ENV>.<service-name>` at folder ./guardian/\<service-name>/configs/. Finally, copy and paste `.env.template.<service-name>` as with the examples provided in the folder itself.

#### Execute the upgrade process

Follow the specific instructions provided in the upgrade guide or release notes to perform the upgrade process for the Hedera Guardian application. Make sure to carefully follow each step to ensure a successful upgrade.

While performing the upgrade keep in mind that Guardian has the following four main data storage:

* The blockchain Hedera Net;
* The MongoDB Database;
* The KMS;
* The Configuration files.

This storage is the boundary conditions for Guardian application execution.

The methodology that we follow to upgrade the system is the Blue-Green Deployment, we create a new instance of guardian running the new version, the green instance, and in this instance we run the previously defined tests. To be sure that the behavior of the Guardian platform is not affected by the boundary conditions, we need to run it using the current starting state for all the storages.

Green Instance boundary condition:

* Use the same blockchain Hedera Net used by the blue instance already running: configure HEDERA\_NET appropriately;
* Clone the MongoDB Database;
* Use the same KMS;
* Configure the Environment as at [_**Update configuration files**_](upgrading.md#update-configuration-files)

If you are running Guardian as a docker container you can clone the mongo database using the following instruction:

1. Create a backup directory in the blue instance: Create a directory on your local system to store the backup files.
2. Use the docker run command with the `--volumes-from option` to access the mongo volume and perform the backup. Run the following command:

`docker run --rm --volumes-from guardian-mongo-1 -v /path/to/backup:/backup mongo bash -c "cd /data/db && tar cvf /backup/mongo-backup.tar ."`

This command creates a .tar archive of the mongo db data directory (/data/db) and saves it as mongo-backup.tar in the specified backup directory.

1. Copy the mongo-backup.tar in a folder /path/to/backup in the Green Instance.
2. In the Green Instance, modify the volumes section of the mongo service definition in docker-compose.yml file:

```
services:
 mongo:
   image: mongo:6.0.3
   command: "--setParameter allowDiskUseByDefault=true"
   restart: always
   volumes:
     - /path/to/backup:/data/db
   expose:
     - 27017
```

By specifying the backup directory as a volume, Docker Compose will mount the contents of the backup directory to the /data/db directory within the mongo container. This allows the container to access and use the previously backed up data.

If you are running Guardian manually, after building executables you can restore in the Green Instance mongo db, the backed up data obtained at [_**Perform a Database and Environment backup operation**_](upgrading.md#perform-a-database-and-environment-backup-operation)

About KMS, that is strongly recommended for your production environment, care to copy all the cryptographic material. This is held for every service based on the KMS configuration that you are using as specified at [Guardian Vault](https://docs.hedera.com/guardian/guardian/readme/guardian-vault) documentation. In particular, for Hashicorp vault, copy the .\<service>/tls folder in every Blue Instance of yours to the Green Instance homonymous services.

Now, the last element to worry about is the update of the Environment using the new configuration file obtained at [_**Update configuration files**_](upgrading.md#update-configuration-files)_**.**_ You can bootstrap the Green Instance of Guardian application and follow next steps.

#### Configure Load Balancer

Set up a load balancer to distribute traffic between the blue and green environments. Initially, configure the load balancer to direct all traffic to the blue environment.

### Tasks checklist after the upgrade

#### Test the upgraded application

After the upgrade, thoroughly test the functionality and performance of the Hedera Guardian application in the Green Instance. Conduct comprehensive testing of all major features and use cases to ensure they are functioning as expected in the upgraded version.

#### Security and integrity testing

Perform security and integrity testing on the upgraded application to identify any vulnerabilities or potential issues. Implement necessary security measures and address any identified vulnerabilities to ensure the application's robustness.

#### Validate customizations

If the implementer company had made any customizations to the prior version, reapply those customizations to the upgraded version. Verify that the customizations are working correctly and are compatible with the new version.

#### Update documentation and user guides

Review and update the application documentation, user guides, and any related internal resources to reflect the changes and new features introduced in the upgraded version. This will help users understand and leverage the enhancements brought by the upgrade.

### End of Blue-Green Upgrade

#### Switch Traffic to the Green Environment

Once testing is successfully completed:

1. Repeat the cloning steps to update the Green instance with the last transaction to avoid losing any data about transactions that may have happened during the testing phase.
2. Update the load balancer configuration to start directing the incoming traffic to the green environment.

#### Monitor and Rollback if Needed

Continuously monitor the green environment's performance, logs, and metrics to identify any issues or anomalies. Compare the result of previous metrics to the new revealed metrics as per the [monitoring tools](https://docs.hedera.com/guardian/monitoring-tools) available for Guardian since release 2.12.1.

If any critical issues arise, you can quickly rollback by switching the load balancer to route all traffic back to the blue environment.

#### Complete Transition

Decommission the blue environment or keep it as a backup, depending on your requirements.

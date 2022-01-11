# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.2] - 2022-1-11

### Added
- Forms data validation [#43](https://github.com/hashgraph/guardian/issues/43)
- Custom roles/actors mapping [#51](https://github.com/hashgraph/guardian/issues/51)
- Policy validation [#56](https://github.com/hashgraph/guardian/issues/56)
- Support lists in forms [#120](https://github.com/hashgraph/guardian/issues/120)
- Support required fields in forms [#123](https://github.com/hashgraph/guardian/issues/123)
- New API development [#197](https://github.com/hashgraph/guardian/issues/197)
- Re-Factor FE to use the new API [#198](https://github.com/hashgraph/guardian/issues/198)
- Revised API documentation [#200](https://github.com/hashgraph/guardian/issues/200)

### Fixed:
- Timeout related error handling [#226](https://github.com/hashgraph/guardian/issues/226)
- Hardcode schemes deletion [#236](https://github.com/hashgraph/guardian/issues/236)
- Creating a new Installer user with already existing username causes 500 error [#238](https://github.com/hashgraph/guardian/issues/238)


## [v1.0.1] - 2021-12-17

### Added
- Supported lists and required fields in forms, changed the generation of the resulting schema json file [#203](https://github.com/hashgraph/guardian/issues/203)

### Fixed

- Swagger API and Postman Collection have been fixed and now include authentication header, parameters, models, etc. allowing requests to the Guardian API [#204](https://github.com/hashgraph/guardian/issues/204)
- Fixed typos, expanded API endpoints descriptions  [#204](https://github.com/hashgraph/guardian/issues/204)


## [v1.0.0] - 2021-12-14

### Added
- Basic CI/CD [#4](https://github.com/hashgraph/guardian/issues/4)
- Repository Bages [#40](https://github.com/hashgraph/guardian/issues/40)
- Policy export/import [#50](https://github.com/hashgraph/guardian/issues/50)
- Lists in schema [#41](https://github.com/hashgraph/guardian/issues/41)
- Required Fields in schema [#118](https://github.com/hashgraph/guardian/issues/118)
- Editing schemas [#45](https://github.com/hashgraph/guardian/issues/45)
- Policy engine restore [#49](https://github.com/hashgraph/guardian/issues/49)
- Core functionality for Unit tests [#37](https://github.com/hashgraph/guardian/issues/37)
- Memo on a Hedera Network Topic Describing the Policy for Discoverability [#48](https://github.com/hashgraph/guardian/issues/48)
- Swagger API documentation [#38](https://github.com/hashgraph/guardian/issues/38)
- Postman API Documentation [#39](https://github.com/hashgraph/guardian/issues/39)
### Fixed
- Non-approved policy application shows spinning wheel on repeat [#21](https://github.com/hashgraph/guardian/issues/21)
- Restart Service functionality during policy editing not working [#13](https://github.com/hashgraph/guardian/issues/13)
- Reject application button doesn't work [#22](https://github.com/hashgraph/guardian/issues/22)
- Decimal places in token configuration results in different values for token minting in Guardian vs DLT
[#30](https://github.com/hashgraph/guardian/issues/30)
- Contextual comments are lacking in the files [#105](https://github.com/hashgraph/guardian/issues/105)
- irec-policy-config.txt has incorrect url for MRV endpoint in individually built Nodes [#29](https://github.com/hashgraph/guardian/issues/29)
- Instructions in step 2 are invalid. Populating ID and Key info in .env and config files does nothing once the application is built and run [#12](https://github.com/hashgraph/guardian/issues/12)


## [v1.0.0-beta.2] - 2021-10-20

### Added

- New UI design applied

### Fixed

- VP and trust chain display for NFT 
- Display of errors during a transaction;
- @hashgraph/sdk version was downgraded to 2.1.0 because of the [issue](https://github.com/hashgraph/hedera-sdk-js/issues/675)


## [v1.0.0-beta.1] - 2021-10-14

### Added

- Initial release of the Guardian includes: 
  - Front End: Web Browser-based User Interface
  - Guardian-Service: Token functions, storage for VCs, VPs, and Schemas
  - Interfaces: send the structure for the information from the front end to the back end
  - Message-broker: enables connections between services
  - Mrv-sender: IoT simulator
  - Ui-service: Contains the back-end for the front-end and contains the Policy Workflow Engine

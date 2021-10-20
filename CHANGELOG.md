# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-beta.1] - 2021-10-14

### Added

- Initial release of the Guardian includes: 
  - Front End: Web Browser-based User Interface
  - Guardian-Service: Token functions, storage for VCs, VPs, and Schemas
  - Interfaces: send the structure for the information from the front end to the back end
  - Message-broker: enables connections between services
  - Mrv-sender: IoT simulator
  - Ui-service: Contains the back-end for the front-end and contains the Policy Workflow Engine


## [v1.0.0-beta.2] - 2021-10-20

### Added

- New UI design applied

### Fixed

- VP and trust chain display for NFT 
- Display of errors during a transaction;
- @hashgraph/sdk version was downgraded to 2.1.0 because of the [issue](https://github.com/hashgraph/hedera-sdk-js/issues/675)
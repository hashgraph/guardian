# 🌏 Getting Started

## **1. Introduction**

The Guardian is an innovative open-source platform that streamlines the creation, management, and verification of digital environmental assets. It leverages a customizable Policy Workflow Engine and Web3 technology to ensure transparent and fraud-proof operations, making it a key tool for transforming sustainability practices and carbon markets.

## **2. Prerequisites**

Before starting with Hedera Guardian, ensure that your environment meets the following requirements:

* [Install Git](https://git-scm.com/).
* [Docker](https://www.docker.com/) (To build with one command)
* [MongoDB](https://www.mongodb.com/)[ V6](https://www.mongodb.com/) , [NodeJS](https://nodejs.org/)[ v16](https://nodejs.org/en) and [Nats](https://nats.io/)[ 1.12.2](https://nats.io/) (If you build with docker these components will be installed automatically)
* [Hedera Testnet Account](https://portal.hedera.com/)
* [Web3.Storage Account](https://web3.storage/)
* [Filebase Account](https://filebase.com/)
* [Redict 7.3.0](https://redict.io/)

## **3. Installation**

There are multiple ways to Install Guardian:

1. [Using Docker](guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/)
2. [Pre-Build Containers](guardian/readme/getting-started/installation/building-from-pre-build-containers.md)
3. [Manually](guardian/readme/getting-started/installation/build-executables-and-run-manually.md)

## **4. Troubleshooting**

* **Server not starting?** Ensure that Docker is running and all containers are up.
* **Cannot access the admin dashboard?** Check if the correct ports (3000) are open and not blocked by your firewall.
* **Issues with API calls?** Verify that your Hedera account ID and private key are correctly configured in the `.env` file.
* For additional help, visit the [Hedera Guardian GitHub Issues](https://github.com/hashgraph/guardian/issues).

## **7. Additional Resources**

* [Hedera Guardian Documentation](https://github.com/hashgraph/guardian/wiki)
* [Hedera Developer Portal](https://portal.hedera.com/login)
* [Community Forum](https://github.com/hashgraph/guardian/discussions)
* [Roadmap](guardian/readme/roadmap.md)
* [Youtube Channel](https://www.youtube.com/@envisionblockchain/featured)

## **8. Feedback and Support**

* For support, reach out via Hedera Discord Sustainability channel or email us at info@envisionblockchain.com.
* Submit feedback or feature requests through the [GitHub repository](https://github.com/hashgraph/guardian/issues).

## **9. Legal and Licensing**

* Hedera Guardian is open-source and licensed under the Apache 2.0 License. Please review the [LICENSE](https://github.com/hashgraph/guardian/blob/main/LICENSE) file for more details.

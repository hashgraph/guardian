# Getting Started

## **1. Introduction**

The Guardian is an open-source platform that streamlines the creation, management, and verification of digital environmental assets. It leverages a customizable Policy Workflow Engine and Web3 technology to ensure transparent and fraud-proof operations, making it a key tool for transforming sustainability practices & carbon markets.

Below are the universal software prerequisites, followed by network-specific items.

## 2. Prerequisites

### 2.1 Universal software

1. **[Git](https://git-scm.com/downloads)** – source-control tooling
2. **[Docker](https://www.docker.com/)** – one-command build & run (recommended)
3. **[MongoDB v6](https://www.mongodb.com/)**, **[Node.js v24.15+](https://nodejs.org/en/download)**, and **[NATS 2.9.25](https://nats.io/)** – auto-provisioned when using Docker Compose
4. **[IPFS storage](https://docs.ipfs.tech/concepts/what-is-ipfs/)** (choose one):
   - **[Storacha account](https://storacha.network/)** – IPFS pinning service (formerly Web3.Storage)
   - **[Filebase account](https://filebase.com/)** – S3-compatible IPFS pinning
   - Local IPFS node (e.g., **[Kubo](https://github.com/ipfs/kubo)**) – auto-provisioned when using Docker Compose
5. **[Valkey](https://valkey.io)** – in-memory cache & message broker (auto-provisioned by the Docker stack)

### 2.2 Hedera network

|              | Testnet (default)                                                     | Mainnet (production)                                                           |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Account**  | Create via [Hedera Developer Portal](https://portal.hedera.com/login) | Create via Hedera-enabled wallet (e.g., [HashPack](https://www.hashpack.app/)) |
| **Key type** | ED25519                                                               | ED25519                                                                        |
| **Network**  | `testnet`                                                             | `mainnet`                                                                      |

> **Fees**: Mainnet operations incur HBAR costs—fund your account before running Guardian.

***

## 3. Preparing a Mainnet Account & Keys

1. Install a Hedera-enabled wallet (e.g., [HashPack](https://www.hashpack.app/)).
2. Create a Mainnet account and note the **Account ID** (`0.0.x`).
3. Export the **ED25519** key pair
   * _HashPack path_: **Settings → Manage Accounts → Export Private Key** (DER format).
4.  Update your `.env`

    ```dotenv
    HEDERA_NET=mainnet
    HEDERA_OPERATOR_ID=0.0.123456
    HEDERA_OPERATOR_KEY=-----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----
    ```

## 4. Preparing a Testnet Account & Keys

1. Create a Testnet account via the [Hedera Developer Portal](https://portal.hedera.com/login).
2. Record your **Account ID** (`0.0.x`).
3. Download the **ED25519** private key (ignore **ECDSA**)
   * Select **DER Encoded** — _do not_ choose _HEX Encoded_.
4.  Update your `.env`

    ```dotenv
    HEDERA_NET=testnet
    HEDERA_OPERATOR_ID=0.0.987654
    HEDERA_OPERATOR_KEY=-----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----
    ```

## 5. Installation

1.  **Docker-Compose**

    ```bash
    docker compose -f ./deploy/docker-compose.yml --profile all up -d
    ```

    _(Detects Testnet/Mainnet from `.env`)_
2. **Pre-built containers** — pull `hashgraph/guardian:latest` and supply `.env` as a secret.
3. **Manual build** — clone repo, install Node deps, compile, start services.

## **6. Troubleshooting**

* **Server not starting?** Ensure that Docker is running and all containers are up.
* **Cannot access the admin dashboard?** Check if the correct ports (3000) are open and not blocked by your firewall.
* **Issues with API calls?** Verify that your Hedera account ID and private key are correctly configured in the `.env` file.
* For additional help, visit the [Hedera Guardian GitHub Issues](https://github.com/hashgraph/guardian/issues).

## **7. Additional Resources**

* [Hedera Guardian Documentation](https://guardian.hedera.com)
* [Hedera Developer Portal](https://portal.hedera.com/login)
* [Roadmap](guardian/readme/roadmap.md)
* [Youtube Channel](https://www.youtube.com/@envisionblockchain/featured)

## **8. Feedback and Support**

* Please send feedback, feature, and support requests to [guardian-feedback@hashgraph.com](mailto:guardian-feedback@hashgraph.com?subject=Re:%20Hedera%20Guardian%20Feedback%20or%20Request\&body=This%20is%20%5Bfeedback%20%7C%20support%20request%20%7C%20feature%20request%5D%0A%0A--%0A%0AAdd%20a%20summary%20here.)&#x20;
* You can also open issues and feature requests in the [GitHub repository](https://github.com/hashgraph/guardian/issues).

## **9. Legal and Licensing**

* Hedera Guardian is open-source and licensed under the Apache 2.0 License. Please review the [LICENSE](../LICENSE/) file for more details.

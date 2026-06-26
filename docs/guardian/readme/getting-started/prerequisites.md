# Prerequisites

## 1. Universal Software

1. **[Git](https://git-scm.com/downloads)** – source-control tooling
2. **[Docker](https://www.docker.com/)** – one-command build & run (recommended)
3. **[MongoDB v6](https://www.mongodb.com/)**, **[Node.js v24.15+](https://nodejs.org/en/download)**, and **[NATS 2.9.25](https://nats.io/)** – auto-provisioned when using Docker Compose
4. **[IPFS storage](https://docs.ipfs.tech/concepts/what-is-ipfs/)** (choose one):
   - **[Storacha account](https://storacha.network/)** – IPFS pinning service (formerly Web3.Storage)
   - **[Filebase account](https://filebase.com/)** – S3-compatible IPFS pinning
   - Local IPFS node (e.g., **[Kubo](https://github.com/ipfs/kubo)**) – auto-provisioned when using Docker Compose
5. **[Valkey](https://valkey.io)** – in-memory cache & message broker (auto-provisioned by the Docker stack)

When building reference implementation, you can manually build every component or run a single command with Docker.

{% hint style="info" %}
**Note**: If you have already installed another version of Guardian, remember to **perform backup operation before upgrading**.
{% endhint %}

## 2. Hedera Network

|              | Testnet (default)                                                     | Mainnet (production)                                                           |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Account**  | Create via [Hedera Developer Portal](https://portal.hedera.com/login) | Create via Hedera-enabled wallet (e.g., [HashPack](https://www.hashpack.app/)) |
| **Key type** | ED25519                                                               | ED25519                                                                        |
| **Network**  | `testnet`                                                             | `mainnet`                                                                      |

> **Fees**: Mainnet operations incur HBAR costs—fund your account before running Guardian.

## 3. Automatic Installation

### 3.1 Prerequisites for Automatic Installation

* **[Docker](https://www.docker.com/)**

#### 3.1.1 Docker Installation

If you build with docker [MongoDB](https://www.mongodb.com), [NodeJS](https://nodejs.org) and [Nats](https://nats.io/) will be installed and configured automatically.

---
description: Choose and prepare a self-hosted Guardian installation path.
tags:
  - flagged-for-rewrite
---

# Installation Guide

Guardian is available as a managed service or open-source software.

### Choose your deployment path

Use the **Managed Guardian Service** if you need to start quickly. It provides a hosted Guardian environment. You do not need to deploy or operate the infrastructure. Visit [Managed Guardian Service](https://guardianservice.io/) to get started.

Use the **open-source Guardian** if you need local development, infrastructure control, or customization. Choose one of these paths:

* **Quickstart with Docker** — run a local Guardian instance using containers.
* **Build from source** — compile Guardian and configure a self-hosted deployment.

The [Guardian repository README](https://github.com/hashgraph/guardian/blob/main/README.md) is the definitive source for getting started with the an open-source installation.&#x20;

This guide is for teams installing and operating open-source Guardian.

You manage infrastructure, secrets, configuration, upgrades, backups, and monitoring.

The [Guardian repository README](https://github.com/hashgraph/guardian#readme) provides canonical setup instructions. It tracks supported releases, commands, and configuration changes.

### Choose an installation path

1. Review the [prerequisites](installation/prerequisites.md).
2. Select an installation approach:
   * [Run with Docker](../../../developer-tools/environments/building-from-source-and-run-using-docker/).
   * [Use pre-built containers](../../../developer-tools/environments/building-from-pre-build-containers.md).
   * [Build and run manually](../../../developer-tools/environments/build-executables-and-run-manually.md).

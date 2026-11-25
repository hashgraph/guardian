---
tags:
  - tasks
---

# Enable the Helia Reader

Make Guardian or the Indexer read IPFS files through Helia instead of your own IPFS node. See [IPFS Reading](README.md) for an explanation of how it works.

#### Prerequisites

* Access to the configuration files of the Guardian or Indexer installation.
* An IPFS provider for uploads is already set up (`IPFS_PROVIDER` is `local` or `filebase`).
* The services can reach the internet over HTTPS, unless you use only your own gateways and routers.

#### Steps

**1. Open the configuration file**

* Guardian: the worker settings, for Docker `./configs/.env.<environment>.guardian.system`, or `worker-service/configs/.env.worker` when you run without Docker.
* Indexer: `indexer-service/configs/.env.worker` and `indexer-worker-service/configs/.env.worker`. Change both files.

**2. Turn on Helia**

Set:

```
IPFS_READER="helia"
```

**3. Adjust the optional settings**

The defaults work for most installations. Change them only if you need to.

| Setting | Default | Description |
| --- | --- | --- |
| `IPFS_READER` | `kubo` | `kubo` reads through your own node, `helia` reads through Helia. |
| `IPFS_HELIA_GATEWAYS` | empty | A comma-separated list of your own trusted gateways for Helia to try. Empty means none. |
| `IPFS_HELIA_ROUTERS` | empty | A comma-separated list of routing services that tell Helia where a file is. Empty means Helia's own default service. `none` turns the network lookup off. |
| `IPFS_HELIA_ALLOWED_PROTOCOLS` | `https` | Set to `https,http` to also allow plain HTTP addresses. |
| `IPFS_HELIA_ALLOW_LOCAL_ADDRESSES` | `false` | Set to `true` to allow addresses in your local network, for example your own gateway at `127.0.0.1`. |

Example with your own gateway on the local machine:

```
IPFS_READER="helia"
IPFS_HELIA_GATEWAYS="http://127.0.0.1:8080"
IPFS_HELIA_ALLOWED_PROTOCOLS="https,http"
IPFS_HELIA_ALLOW_LOCAL_ADDRESSES="true"
```

**4. Restart the services**

Restart the services whose files you changed, so they read the new settings.

#### Result

Guardian or the Indexer now reads IPFS files through Helia and checks every file against its hash. Opening a document or a file looks the same as before. To go back, set `IPFS_READER="kubo"` and restart the services.

#### Related

* Concept: [IPFS Reading](README.md)

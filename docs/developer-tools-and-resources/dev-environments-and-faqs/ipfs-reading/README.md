---
tags:
  - concept
---

# IPFS Reading

Guardian stores documents and files on IPFS and reads them back when a user opens a document or a file. This page explains how Guardian reads from IPFS. It is for administrators who set up a Guardian instance or an Indexer.

#### The problem it solves

Guardian uploads files through one IPFS provider, a local node or Filebase. Reading is a separate job. A file is stored under its content hash (CID), so any IPFS source can return it. Guardian lets the administrator choose how to read: through their own IPFS node, or through Helia, which finds the file in the IPFS network by itself.

#### How it works

The `IPFS_READER` setting chooses the reader. It has two values:

* `kubo` is the default. Guardian reads every file from the IPFS node address you set: `IPFS_PUBLIC_GATEWAY` in Guardian, `IPFS_GATEWAY` in the Indexer. This is normally your own node, for example `http://ipfs-node:8080/ipfs/{cid}`.
* `helia` makes Guardian read through Helia. Helia looks up which peers hold the file, downloads it, and checks every block against its hash. A file that does not match its hash is refused. You do not need your own IPFS node for reading.

Example: an instance uploads to Filebase and has no IPFS node. With `IPFS_READER=helia`, Guardian finds the uploaded files in the IPFS network and reads them without a gateway address.

Both readers use the same time limits. When a file cannot be read, the user sees the same "file not found" result with either reader.

#### Key distinctions

* The reader only reads. Uploads still go through `IPFS_PROVIDER` (`local` or `filebase`).
* Guardian's worker service and both Indexer services, `indexer-service` and `indexer-worker-service`, support the Helia reader. Each one uses its own settings.
* The Indexer still checks whether a file is available through `IPFS_CHECK_GATEWAY`. Helia replaces only the file reading.
* topic-viewer always reads from your own IPFS node.

#### Related

* Task: [Enable the Helia reader](enable-helia-reader.md)

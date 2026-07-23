# Snapshot bundles

This directory ships **alongside** the docker-compose stack so a clean install
on a new host can boot with pre-populated data instead of re-indexing the
Hedera network from scratch.

## What a snapshot contains

```
snapshot/
  postgres-init/
    01-restore.sql.gz     # full `pg_dumpall` of every per-network database
  policy-zips/
    <cid>.zip             # decoded Guardian policy bundles
```

Both folders are mounted into the stack by `docker-compose.yml`:

| Source on host                  | Destination in container                 | Service        |
|---------------------------------|------------------------------------------|----------------|
| `./snapshot/postgres-init`      | `/docker-entrypoint-initdb.d` (read-only)| `postgres`     |
| `./data/policy-zips`            | `/app/data/policy-zips`                  | `worker-*`     |

Postgres only runs the init scripts when its data volume is empty, so the
restore fires automatically on the very first `docker compose up` on a fresh
host. The workers read existing policy zips straight off the bind mount and
only fetch from IPFS for missing CIDs.

## Producing a snapshot

```
scripts/export-snapshot.sh
```

While the stack is running this:

1. runs `pg_dumpall` inside the `se-postgres` container,
2. gzips the dump into `snapshot/postgres-init/01-restore.sql.gz`,
3. mirrors `data/policy-zips/` into `snapshot/policy-zips/`,
4. wraps both into `sustainability-atlas-snapshot-<timestamp>.tar.gz`.

Ship that tarball.

## Restoring a snapshot

On the target host:

```
scripts/import-snapshot.sh sustainability-atlas-snapshot-<timestamp>.tar.gz
docker compose up -d
```

`import-snapshot.sh` refuses to run if the `postgres_data` volume already
exists — Postgres won't re-run the init scripts on a non-empty volume, so
silently importing on top of a live DB is a footgun. The script prints the
exact `docker volume rm` you need if you really do want to wipe and reload.

## Notes

- The dump uses `--clean --if-exists` so a partial restore behaves
  predictably if you do choose to wipe the volume.
- `data/policy-zips/` is `.gitignore`d, so the bundled zips travel via the
  snapshot tarball — not git.
- The bind mount on workers means new zips fetched by the worker land back
  on the host, ready to be captured by the next export.

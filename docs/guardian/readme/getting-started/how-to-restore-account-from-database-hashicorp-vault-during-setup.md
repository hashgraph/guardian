# 🔨 How to Restore Account from Database/Hashicorp Vault during Setup

For backup all data, we need to create dump of all used mongodb databases and hashicorp vault (if it use)

#### Mongo DB:

Mongo DB databases set in .env (.env.docker) files or via environment variables named DB\_DATABASE Default names:

* auth-service - auth\_db
* guardian-service - guardian\_db
* logger-service (not nesessary) - logger\_db

Example using mongo utils:

Creating dump:

```
mongodump --db auth_db --out ./dump
mongodump --db guardian_db --out ./dump
mongodump --db logger_db --out ./dump
```

Restoring dump:

```
mongorestore --db auth_db ./dump/auth_db
mongorestore --db guardian_db ./dump/guardian_db
mongorestore --db logger_db ./dump/logger_db
```

#### Hashicorp Vault:

For Hashicorp vault backup and restore use this instructions: [https://developer.hashicorp.com/vault/tutorials/standard-procedures/sop-backup](https://developer.hashicorp.com/vault/tutorials/standard-procedures/sop-backup)

#!/bin/bash

BASE_DIR=$PWD/vault/hashicorp
BACKUP_DIR=$BASE_DIR/backup/
VAULT_ROOT_TOKEN_PATH=$BASE_DIR/vault/.root

CONSUL_ADDR=http://localhost:8500

# Executes a vault read command using curl
# $1: URI vault path to be executed
# $2: name of the snapshot file
read() {
  URL=$CONSUL_ADDR/$1
  OUTPUT=$BACKUP_DIR/$2

  curl $URL --output $OUTPUT
}


# Execute the complete snapshot for the consul server
execute_backup() {

  # create a backup dir /vault/hashicorp/backup
  mkdir $BACKUP_DIR
  # backup root acces file
  cp $VAULT_ROOT_TOKEN_PATH $BACKUP_DIR/.root
  # copy TLS material
  cp -r $CERT_REPOSITORY_DIR $BACKUP_DIR

  # execute read from server and backup in secret-backup.snap
  read v1/snapshot secret-backup.snap
}

echo "execute backup"
execute_backup

#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env


VAULT_CLIENT_CERT_PATH=$CERT_REPOSITORY_DIR/vault/client
VAULT_CACERT=$VAULT_CLIENT_CERT_PATH/ca.crt
VAULT_CLIENT_CERT=$VAULT_CLIENT_CERT_PATH/tls.crt
VAULT_CLIENT_KEY=$VAULT_CLIENT_CERT_PATH/tls.key


# Executes a vault read command using curl
# $1: URI vault path to be executed
# $2: optional VAULT_TOKEN for authentication
read() {
  URL=$VAULT_ADDR/$1
  X_VAULT_TOKEN=$2

  if [ -z "$X_VAULT_TOKEN" ]; then
    curl -s \
      --cacert $VAULT_CACERT \
      --cert $VAULT_CLIENT_CERT \
      --key $VAULT_CLIENT_KEY \
      $URL
  else
    curl -s \
      --cacert $VAULT_CACERT \
      --cert $VAULT_CLIENT_CERT \
      --key $VAULT_CLIENT_KEY \
      --header "X-Vault-Token: $VAULT_TOKEN" \
      $URL
  fi
}

# Executes a vault write command using curl
# $1: data payload to be sent by command 
# $2: URI vault path to be executed
# $3: optional VAULT_TOKEN for authentication
write() {
  DATA=$1
  URL=$VAULT_ADDR/$2
  X_VAULT_TOKEN=$3

  if [ -z "$X_VAULT_TOKEN" ]; then
    curl -k -s --request POST \
      --cacert $VAULT_CACERT \
      --cert $VAULT_CLIENT_CERT \
      --key $VAULT_CLIENT_KEY \
      --data "$DATA" \
      $URL
  else
    curl -k -s --request POST \
      --cacert $VAULT_CACERT \
      --cert $VAULT_CLIENT_CERT \
      --key $VAULT_CLIENT_KEY \
      --header "X-Vault-Token: $X_VAULT_TOKEN" \
      --data "$DATA" \
      $URL
  fi
}
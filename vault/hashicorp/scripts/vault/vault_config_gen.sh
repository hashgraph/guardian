#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

VAULT_CONFIG_TEMPLATE_DIR=$PWD/vault/hashicorp/configs/vault/vault.json
VAULT_CONFIG_DIR=$PWD/vault/hashicorp/vault/config

mkdir -p $VAULT_CONFIG_DIR

generate_vault_config() {
  TEMP_CFG=$(cat $VAULT_CONFIG_TEMPLATE_DIR)

  TEMP_CFG=$(echo $TEMP_CFG |
    jq '.ui = '$VAULT_UI_ENABLE'' |
    jq '.log_level = "'$VAULT_LOG_LEVEL'"' |
    jq '.default_lease_ttl = "'$VAULT_DEFAULT_LEASE_TTL'"' |
    jq '.max_lease_ttl = "'$VAULT_MAX_LEASE_TTL'"')

  if [ $TLS_ENABLE = false ]; then
    TEMP_CFG=$(echo $TEMP_CFG |
      jq '.listener.tcp.tls_disable = true' |
      jq 'del(.listener.tcp.tls_client_ca_file, .listener.tcp.tls_cert_file, .listener.tcp.tls_key_file)')
  fi

  echo $TEMP_CFG| jq . -M > $VAULT_CONFIG_DIR/vault.json
}

generate_vault_config
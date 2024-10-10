#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

CONSUL_CONFIG_TEMPLATE_DIR=$PWD/vault/hashicorp/configs/consul/consul.json
CONSUL_CONFIG_DIR=$PWD/vault/hashicorp/consul/config

mkdir -p $CONSUL_CONFIG_DIR

generate_config() {
  TEMP_CFG=$(cat $CONSUL_CONFIG_TEMPLATE_DIR)

  TEMP_CFG=$(echo $TEMP_CFG |
    jq '.ui_config.enabled = '$CONSUL_UI_ENABLE'' |
    jq '.log_level = "'$CONSUL_LOG_LEVEL'"')


  if [ $TLS_ENABLE = false ]; then
    TEMP_CFG=$(echo $TEMP_CFG | 
      jq '.verify_incoming = false' |
      jq '.verify_outgoing = false' |
      jq '.verify_server_hostname = false' |
      jq '.auto_encrypt.allow_tls = false' |
      jq 'del(.ca_file, .cert_file, .key_file)')
  fi

  echo $TEMP_CFG | jq . -M > $CONSUL_CONFIG_DIR/consul.json
}

generate_config
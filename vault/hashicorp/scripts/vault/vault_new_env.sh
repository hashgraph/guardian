#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

BASE_DIR=$PWD/vault/hashicorp

VAULT_CLIENT_CERT_PATH=$CERT_REPOSITORY_DIR/vault/client
VAULT_CACERT=$VAULT_CLIENT_CERT_PATH/ca.crt
VAULT_CLIENT_CERT=$VAULT_CLIENT_CERT_PATH/tls.crt
VAULT_CLIENT_KEY=$VAULT_CLIENT_CERT_PATH/tls.key

VAULT_ROOT_TOKEN_PATH=$BASE_DIR/vault/.root

POLICY_CONFIG_DIR=$BASE_DIR/configs/vault/policies/policy_configs.json
APPROLE_CONFIG_DIR=$BASE_DIR/configs/vault/approle/approle.json
SECRETS_DIR=$BASE_DIR/configs/vault/secrets/secrets.json

TOKENS_DIR=$BASE_DIR/configs/vault/secrets/tokens

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

# Using Unseal Keys to unseal Vault
unseal_vault() {
  UNSEAL_KEY_1=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[1]')
  UNSEAL_KEY_2=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[2]')
  UNSEAL_KEY_3=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[3]')

  write '{"key": '${UNSEAL_KEY_1}'}' v1/sys/unseal

  write '{"key": '${UNSEAL_KEY_2}'}' v1/sys/unseal

  write '{"key": '${UNSEAL_KEY_3}'}' v1/sys/unseal

  # get Vault from root
  VAULT_TOKEN=$(cat $VAULT_ROOT_TOKEN_PATH | jq -r .root_token )
}

# Get AppRole Credentials for all services
get_approle_credentials() {
  ROLES=$(cat "$APPROLE_CONFIG_DIR" | jq -c -r '.[]')

  for ROLE in ${ROLES[@]}; do
    ROLE_NAME=$(echo $ROLE | jq -r '.role_name')

    ROLE_ID=$(read v1/auth/approle/role/$ROLE_NAME/role-id $VAULT_TOKEN | jq -r ".data.role_id")
    
   
    ENV_PATHS=$(echo $ROLE | jq -r '.env_path[]')
    ENV_NAMES=$(echo $ROLE | jq -r '.env_name[]')

    TOKEN_FILE_DIR=$TOKENS_DIR/$ENV_NAMES/
    TOKEN_FILE_NAME=.env.secrets

    source $TOKEN_FILE_DIR/$TOKEN_FILE_NAME
    SECRET_ID=$VAULT_APPROLE_SECRET_ID

    COUNTER=0

    for ENV_PATH in ${ENV_PATHS[@]}; do

    if [ -z "$GUARDIAN_ENV" ]
        then
              ENV_FILE=$PWD/$ENV_PATH/configs/.env.${ENV_NAMES[COUNTER]}
        else
              ENV_FILE=$PWD/$ENV_PATH/configs/.env.${ENV_NAMES[COUNTER]}.${GUARDIAN_ENV}
        fi
      
      echo "file to write: $ENV_FILE"
      if grep -q "^VAULT_APPROLE_ROLE_ID=" "$ENV_FILE"; then
        # replace the value of the key if it exists
        sed -i "s/^VAULT_APPROLE_ROLE_ID=.*/VAULT_APPROLE_ROLE_ID=$ROLE_ID/" $ENV_FILE
      else
        # add the key and its value if it doesn't exist
        echo -e "\nVAULT_APPROLE_ROLE_ID=$ROLE_ID" >> "$ENV_FILE"
      fi

      if grep -q "^VAULT_APPROLE_SECRET_ID=" "$ENV_FILE"; then
        # replace the value of the key if it exists
        sed -i "s/^VAULT_APPROLE_SECRET_ID=.*/VAULT_APPROLE_SECRET_ID=$SECRET_ID/" $ENV_FILE
      else
        # add the key and its value if it doesn't exist
        echo "VAULT_APPROLE_SECRET_ID=$SECRET_ID" >> "$ENV_FILE"
      fi
      let COUNTER++
    done

    
  done
}

# Push secrets for all services to Vault
push_secrets() {
  echo $VAULT_TOKEN
  SECRETS=$(cat "$SECRETS_DIR" | jq -c -r '.[]')
  for SECRET in ${SECRETS[@]}; do
    SECRET_PATH=$(echo $SECRET | jq -r .path )
    if [ -z "$GUARDIAN_ENV" ]
        then
              SECRET_PATH="$HEDERA_NET"/"$SECRET_PATH"
        else
              SECRET_PATH="$GUARDIAN_ENV"/"$HEDERA_NET"/"$SECRET_PATH"
        fi
        echo $SECRET_PATH
    SECRET_DATA=$(echo $SECRET | jq -r .data )
    write "{\"data\": $SECRET_DATA}" v1/secret/data/$SECRET_PATH $VAULT_TOKEN
  done
}

echo "Unseal Vault"
unseal_vault

# To be Done Write Get App Role Credential or create if not exist
get_approle_credentials

echo "Push secrets for all services to Vault"
push_secrets

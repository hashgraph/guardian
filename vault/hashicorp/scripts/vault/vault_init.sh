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

# Initialize Vault to retreive root token and unseal keys and store them .root file
init_vault() {
  init_response=$(write '{"secret_shares": '$VAULT_UNSEAL_SECRET_SHARES', "secret_threshold": '$VAULT_UNSEAL_SECRET_THRESHOLD'}' v1/sys/init)

  VAULT_TOKEN=$(echo $init_response | jq -r .root_token)
  UNSEAL_KEYS=$(echo $init_response | jq -r .keys)

  ERRORS=$(echo $init_response | jq .errors | jq '.[0]')
  if [ "$UNSEAL_KEYS" = "null" ]; then
    echo "cannot retrieve unseal key: $ERRORS"
    exit 1
  fi

  echo $init_response | jq '{root_token, keys}' > $VAULT_ROOT_TOKEN_PATH
}

# Using Unseal Keys to unseal Vault
unseal_vault() {
  UNSEAL_KEY_1=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[1]')
  UNSEAL_KEY_2=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[2]')
  UNSEAL_KEY_3=$(cat $VAULT_ROOT_TOKEN_PATH | jq .keys | jq '.[3]')

  write '{"key": '${UNSEAL_KEY_1}'}' v1/sys/unseal

  write '{"key": '${UNSEAL_KEY_2}'}' v1/sys/unseal

  write '{"key": '${UNSEAL_KEY_3}'}' v1/sys/unseal
}

# Enable KV V2 engine
enable_kv2_key_engine() {
  write '{"type": "kv-v2", "config": {"force_no_cache": true} }' v1/sys/mounts/secret $VAULT_TOKEN
}

# Enable AppRole Auth Method
enable_approle() {
  write '{"type": "approle"}' v1/sys/auth/approle $VAULT_TOKEN
}

# Create Policies for All provided services
create_policies() {
  POLICIES=$(cat $POLICY_CONFIG_DIR | jq -c -r '.[]')

  for POLICY in ${POLICIES[@]}; do
    POLICY_NAME=$(echo $POLICY | jq -r .policy_name)
    POLICY_DATA_FILES=$(echo $POLICY | jq -r .policies[])

    for POLICY_DATA_FILE in ${POLICY_DATA_FILES[@]}; do
      POLICY_DATA='{"policy": '$(cat $PWD/$POLICY_DATA_FILE)'}'
      write "$POLICY_DATA" v1/sys/policies/acl/$POLICY_NAME $VAULT_TOKEN
    done
  done
}

# Create roles associated with policies for all services
create_roles() {
  ROLES=$(cat "$APPROLE_CONFIG_DIR" | jq -c -r '.[]')
  
  for ROLE in ${ROLES[@]}; do
    ROLE_NAME=$(echo $ROLE | jq -r '.role_name')
    POLICIES=$(echo $ROLE | jq -r '.policies')

    ROLE_DATA=$(echo '{}' | jq '.')
    ROLE_DATA=$(echo $ROLE_DATA | jq '.token_policies = '"$POLICIES"'')

    write "$ROLE_DATA" v1/auth/approle/role/$ROLE_NAME $VAULT_TOKEN
  done
}

# Get AppRole Credentials for all services
get_approle_credentials() {
  ROLES=$(cat "$APPROLE_CONFIG_DIR" | jq -c -r '.[]')
  for ROLE in ${ROLES[@]}; do
    ROLE_NAME=$(echo $ROLE | jq -r '.role_name')

    ROLE_ID=$(read v1/auth/approle/role/$ROLE_NAME/role-id $VAULT_TOKEN | jq -r ".data.role_id")

    SECRET_ID=$(write "{\"num_uses\":$VAULT_SECRET_ID_TTL, \"ttl\": \"$VAULT_SECRET_NUM_USES\"}" v1/auth/approle/role/$ROLE_NAME/secret-id $VAULT_TOKEN | jq -r ".data.secret_id")

    ENV_PATHS=$(echo $ROLE | jq -r '.env_path[]')
    for ENV_PATH in ${ENV_PATHS[@]}; do

      ENV_FILE=$PWD/$ENV_PATH
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
    done

    
  done
}

# Push secrets for all services to Vault
push_secrets() {
  SECRETS=$(cat "$SECRETS_DIR" | jq -c -r '.[]')
  for SECRET in ${SECRETS[@]}; do
    SECRET_PATH=$(echo $SECRET | jq -r .path )
    SECRET_DATA=$(echo $SECRET | jq -r .data )
    write "{\"data\": $SECRET_DATA}" v1/secret/data/$SECRET_PATH $VAULT_TOKEN
  done
}

echo "Initialize Vault"
init_vault

echo "Unseal Vault"
unseal_vault

echo "Enable KV V2 Secret Engine"
enable_kv2_key_engine

echo "Enable AppRole Auth Method"
enable_approle

echo "Create Policies for All guardian Service"
create_policies

echo "Create roles associated with policies for all services"
create_roles

echo "Get AppRole Credentials for all services"
get_approle_credentials

echo "Push secrets for all services to Vault"
push_secrets
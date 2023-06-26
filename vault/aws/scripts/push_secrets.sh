#!/bin/bash

SECRETS_DIR=$PWD/vault/aws/configs/secrets/secrets.json

# Load environment variables
source $PWD/vault/aws/.env

push_secrets() {
    local secret_name=$1
    local secret_value=$2

    SECRETS=$(cat "$SECRETS_DIR" | jq -c -r '.[]')

    echo $SECRETS
    
    for SECRET in ${SECRETS[@]}; do
    # "$variablename"Bash_Is"$myvariable"
        SECRET_NAME=$(echo $SECRET | jq -r .path )
        SECRET_DATA=$(echo $SECRET | jq -r .data )

	if [ -z "$GUARDIAN_ENV" ]
        then
              SECRET_NAME="$HEDERA_NET"/"$SECRET_NAME"
        else
              SECRET_NAME="$GUARDIAN_ENV"/"$HEDERA_NET"/"$SECRET_NAME"
        fi

        echo $SECRET_NAME
        
        aws secretsmanager create-secret \
           --name "$SECRET_NAME" \
           --secret-string "$SECRET_DATA"

    done
}

push_secrets

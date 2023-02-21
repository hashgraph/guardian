#!/bin/bash

SECRETS_DIR=$PWD/vault/aws/configs/secrets/secrets.json

push_secrets() {
    local secret_name=$1
    local secret_value=$2

    SECRETS=$(cat "$SECRETS_DIR" | jq -c -r '.[]')

    echo $SECRETS
    
    for SECRET in ${SECRETS[@]}; do
        SECRET_NAME=$(echo $SECRET | jq -r .path )
        SECRET_DATA=$(echo $SECRET | jq -r .data )

        echo $SECRET_NAME
        echo $SECRET_DATA
        
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --secret-string "$SECRET_DATA"
    done
}

push_secrets
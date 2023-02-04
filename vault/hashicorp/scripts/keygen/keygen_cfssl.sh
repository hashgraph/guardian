#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

BASE_DIR=$PWD/vault/hashicorp
CFSSL_CONFIG_DIR=$BASE_DIR/configs/cfssl

CFSSL_CONFIG_FILE=$CFSSL_CONFIG_DIR/cfssl.json


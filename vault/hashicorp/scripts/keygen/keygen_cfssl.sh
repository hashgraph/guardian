#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

BASE_DIR=$PWD/vault/hashicorp
CFSSL_CONFIG_DIR=$BASE_DIR/configs/cfssl
CFSSL_PROFILES_DIR=$BASE_DIR/configs/cfssl/profiles
CFSSL_PROFILES_CA_DIR=$CFSSL_PROFILES_DIR/ca

CFSSL_CONFIG_FILE=$CFSSL_CONFIG_DIR/cfssl.json
CFSSL_PROFILE_PATH_ROOT_CA=$CFSSL_PROFILES_CA_DIR/root.json
CFSSL_PROFILE_PATH_INT_CA=$CFSSL_PROFILES_CA_DIR/intermediate_ca.json


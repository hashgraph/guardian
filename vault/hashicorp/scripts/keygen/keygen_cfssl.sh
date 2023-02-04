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

PROFILE_TYPE_ICA=intermediate_ca

ROOT_CA_REPOSITORY=$CERT_REPOSITORY_DIR/ca/root
ROOT_CA_CRT=$ROOT_CA_REPOSITORY/ca.crt
ROOT_CA_KEY=$ROOT_CA_REPOSITORY/ca.key

INT_CA_REPOSITORY=$CERT_REPOSITORY_DIR/ca/int_ca
INT_CA_CSR=$INT_CA_REPOSITORY/int_ca.csr
INT_CA_CRT=$INT_CA_REPOSITORY/int_ca.crt
INT_CA_KEY=$INT_CA_REPOSITORY/int_ca.key

# Make Repository to store PKIs
path_init() {
    mkdir -p $CERT_REPOSITORY_DIR
}

# Remove whole Repository of generated PKIs
path_clean() {
    rm -rf $CERT_REPOSITORY_DIR
}

# Generate Root CA and store to TEMP directory
generate_root_ca() {
    mkdir -p $ROOT_CA_REPOSITORY

    ca=$(cfssl gencert -initca $CFSSL_PROFILE_PATH_ROOT_CA)
    echo $ca | jq -r '.cert' >> $ROOT_CA_CRT
    echo $ca | jq -r '.key' >> $ROOT_CA_KEY
}

# Generate Intermediate CA from Root CA and store to TEMP directory
generate_int_ca() {
    mkdir -p $INT_CA_REPOSITORY

    int_ca=$(cfssl gencert -initca $CFSSL_PROFILE_PATH_INT_CA)
    echo $int_ca | jq -r '.csr' >> $INT_CA_CSR
    echo $int_ca | jq -r '.key' >> $INT_CA_KEY

    int_ca=$(cfssl sign -ca $ROOT_CA_CRT -ca-key $ROOT_CA_KEY -config $CFSSL_CONFIG_FILE -profile $PROFILE_TYPE_ICA $INT_CA_CSR)    
    echo $int_ca | jq -r '.cert' >> $INT_CA_CRT

    cat $INT_CA_CRT >> $ROOT_CA_CRT
}


echo "Clean Artificats"
path_clean

echo "Initialize Directories"
path_init

echo "Generate Root CA"
generate_root_ca

echo "Generate Intermediate CA"
generate_int_ca
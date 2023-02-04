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

CFSSL_PROFILES_SERVERS_DIR=$CFSSL_PROFILES_DIR/servers
CFSSL_PROFILES_CLIENTS_DIR=$CFSSL_PROFILES_DIR/clients

PROFILE_TYPE_ICA=intermediate_ca
PROFILE_TYPE_SERVER=server
PROFILE_TYPE_CLIENT=client

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

# Generate PKI derived from Root CA and store to target directory
# Parameters:
# 1: PROFILE_CONFIG Cfssl Configs Profile
# 2: PROFILE_TYPE Traget profile type: {"server", "client"}
# 3: TARGET_DIR target directory to store pki
generate_cert() {
    PROFILE_CONFIG=$1
    PROFILE_TYPE=$2
    OUT_DIR=$3

    pki=$(cfssl gencert -ca $INT_CA_CRT -ca-key $INT_CA_KEY -config $CFSSL_CONFIG_FILE -profile=$PROFILE_TYPE $PROFILE_CONFIG)
    echo $pki | jq -r '.cert' >> $OUT_DIR/tls.crt
    echo $pki | jq -r '.key' >> $OUT_DIR/tls.key
    cp $ROOT_CA_CRT $OUT_DIR/ca.crt

    verify_certificate $OUT_DIR/tls.crt
}

# Verifies Certificate against Root CA Certificate 
# 1: Path to the certificate to be verified
verify_certificate() {
    openssl verify -CAfile $ROOT_CA_CRT $1
}

generate_certs() {
    echo "Generate Server PKIs"
    for PROFILE in $CFSSL_PROFILES_SERVERS_DIR/*; do
        CN=$(cat $PROFILE | jq -r .CN)

        CERT_PATH=$CERT_REPOSITORY_DIR/"$CN"/tls

        mkdir -p $CERT_PATH
        
        generate_cert $PROFILE $PROFILE_TYPE_SERVER $CERT_PATH
    done

    echo "Generate Clients PKIs"
    for PROFILE in $CFSSL_PROFILES_CLIENTS_DIR/*; do
        CN=$(cat $PROFILE | jq -r .CN)

        CERT_PATH=$CERT_REPOSITORY_DIR/"$CN"/client
        
        mkdir -p $CERT_PATH
        
        generate_cert $PROFILE $PROFILE_TYPE_CLIENT $CERT_PATH
    done
}

echo "Clean Artificats"
path_clean

echo "Initialize Directories"
path_init

echo "Generate Root CA"
generate_root_ca

echo "Generate Intermediate CA"
generate_int_ca

echo "Generate PKIs Automatically from Profiles directory"
generate_certs
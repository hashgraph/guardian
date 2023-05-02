#!/bin/bash

# Load environment variables
source $PWD/vault/hashicorp/.env

CERTS_BASE_DIR=$PWD/vault/hashicorp/certs

AUTH_TLS_REPOSITORY=$CERTS_BASE_DIR/auth_svc/client
AUTH_TLS_DEST=./auth-service/tls/vault

GUARDIAN_TLS_REPOSITORY=$CERTS_BASE_DIR/guardian_svc/client
GUARDIAN_TLS_DEST=./guardian-service/tls/vault

POLICY_TLS_REPOSITORY=$CERTS_BASE_DIR/policy_svc/client
POLICY_TLS_DEST=./policy-service/tls/vault

WORKER_TLS_REPOSITORY=$CERTS_BASE_DIR/worker_svc/client
WORKER_TLS_DEST=./worker-service/tls/vault


distribute() {
    mkdir -p $AUTH_TLS_DEST
    cp -rf $AUTH_TLS_REPOSITORY $AUTH_TLS_DEST

    mkdir -p $GUARDIAN_TLS_DEST
    cp -rf $GUARDIAN_TLS_REPOSITORY $GUARDIAN_TLS_DEST

    mkdir -p $POLICY_TLS_DEST
    cp -rf $POLICY_TLS_REPOSITORY $POLICY_TLS_DEST

    mkdir -p $WORKER_TLS_DEST
    cp -rf $WORKER_TLS_REPOSITORY $WORKER_TLS_DEST
}

clean_remote_certs() {
    rm -rf $AUTH_TLS_DEST

    rm -rf $GUARDIAN_TLS_DEST

    rm -rf $POLICY_TLS_DEST

    rm -rf $WORKER_TLS_DEST
}

clean_local_certs() {
    rm -rf $CERT_REPOSITORY_DIR
}

if [ $1 = "distribute" ]; then
    echo "distrubute keys between services"
    distribute    
elif [ $1 = "clean" ]; then
    echo "clean remote certs"
    clean_remote_certs

    echo "clean local certs"
    clean_local_certs
fi
#!/bin/bash

# Load environment variables
source $PWD/vault/aws/.env

POLICY_DIR=$PWD/vault/aws/configs/policies
ROLE_DIR=$PWD/vault/aws/configs/roles/role.json

create_iam_role_policy() {
  if [ -z "$GUARDIAN_ENV" ]
    then
       GUARDIAN_SECRETS_ROLE_NAME="$HEDERA_NET"_"$GUARDIAN_SECRETS_ROLE_NAME" 
    else
       GUARDIAN_SECRETS_ROLE_NAME="$GUARDIAN_ENV"_"$HEDERA_NET"_"$GUARDIAN_SECRETS_ROLE_NAME"
  fi	  
  echo $GUARDIAN_SECRETS_ROLE_NAME
  aws iam create-role --role-name $GUARDIAN_SECRETS_ROLE_NAME --assume-role-policy-document file://$ROLE_DIR

  for POLICY in $POLICY_DIR/*; do
    POLICY_NAME=$(basename $POLICY .json)
        
    if [ -z "$GUARDIAN_ENV" ]
    then
      	POLICY_NAME="$HEDERA_NET"_"$POLICY_NAME" 
    else
    	POLICY_NAME="$GUARDIAN_ENV"_"$HEDERA_NET"_"$POLICY_NAME"
    fi	
    
    echo $POLICY_NAME
    jq '.Statement[0].Resource |= sub("{{AWS_ACCOUNT_ID}}"; "'$AWS_ACCOUNT_ID'")' $POLICY > tmp.json
    aws iam create-policy --policy-name $POLICY_NAME --policy-document file://tmp.json
    aws iam attach-role-policy --role-name $GUARDIAN_SECRETS_ROLE_NAME --policy-arn arn:aws:iam::486330131759:policy/$POLICY_NAME
    
  done

  rm tmp.json

}

create_iam_role_policy

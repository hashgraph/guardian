#!/usr/bin/env bash
export $(cat .env | xargs)

action=$1

login() {
    login_url=''"${GUARDIAN_SERVER}"'/api/v1/accounts/login'
    token=$(curl --location --request POST $login_url \
        --header 'Content-Type: application/json' \
        --header 'Accept: application/json' \
        --data-raw '{
  "username": "StandardRegistry",
  "password": "test"
    }' | jq -r .accessToken)
    echo "$token"
}
token=$(login)

setup_standard_registry() {
    api_url=''"${GUARDIAN_SERVER}"'/api/v1/schemas/system/StandardRegistry'
    schema=$(cat standard-registry.json)
    
    new_schema_id=$(curl $api_url \
        -H 'Accept: application/json, text/plain, */*' \
        -H 'Authorization: Bearer '"$1"'' \
        -H 'Content-Type: application/json' \
        --data-raw ''"$schema"'' \
    --compressed | jq -r .id)
    
    echo $new_schema_id
    api_url=''"${GUARDIAN_SERVER}"'/api/v1/schemas/system/'"$new_schema_id"'/active'
    
    curl $api_url \
    -X 'PUT' \
    -H 'Accept: application/json, text/plain, */*' \
    -H 'Authorization: Bearer '"$1"'' \
    --compressed
    
}
token=$(login)
echo "Access token standard registry: " $token
case "$action" in
    standard-registry)
        setup_standard_registry $token
        echo "standard registry system schema created &  active"
    ;;
    *) echo "Action:  $1 is not processed"
    ;;
esac

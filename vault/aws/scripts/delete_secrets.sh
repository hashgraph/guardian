#!/bin/bash

aws secretsmanager list-secrets | jq -r '.SecretList[].ARN' | xargs -I {} aws secretsmanager delete-secret --secret-id {}
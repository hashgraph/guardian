# 🔨 Building from Pre-build containers

#### Docker compose configuration for apple M1 using images:

```
version: "3.8"
services:
  mongo:
    image: mongo
    command: "--setParameter allowDiskUseByDefault=true"
    restart: always
    expose:
      - 27017
 
  message-broker:
    image: nats:2.9.8
    expose:
      - 4222
    ports:
      - '8222:8222'
    command: '--http_port 8222'
 
  logger-service:
    image: gcr.io/hedera-registry/logger-service:2.9.3
    platform: linux/amd64
    depends_on:
      - message-broker
 
  worker-service-1:
    image: gcr.io/hedera-registry/worker-service:2.9.3
    platform: linux/amd64
    depends_on:
      - auth-service
    environment:
      SERVICE_CHANNEL: 'worker.1'
      IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDZhY0FFMmM3QjA5ODdCMjU1ZGZFMjMxZTA0YzI5NDZBZWI0YzE5NkQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjAwNzIyNzg4MDgsIm5hbWUiOiJ0ZXN0In0.vzt0-vBlbKiUSeyBZ6i3qTBKVMR3RL7CnkEXVNqvSH4'
 
  worker-service-2:
    image: gcr.io/hedera-registry/worker-service:2.9.3
    platform: linux/amd64
    depends_on:
      - auth-service
    environment:
      SERVICE_CHANNEL: 'worker.2'
      IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDZhY0FFMmM3QjA5ODdCMjU1ZGZFMjMxZTA0YzI5NDZBZWI0YzE5NkQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjAwNzIyNzg4MDgsIm5hbWUiOiJ0ZXN0In0.vzt0-vBlbKiUSeyBZ6i3qTBKVMR3RL7CnkEXVNqvSH4'
 
  auth-service:
    image: gcr.io/hedera-registry/auth-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - logger-service
 
  api-gateway:
    image: gcr.io/hedera-registry/api-gateway:2.9.3
    platform: linux/amd64
    expose:
      - 3002
    depends_on:
      - mongo
      - message-broker
      - guardian-service
      - auth-service
      - logger-service
 
  policy-service:
    image: gcr.io/hedera-registry/policy-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - auth-service
      - logger-service
 
  guardian-service:
    image: gcr.io/hedera-registry/guardian-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - auth-service
      - logger-service
      - worker-service-1
      - worker-service-2
      - policy-service
    environment:
      OPERATOR_ID: '0.0.10295'
      OPERATOR_KEY: '302e020100300506032b65700422042022c85d6c64bda64aa458cf715314c5469b3b84c58690470f5289cbada3af8dfb'
 
  web-proxy:
    image: gcr.io/hedera-registry/frontend:2.9.3
    platform: linux/amd64
    environment:
      GATEWAY_HOST: 'api-gateway'
      GATEWAY_PORT: '3002'
      GATEWAY_CLIENT_MAX_BODY_SIZE: '1024m'
    ports:
      - "3000:80"
    depends_on:
      - guardian-service
      - auth-service
      - api-gateway
volumes:
  mongo:
  # volume-guardian-service:
  # volume-ui-service:
  # volume-mrv-sender:
  #  volume-message-broker:
```

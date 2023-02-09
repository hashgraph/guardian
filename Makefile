vault_keygen:
	@./vault/hashicorp/scripts/keygen/keygen_cfssl.sh
	
cfgen:
	@./vault/hashicorp/scripts/consul/consul_config_gen.sh
	@./vault/hashicorp/scripts/vault/vault_config_gen.sh

vault_up: vault_keygen distribute_keys cfgen
	@docker-compose up -d consul vault
	@sleep 10
	@./vault/hashicorp/scripts/vault/vault_init.sh

vault_down:
	@docker-compose stop vault consul
	@docker-compose rm -s -v vault consul

vault_restart: vault_down
	@docker-compose up -d consul vault
	@sleep 10
	@./vault/hashicorp/scripts/vault/vault_init.sh

distribute_keys:
	@./vault/hashicorp/scripts/keygen/keystore.sh distribute

clean_keys:
	@./vault/hashicorp/scripts/keygen/keystore.sh clean

clean: clean_keys
	@rm -rf ./vault/hashicorp/vault ./vault/hashicorp/consul

guardian_build:
	cd interfaces && yarn install && yarn build:prod
	cd common && yarn install && yarn build:prod

	cd logger-service && yarn install && yarn build:prod
	cd api-gateway && yarn install && yarn build:prod
	cd auth-service && yarn install && yarn build:prod
	cd worker-service && yarn install && yarn build:prod
	cd guardian-service && yarn install && yarn build:prod
	cd policy-service && yarn install && yarn build:prod
	cd topic-viewer && yarn install && yarn build:prod
	cd mrv-sender && yarn install && yarn build:prod
	cd frontend && yarn install && yarn build:prod

guardian_make_env:
	cd logger-service && cp .env.example .env && cp .env.docker.example .env.docker
	cd api-gateway && cp .env.example .env && cp .env.docker.example .env.docker
	cd auth-service && cp .env.example .env && cp .env.docker.example .env.docker
	cd guardian-service && cp .env.example .env && cp .env.docker.example .env.docker
	cd worker-service && cp .env.example .env && cp .env.docker.example .env.docker
	cd policy-service && cp .env.example .env && cp .env.docker.example .env.docker

guardian_up_pm2:
	docker-compose -f docker-compose-dev.yml up -d mongo message-broker ipfs-node
	pm2 start ecosystem.config.js

guardian_down_pm2:
	docker-compose stop mongo
	docker-compose rm -s -v mongo
	pm2 delete all
	
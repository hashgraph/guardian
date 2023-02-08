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

guardian_up_pm2:
	docker-compose -f docker-compose-dev.yml up -d mongo message-broker

	cd interfaces && yarn install && yarn build:prod
	cd common && yarn install && yarn build:prod

	cd api-gateway && yarn install && yarn build:prod
	cd api-gateway && pm2 start "npm start" -n gateway

	cd logger-service && yarn install && yarn build:prod
	cd logger-service && pm2 start "npm start" -n logger

	cd auth-service && yarn install && yarn build:prod
	cd auth-service && pm2 start "npm start" -n auth

	cd worker-service && yarn install && yarn build:prod
	cd worker-service && pm2 start "npm start" -n worker

	cd guardian-service && yarn install && yarn build:prod
	cd guardian-service && pm2 start "npm start" -n guardian

	cd policy-service && yarn install && yarn build:prod
	cd policy-service && pm2 start "npm start" -n policy

	cd topic-viewer && yarn install && yarn build:prod
	cd topic-viewer && pm2 start "npm start" -n topic

	cd mrv-sender && yarn install && yarn build:prod
	cd mrv-sender && pm2 start "npm start" -n mrv

	cd frontend && yarn install && yarn build:prod
	cd frontend && pm2 start "npm start" -n frontend
	
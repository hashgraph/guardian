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

guardian_build_prod:
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

guardian_build_demo:
	cd interfaces && yarn install && yarn build:prod
	cd common && yarn install && yarn build:prod

	cd logger-service && yarn install && yarn build:prod
	cd api-gateway && yarn install && yarn build:demo
	cd auth-service && yarn install && yarn build:demo
	cd worker-service && yarn install && yarn build:prod
	cd guardian-service && yarn install && yarn build:prod
	cd policy-service && yarn install && yarn build:prod
	cd topic-viewer && yarn install && yarn build:prod
	cd mrv-sender && yarn install && yarn build:prod
	cd frontend && yarn install && yarn build:demo

guardian_make_env:
	@for dir in logger-service api-gateway auth-service guardian-service worker-service policy-service; do \
		echo "Writing for $$dir"; \
		rm -f "$$dir/.env"; \
		. .env; \
		GUARDIAN_ENV=$${GUARDIAN_ENV}; \
		if [ "$$GUARDIAN_ENV" = "" ]; then \
			DOT=""; \
		else \
			DOT="."; \
		fi; \
		case $$dir in \
			logger-service) cp $$dir/configs/.env.logger$$DOT$$GUARDIAN_ENV $$dir/.env;; \
			api-gateway) cp $$dir/configs/.env.gateway$$DOT$$GUARDIAN_ENV $$dir/.env;; \
			auth-service) cp $$dir/configs/.env.auth$$DOT$$GUARDIAN_ENV $$dir/.env;; \
			guardian-service) cp $$dir/configs/.env.guardian$$DOT$$GUARDIAN_ENV $$dir/.env; \
				operator_id=$$(grep -E '^[^#]*OPERATOR_ID' configs/.env.$$GUARDIAN_ENV.guardian.system | grep -o '="[^"]*"' | cut -d '"' -f 2 | tail -n 1); \
				operator_key=$$(grep -E '^[^#]*OPERATOR_KEY' configs/.env.$$GUARDIAN_ENV.guardian.system | grep -o '="[^"]*"' | cut -d '"' -f 2 | tail -n 1); \
				grep -v '^OPERATOR_ID=' $$dir/.env > $$dir/.env.tmp && mv $$dir/.env.tmp $$dir/.env; \
				grep -v '^OPERATOR_KEY=' $$dir/.env > $$dir/.env.tmp && mv $$dir/.env.tmp $$dir/.env; \
				echo "OPERATOR_ID=\"$$operator_id\"" >> $$dir/.env; \
				echo "OPERATOR_KEY=\"$$operator_key\"" >> $$dir/.env;; \
			worker-service) cp $$dir/configs/.env.worker$$DOT$$GUARDIAN_ENV $$dir/.env; \
				ipfs_storage_api_key=$$(grep -o 'IPFS_STORAGE_API_KEY="[^"]*"' configs/.env.$$GUARDIAN_ENV.guardian.system | cut -d '"' -f 2); \
				grep -v '^IPFS_STORAGE_API_KEY=' $$dir/.env > $$dir/.env.tmp && mv $$dir/.env.tmp $$dir/.env; \
				echo "IPFS_STORAGE_API_KEY=\"$$ipfs_storage_api_key\"" >> $$dir/.env;; \
			policy-service) cp $$dir/configs/.env.policy$$DOT$$GUARDIAN_ENV $$dir/.env;; \
		esac; \
	done

guardian_reset_env:
	@for dir in logger-service api-gateway auth-service guardian-service worker-service policy-service; do \
		echo "Cleaning $$dir"; \
		rm -f "$$dir/.env"; \
		echo 'GUARDIAN_ENV=""' > "$$dir/.env"; \
	done

guardian_up_pm2:
	docker-compose -f docker-compose-dev.yml up -d mongo message-broker ipfs-node
	pm2 start ecosystem.config.js

guardian_down_pm2:
	docker-compose stop mongo
	docker-compose rm -s -v mongo
	pm2 delete all
	
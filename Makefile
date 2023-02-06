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

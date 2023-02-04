vault_keygen:
	@./vault/hashicorp/scripts/keygen/keygen_cfssl.sh
	@sleep 10
	@./vault/hashicorp/scripts/vault/vault_init.sh

cfgen:
	@./vault/hashicorp/scripts/consul/consul_config_gen.sh
	@./vault/hashicorp/scripts/vault/vault_config_gen.sh

vault_up: vault_keygen cfgen
	@docker-compose -f ./vault/hashicorp/docker-compose.yaml up -d

vault_down:
	@docker-compose -f ./vault/hashicorp/docker-compose.yaml down -v

vault_restart: vault_down vault_up
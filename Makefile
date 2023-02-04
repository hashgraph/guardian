vault_keygen:
	@./vault/hashicorp/scripts/keygen/keygen_cfssl.sh

cfgen:
	@./vault/hashicorp/scripts/consul/consul_config_gen.sh
	@./vault/hashicorp/scripts/vault/vault_config_gen.sh
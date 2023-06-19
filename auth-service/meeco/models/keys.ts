export interface IKEK {
  key_encryption_key: {
    id: string,
    serialized_key_encryption_key: string,
  }
}

export interface IDEK {
  data_encryption_key: {
    id: string,
    serialized_data_encryption_key: string,
  }
}

export interface IKeypair {
  keypair: {
    id: string,
    public_key: string,
    encrypted_serialized_key: string,
    metadata: {
        did: string,
        public_key_encoding: string,
        private_key_info: string,
    },
    external_identifiers: string[],
  }
}
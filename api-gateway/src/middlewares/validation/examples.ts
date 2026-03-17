export enum Examples {
    DB_ID = '000000000000000000000001',
    MESSAGE_ID = '0000000000.000000001',
    UUID = '00000000-0000-0000-0000-000000000000',
    ACCOUNT_ID = '0.0.1',
    DATE = '1900-01-01T00:00:00.000Z',
    IPFS = 'ipfs://AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    COLOR = '#000000',
    DID = '#did:hedera:testnet:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_0.0.0000001',
    HASH = 'GcDE9NsPJc7oCZvSVJySCZHxTxvjc3ZAMgtKozP1r1Eh',
    OTP_NAME = 'OS Guardian',
    USER_NAME_SR_1 = 'StandardRegistry',
    OTP_SECRET = 'AAA0AA0A0A00A000',
    OTP_AUTH_URL = 'otpauth://totp/OS%20Guardian:StandardRegistry?issuer=OS+Guardian&period=30&secret=XXX0XX0X0X00X000',
    OTP_ALGO = 'sha1',
    NUMBER = 111,
    OTP_CODE = '111111',
    TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxM2E0NTkyLWU2YjQtNDg0OS1hMTkxLTAxOWVkODNkYzM5ZCIsIm5hbWUiOiJTdGFuZGFyZFJlZ2lzdHJ5IiwiZXhwaXJlQXQiOjE4MDUyODI4NjU3MDEsImlhdCI6MTc3Mzc0Njg2NX0.BsKje1bza0NEKKTAHFMRfwa3H-H-eRu7-KEDHKTftljXE3eQNmYCf_ftaPpw3DdsfsavBcEDfs5UQwlyeMsaTJPehEx_gl697rGQx6b8objGkqfFL2A7nWetMbWtxFFsIrbxs4mqHy1LM_4VVJuiXsH2DYQZkxOmw4HdyUshjE84',
    ROLE_SR = 'STANDARD_REGISTRY',
    ROLE_USER = 'USER'
}

export const ObjectExamples = {
    LOGIN_SUCCESSFUL: {
        did: Examples.DID,
        refreshToken: Examples.TOKEN,
        role: Examples.ROLE_SR,
        username: Examples.USER_NAME_SR_1,
        weakPassword: false
    },

    OTP_REQUIRED_RESPONSE: {
        success: false,
        otprequired: true
    }
}
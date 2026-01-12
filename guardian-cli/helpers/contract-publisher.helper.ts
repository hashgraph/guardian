import path from 'node:path';
import fs from 'node:fs';
import solc from 'solc';
import {
    Client,
    ContractCreateTransaction,
    FileAppendTransaction,
    FileCreateTransaction,
    PrivateKey,
    Status,
} from '@hiero-ledger/sdk';

/**
 * Network
 */
export enum Network {
    TESTNET = 'testnet',
    MAINNET = 'mainnet',
    PREVIEWNET = 'previewnet',
}

/**
 * Contract publisher
 */
export class ContractPublisher {
    /**
     * Chunk size
     */
    public static readonly CHUNK_SIZE = 4096;

    /**
     * Split contract bytecode
     * @param bytecode Contract bytecode
     * @returns Chunks
     */
    private static _splitContractBytecode(bytecode: string) {
        const chunks = [];
        let chuckedSize = 0;
        while (chuckedSize < bytecode.length) {
            const chunk = bytecode.slice(
                chuckedSize,
                chuckedSize + ContractPublisher.CHUNK_SIZE
            );
            chunks.push(chunk);
            chuckedSize += chunk.length;
        }
        return chunks;
    }

    /**
     * Split contract bytecode Buffer into chunks
     * @param buffer Contract bytecode buffer
     * @returns Chunks array (Buffer[])
     */
    private static _splitContractBuffer(buffer: Buffer): Buffer[] {
        const chunks: Buffer[] = [];
        const chunkSize = ContractPublisher.CHUNK_SIZE;

        for (let i = 0; i < buffer.length; i += chunkSize) {
            chunks.push(Buffer.from(buffer.subarray(i, i + chunkSize)));
        }

        return chunks;
    }

    /**
     * Deploy contract file
     * @param bytecode Bytecode
     * @param credentials Credentials
     * @param network Nework
     * @returns Contract file identifier
     */
    public static async deployContractFile(
        bytecode: string,
        credentials: { operatorId: string; operatorKey: string },
        network?: Network
    ) {
        let client: Client;
        switch (network) {
            case Network.MAINNET:
                client = Client.forMainnet();
                break;
            case Network.PREVIEWNET:
                client = Client.forPreviewnet();
                break;
            default:
                client = Client.forTestnet();
        }
        const operatorKey = PrivateKey.fromString(credentials.operatorKey);
        client = client.setOperator(credentials.operatorId, operatorKey);
        try {
            const fileCreateTx = new FileCreateTransaction().setKeys([
                operatorKey,
            ]);
            const fileCreateEx = await fileCreateTx.execute(client);
            const fileCreateTr = await fileCreateEx.getReceipt(client);
            const bytecodeFileId = fileCreateTr.fileId;

            const sanitizedBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
            const bytecodeBuffer = Buffer.from(sanitizedBytecode, 'hex');
            const chunks = ContractPublisher._splitContractBuffer(bytecodeBuffer);

            for (const chunk of chunks) {
                const fileAppendTx = new FileAppendTransaction()
                    .setFileId(bytecodeFileId)
                    .setContents(chunk)
                    .setMaxChunks(Number.MAX_SAFE_INTEGER)
                    .setTransactionValidDuration(180);
                const fileAppendEx = await fileAppendTx.execute(client);
                const fileAppendTr = await fileAppendEx.getReceipt(client);
                if (fileAppendTr.status !== Status.Success) {
                    throw new Error('Error while uploading contract code');
                }
            }
            return bytecodeFileId.toString();
        } catch (error) {
            throw error;
        } finally {
            client.close();
        }
    }

    /**
     * Deploy contract
     * @param contractFileId Contract file identifier
     * @param gas Gas
     * @param credentials Credentials
     * @param network Network
     * @returns Contract identifier
     */
    public static async deployContract(
        contractFileId: string,
        gas: number = 5000000,
        credentials: { operatorId: string; operatorKey: string },
        network?: Network
    ) {
        let client: Client;
        switch (network) {
            case Network.MAINNET:
                client = Client.forMainnet();
                break;
            case Network.PREVIEWNET:
                client = Client.forPreviewnet();
                break;
            default:
                client = Client.forTestnet();
        }
        const operatorKey = PrivateKey.fromString(credentials.operatorKey);
        client = client.setOperator(credentials.operatorId, operatorKey);
        try {
            const contractTx = await new ContractCreateTransaction()
                .setBytecodeFileId(contractFileId)
                .setGas(gas);
            const contractResponse = await contractTx.execute(client);
            const contractReceipt = await contractResponse.getReceipt(client);
            const newContractId = contractReceipt.contractId;
            return newContractId.toString();
        } catch (error) {
            throw error;
        } finally {
            client.close();
        }
    }

    /**
     * Compile contract
     * @param filePath Contract file path
     * @param contractName Contract name
     * @param output Output path
     * @returns Contract bytecode
     */
    public static async compileContract(
        filePath: string,
        contractName: string
    ) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`${filePath} is not exists`);
        }
        if (!contractName) {
            throw new Error('Invalid contract name');
        }
        const stat = fs.lstatSync(filePath);
        if (!stat.isFile()) {
            throw new Error(`${filePath} is not file`);
        }
        const sources: any = {};
        sources[filePath] = {
            content: await fs.readFileSync(filePath, {
                encoding: 'utf8',
            }),
        };
        const solcOptions = {
            language: 'Solidity',
            sources,
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
                metadata: {
                    bytecodeHash: 'none',
                },
                outputSelection: {
                    '*': {
                        '*': ['*'],
                    },
                },
            },
        };
        const compileStringResult = solc.compile(JSON.stringify(solcOptions), {
            import: (relativePath) => {
                const source = fs.readFileSync(relativePath, 'utf8');
                return { contents: source };
            },
        });
        const compileResult = JSON.parse(compileStringResult);
        const bytecode =
            compileResult.contracts[filePath][contractName].evm.bytecode.object;
        return bytecode;
    }
}

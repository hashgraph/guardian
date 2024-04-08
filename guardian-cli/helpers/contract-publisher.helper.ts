import path from 'path';
import fs from 'fs';
import solc from 'solc';
import {
    Client,
    FileAppendTransaction,
    FileCreateTransaction,
    PrivateKey,
    Status,
} from '@hashgraph/sdk';

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

            const fileAppendTx = new FileAppendTransaction()
                .setFileId(bytecodeFileId)
                .setContents(bytecode)
                .setMaxChunks(Number.MAX_SAFE_INTEGER)
                .setTransactionValidDuration(180);
            const fileAppendEx = await fileAppendTx.execute(client);
            const fileAppendTr = await fileAppendEx.getReceipt(client);
            if (fileAppendTr.status !== Status.Success) {
                throw new Error('Error while uploading contract code');
            }
            return bytecodeFileId.toString();
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
        contractName: string,
        output?: string
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
        if (output) {
            const outputAbsolutePath = path.resolve(output);
            const outputDirectory = path.dirname(outputAbsolutePath);
            if (!fs.existsSync(outputDirectory)) {
                fs.mkdirSync(outputDirectory);
            }
            fs.writeFileSync(outputAbsolutePath, bytecode);
        }
        return compileResult.contracts[filePath][contractName].evm.bytecode
            .object;
    }
}

import axios from 'axios';
import fs from 'node:fs';
import WebSocket from 'ws';
import path from 'node:path';

interface Task {
    action: string; options?: any; resolve: Function
}
export class PolicyPublisher {
    private _policiesConfig: Map<string, string> = new Map();
    private _accessToken: string;
    private _refreshToken: string;
    private _pingInterval;
    private _updateTokenInterval;
    private _tasks: Map<
        string,
        Task
    > = new Map();
    private _ws: WebSocket;

    private constructor(
        private _policiesDirectory: string,
        private _baseURL: string,
        private _user: string,
        private _password: string,
        private _output?: string
    ) {}

    private getBaseUrl(url) {
        if (/^https/.test(url)) {
            return `${url.replace(/^https/, 'wss')}`;
        }
        return `${url.replace(/^http/, 'ws')}`;
    }

    private async initWebSocketConnection() {
        this._ws = new WebSocket(
            `${this.getBaseUrl(this._baseURL)}/ws/?token=${this._accessToken}`
        );
        this._ws.on('open', () => {
            clearInterval(this._pingInterval);
            this._pingInterval = setInterval(() => {
                this._ws.send('ping');
            }, 30000);
        });
        this._ws.on('message', (binaryData: Buffer) => {
            const stringData = binaryData.toString();
            if (stringData === 'pong') {
                return;
            }
            const event = JSON.parse(stringData);
            const { type, data } = event;
            if (type === 'UPDATE_TASK_STATUS') {
                const { taskId, error, result } = data;
                if (!this._tasks.has(taskId)) {
                    return;
                }
                if (result) {
                    const task = this._tasks.get(taskId);
                    if (task.action === 'Import policy file') {
                        this.publishPolicy(taskId, result.policyId);
                    }
                    if (task.action === 'Publish policy') {
                        this.onPolicyPublished(taskId, result.policyId);
                    }
                } else if (error) {
                    this._tasks.delete(taskId);
                    return;
                }
            }
        });
        this._ws.on('close', () => {
            clearInterval(this._pingInterval);
        });
    }

    private async getPolicy(policyId: string) {
        const response = await axios.get<any>(
            new URL(`/policies/${policyId}`, this._baseURL).toString(),
            {
                headers: {
                    Authorization: `Bearer ${this._accessToken}`,
                },
            }
        );
        return response.data;
    }

    private async importPolicy(file: Buffer) {
        const response = await axios.post(
            new URL('/policies/push/import/file', this._baseURL).toString(),
            file,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    Authorization: `Bearer ${this._accessToken}`,
                },
            }
        );
        return response.data;
    }

    private async publishPolicy(importTaskId: string, policyId: string) {
        const task = this._tasks.get(importTaskId);
        try {
            const policy = await this.getPolicy(policyId);
            policy.policyVersion = task.options.version;
            const response = await axios.put(
                new URL(
                    `/policies/push/${policyId}/publish`,
                    this._baseURL
                ).toString(),
                policy,
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                    },
                }
            );
            console.log(`Publish policy ${task.options.file} is started`);
            const { taskId, action } = response.data;
            this._tasks.set(taskId, {
                action,
                options: task.options,
                resolve: task.resolve,
            });
        } catch (error) {
            this._policiesConfig.delete(task.options.file);
            console.error(error);
        } finally {
            this._tasks.delete(importTaskId);
        }
    }

    private async onPolicyPublished(publishTaskId: string, policyId: string) {
        const task = this._tasks.get(publishTaskId);
        try {
            const policy = await this.getPolicy(policyId);
            console.log(`${task.options.file} - ${policy.messageId}`);
            if (this._output) {
                fs.appendFileSync(
                    this._output,
                    `${task.options.file} - ${policy.messageId} \r\n`
                );
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._tasks.delete(publishTaskId);
            task.resolve();
        }
    }

    private async finish() {
        if (this._ws) {
            this._ws?.close();
        }
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
        }
        if (this._updateTokenInterval) {
            clearInterval(this._updateTokenInterval);
        }
    }

    private async updateAccessToken() {
        const accessTokenResponse = await axios.post(
            new URL(`accounts/access-token`, this._baseURL).toString(),
            {
                refreshToken: this._refreshToken,
            }
        );
        this._accessToken = accessTokenResponse.data.accessToken;
    }

    private async authorize(): Promise<void> {
        const loginResponse = await axios.post(
            new URL(`accounts/login`, this._baseURL).toString(),
            {
                username: this._user,
                password: this._password,
            }
        );
        this._refreshToken = loginResponse.data.refreshToken;
        this._updateTokenInterval = setInterval(
            this.updateAccessToken.bind(this),
            20000
        );
        await this.updateAccessToken();
        await this.initWebSocketConnection();
    }

    static async publish(
        policiesDirectory: string,
        configFilePath: string,
        baseURL: string,
        user: string,
        password: string,
        output?: string
    ) {
        if (!policiesDirectory) {
            throw new Error(`Policies directory option is empty`);
        }
        const policyPublisher = new PolicyPublisher(
            Path.isAbsolute(policiesDirectory)
                ? policiesDirectory
                : Path.join(process.cwd(), policiesDirectory),
            baseURL,
            user,
            password,
            output &&
                (Path.isAbsolute(output)
                    ? output
                    : Path.join(process.cwd(), output))
        );
        await policyPublisher.authorize();
        await policyPublisher.parseConfigFile(configFilePath);
        await policyPublisher.start();
        await policyPublisher.finish();
    }

    private async start(): Promise<void> {
        await this.read(this._policiesDirectory);
    }

    private async read(dirPath) {
        if (!fs.existsSync(dirPath)) {
            throw new Error(`${dirPath} is not exists`);
        }
        const stat = fs.lstatSync(dirPath);
        if (stat.isFile()) {
            const file = Path.basename(dirPath);
            const version = this._policiesConfig.get(file);
            if (!version) {
                return;
            }

            const { taskId, action } = await this.importPolicy(
                await fs.readFileSync(dirPath)
            );
            console.log(`Import policy ${file} is started`);
            await new Promise((resolve) =>
                this._tasks.set(taskId, {
                    action,
                    options: {
                        version,
                        file,
                    },
                    resolve,
                })
            );
        }
        if (stat.isDirectory()) {
            const dirs = fs.readdirSync(dirPath);
            for (const dir of dirs) {
                await this.read(Path.join(dirPath, dir));
            }
        }
    }

    private async parseConfigFile(configFilePath: string) {
        const fileData = fs.readFileSync(configFilePath);
        const fileDataString = fileData.toString();
        const policiesConfig: [fileName: string, version: string][] =
            JSON.parse(fileDataString);
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < policiesConfig.length; i++) {
            this._policiesConfig.set(
                policiesConfig[i][0],
                policiesConfig[i][1]
            );
            console.log(`Policy ${policiesConfig[i][0]} added to config`);
        }
    }
}

declare module 'fastmq' {
  interface IFastMq {
    Client: {
      connect(channelName: string, port: number, host: string): IFastMqChannel;
    };

    Server: {
      create(channelName: string, port: number, host: string): IFastMqServer;
    }
  }

  export interface IFastMqChannel {
    request(
      target: string,
      topic: string,
      data: any,
      dataType?: string
    ): Promise<{ payload: any }>;

  }

  export interface IFastMqServer {
    start(): Promise<any>
  }

  const fastmq: IFastMq;

  export default fastmq;
}

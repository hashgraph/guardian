declare module 'fastmq' {
  interface IFastMq {
    Client: {
      connect(channelName: string, port: number, host: string): IFastMqChannel;
    };
  }

  export interface IFastMqChannel {
    request(
      target: string,
      topic: string,
      data: any,
    ): Promise<{ payload: any }>;
  }

  const fastmq: IFastMq;

  export default fastmq;
}

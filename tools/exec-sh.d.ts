declare module 'exec-sh' {
  interface IExecSh {
    (command: string, options?: Record<string, unknown> | true): void;
    promise: (
      command: string,
      options?: Record<string, unknown> | true,
    ) => Promise<unknown>;
  }

  const execSh: IExecSh;

  export = execSh;
}

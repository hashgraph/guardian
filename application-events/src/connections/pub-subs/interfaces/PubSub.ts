export default interface PubSub {
  publish<T> (subject: string, event: T): void;
  subscribe (subject: string, cb: (payload: unknown) => void): void;
}

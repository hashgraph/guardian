export default interface PubSub {
  publish (subject: string, event: JSON): void;
  subscribe (subject: string, cb: (payload: JSON) => void): void;
}

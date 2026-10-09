export interface IListenerOptions {
    topicId: string;
    name?: string;
    index?: number;
    /**
     * Poll on a short idle cap and outside the regular pass delay
     */
    latencySensitive?: boolean;
}

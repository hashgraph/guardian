import { TopicMessage } from "./topic-message.interface.js";

export interface TopicInfo {
    links: {
        next: string | null
    };
    messages: TopicMessage[];
    _status?: {
        messages: {
            message: string
        }[]
    }
}
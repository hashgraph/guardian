import { TopicMessage } from './topic-message.js';

export interface TopicInfo {
    links: {
        next: string | null;
    };
    messages: TopicMessage[];
    _status?: {
        messages: {
            message: string;
        }[];
    };
}

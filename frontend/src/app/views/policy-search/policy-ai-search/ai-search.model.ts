export type AISearchMessageType = 'REQUEST' | 'RESPONSE';

export interface AISearchMessage {
    type: AISearchMessageType;
    data: string | AISearchResponse;
}

export interface AISearchRequest {
    message: string;
}

export interface AISearchResponse {
    answerBefore: string;
    items: {
        id: string;
        label: string;
        text: string;
        url?: string;
    }[];
    answerAfter: string;
}

export const MOCK_AI_SEARCH_MESSAGE: AISearchMessage[] = [
    {
        type: 'REQUEST',
        data: 'Just simple message request',
    },
    {
        type: 'RESPONSE',
        data: {
            answerBefore: 'Answer before policies list',
            items: [
                {
                    id: '001-1',
                    label: 'OM9865',
                    text: 'description for OM9865',
                },
                {
                    id: '001-2',
                    label: 'OM9866',
                    text: 'description for OM9866',
                },
                {
                    id: '001-3',
                    label: 'OM9867',
                    text: 'description for OM9867',
                },
            ],
            answerAfter: 'Answer after policies list',
        }
    },
    {
        type: 'REQUEST',
        data: 'Just simple message request',
    },
    {
        type: 'RESPONSE',
        data: {
            answerBefore: 'Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 Answer before policies list 2 ',
            items: [
                {
                    id: '002-1',
                    label: 'FR9865',
                    text: 'description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865 description for FR9865',
                },
                {
                    id: '002-2',
                    label: 'FR9866',
                    text: 'description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866 description for FR9866',
                },
                {
                    id: '002-3',
                    label: 'FR9867',
                    text: 'description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867',
                },
                {
                    id: '002-4',
                    label: 'FR9868',
                    text: 'description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867 description for FR9867',
                },
            ],
            answerAfter: 'Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 Answer after policies list 2 ',
        }
    },
];

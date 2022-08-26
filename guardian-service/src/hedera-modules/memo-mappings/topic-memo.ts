import { TopicType } from '@guardian/interfaces';
import { MemoMap } from './memo-map';

/**
 * Topic memo map
 */
export class TopicMemo extends MemoMap {
    /**
     * Default memo for dynamic topic
     */
    private static readonly _dynamicTopicMemo = 'Policy operation topic';

    /**
     * Topic memo map
     */
    private static readonly _topicMemoMapping = TopicMemo.initTopicMap();

    /**
     * Global topic memo
     */
    private static readonly _globalTopicMemo = 'Standard Registries initialization topic';

    /**
     * Get topic memo
     * @param config Topic config
     * @returns Memo
     */
    public static getTopicMemo(
        config: {
            /**
             * Topic type
             */
            type: TopicType,

            /**
             * Topic name
             */
            name?: string
        }
    ): string {
        let memo = TopicMemo._topicMemoMapping[config.type];
        if (config.type === TopicType.DynamicTopic) {
            try {
                memo = TopicMemo.parseMemo(false, memo, config)
            }
            catch {
                memo = TopicMemo._dynamicTopicMemo;
            }
        }
        return memo || '';
    }

    /**
     * Initializing topic memo map
     * @returns Topic memo map
     */
    private static initTopicMap() {
        const topicMemo = {};
        topicMemo[TopicType.UserTopic] = 'Standard Registry organization topic';
        topicMemo[TopicType.PolicyTopic] = 'Policy development topic';
        topicMemo[TopicType.InstancePolicyTopic] = 'Policy instance configuration topic';
        topicMemo[TopicType.DynamicTopic] = '${name} operation topic';
        topicMemo[TopicType.SchemaTopic] = 'Schema development topic';
        return topicMemo;
    }

    /**
     * Get global topic memo
     * @returns Global topic memo
     */
    public static getGlobalTopicMemo(): string {
        return TopicMemo._globalTopicMemo;
    }
}

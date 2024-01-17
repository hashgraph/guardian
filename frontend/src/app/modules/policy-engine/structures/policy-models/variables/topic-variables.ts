
import { PolicyTopic } from '../policy/policy-topic.model';
import { ModuleVariable } from './module-variable.model';

export class TopicVariables {
    public name: string;
    public description: string;
    public value: string;
    public data?: PolicyTopic;

    constructor(topic?: PolicyTopic | ModuleVariable | string, value?: string) {
        this.description = '';
        if (typeof topic === 'string') {
            this.name = topic;
            this.description = topic;
            this.value = topic;
        } else if(topic instanceof ModuleVariable) {
            this.name = topic.name;
            this.description = topic.name;
            this.value = topic.name;
        } else if (topic) {
            this.name = topic.name;
            this.description = topic.description;
            this.value = topic.name;
            this.data = topic;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}

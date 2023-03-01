import { ModuleVariableModel } from '../module-variable.model';
import { PolicyTopicModel } from '../policy-topic.model';

export class TopicVariables {
    public name: string;
    public description?: string;
    public value: string;
    public data?: PolicyTopicModel;

    constructor(topic?: PolicyTopicModel | ModuleVariableModel | string, value?: string) {
        if (typeof topic === 'string') {
            this.name = topic;
            this.description = topic;
            this.value = topic;
        } else if(topic instanceof ModuleVariableModel) {
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
import { ConsumerDeserializer, IncomingRequest, OutgoingResponse, ProducerSerializer } from '@nestjs/microservices';

/**
 * NestJS deserializer
 */
export class InboundMessageIdentityDeserializer implements ConsumerDeserializer {
    /**
     * Deserialize
     * @param value
     * @param options
     */
    deserialize(value: any, options?: Record<string, any>): IncomingRequest {
        console.log('d', value, options);
        return value;
    }
}

/**
 * NestJS serializer
 */
export class OutboundResponseIdentitySerializer implements ProducerSerializer {
    /**
     * Serialize
     * @param value
     * @param options
     */
    serialize(value: any, options?: Record<string, any>): OutgoingResponse {
        console.log('s', value, options);
        return value.data;
    }
}

import { Serializer, OutgoingResponse, ConsumerDeserializer, IncomingRequest } from '@nestjs/microservices';

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
        console.log(value, options);
        return value;
    }
}

/**
 * NestJS serializer
 */
export class OutboundResponseIdentitySerializer implements Serializer {
    /**
     * Serialize
     * @param value
     * @param options
     */
    serialize(value: any, options?: Record<string, any>): any {
        console.log(value, options);
        return value;
    }
}

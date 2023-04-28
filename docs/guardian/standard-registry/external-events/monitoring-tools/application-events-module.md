# ⛏ Application-events module

The application-events module provide resources in order to integrate the external events described [here](https://docs.hedera.com/guardian/guardian/standard-registry/external-events) to the external application.

An API is provided to allow registration for webhooks which is described in this port: [http://localhost:3012/api-docs](http://localhost:3012/api-docs)

The user can consume the available events, and register webhooks specifying these events.&#x20;

And for streaming consuming resources, we provide an endpoint which could be consuming by streaming technologies: [http://localhost:3012/api/events/subscribe](http://localhost:3012/api/events/subscribe)

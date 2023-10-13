# 📄 API Architecture Customization

## 1. Introduction

As the demand for web services continues to increase, the importance of building efficient and scalable APIs has become more important than ever. Node.js has become a popular platform for building APIs due to its event-driven, non-blocking I/O model that makes it ideal for building real-time web applications.

However, as with any technology, there are always opportunities for improvement. In this document, we will explore some best practices for improving your API architecture in Node.js. We will cover some topics to improve the Guardian API.

Whether you are building a new API or looking to improve an existing one, the recommendations in this document will help the Guardian to build a more reliable, scalable, and maintainable API.

## 2. Web Proxy

As web applications grow in complexity, the need for a robust and scalable proxy server becomes increasingly important. While Nginx has been a popular choice for many years, Node.js Express with TypeScript has emerged as a powerful alternative due to its flexibility, scalability, and ease of customization.

In this document, we will explore the benefits of migrating a proxy application from Nginx to Node.js Express with TypeScript. We will cover topics such as performance optimization, security enhancements, and customization of headers, requests, and responses.

Whether you are looking to improve the scalability of your application or add new security layers, the migration to Node.js Express with TypeScript will provide you with the tools necessary to achieve your goals. By leveraging the power of TypeScript, you can write more maintainable code and take advantage of its type checking capabilities to catch errors early in the development process.

So, let's get started and see how we can migrate our proxy application to Node.js Express with TypeScript and unlock its full potential!

Why migrate?\
\
Here are some reasons why migrating a proxy application from Nginx to Node.js Express can be beneficial:

**Flexibility**: While Nginx is a powerful tool for serving static files and proxying requests, it can be limiting when it comes to customizing headers, requests, and responses. Node.js Express, on the other hand, provides a lot of flexibility when it comes to building proxy servers. It allows you to write JavaScript code to handle requests and responses, and provides a lot of middleware that can be used to add features such as authentication, caching, and compression.

**Performance**: While Nginx is known for its speed and efficiency, Node.js Express can be just as fast, if not faster, when properly optimized. Node.js Express uses an event-driven, non-blocking I/O model that makes it ideal for handling a large number of simultaneous connections. Additionally, because Node.js Express is written in JavaScript, it can be optimized using various tools and techniques to achieve maximum performance.

**Ease of Development**: Nginx configuration files can be complex and difficult to manage, especially for developers who are not familiar with the syntax. Node.js Express, on the other hand, uses JavaScript, which is a familiar language for many developers. Additionally, Node.js Express has a large community and a lot of documentation and tutorials available, making it easier for developers to get started.

**Customization**: Node.js Express provides a lot of customization options, allowing you to tailor your proxy server to fit your specific needs. For example, you can easily add custom middleware to handle specific types of requests or responses, or add your own error handling to handle errors in a specific way. Additionally, because Node.js Express is written in JavaScript, it can be easily extended with third-party modules from npm.

**TypeScript Support**: Node.js Express has built-in support for TypeScript, which is a superset of JavaScript that provides additional features such as static typing and interfaces. TypeScript can help catch errors before they occur and make code more maintainable and easier to read.

How hard would it be?

With simple steps we can transform the current web-proxy module into a NodeJS application:

```javascript
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
const app = express();


const wsProxy = createProxyMiddleware('/ws/', {
 target: 'http://api-gateway:3002',
 changeOrigin: true,
 ws: true,
});


const apiProxy = createProxyMiddleware('/api/v1/', {
 target: "http://api-gateway:3002",
 changeOrigin: true,
 xfwd: true,
 onProxyReq: (proxyReq, req, res) => {
   proxyReq.setHeader("X-Forwarded-For", req.ip);
   proxyReq.setHeader("X-Real-IP", req.ip);
   proxyReq.setHeader("X-Forwarded-Proto", req.protocol);
   proxyReq.setHeader("Surrogate-Control", "no-store");
   proxyReq.setHeader(
     "Cache-Control",
     "no-store, no-cache, must-revalidate, proxy-revalidate"
   );
   proxyReq.setHeader("Pragma", "no-cache");
   proxyReq.setHeader("Expires", "0");
 },
 timeout: 1200000,
 limit: "1024mb",
 proxyTimeout: 1200000,
 followRedirects: true,
 onProxyRes: (proxyRes, req, res) => {
   res.removeHeader("Surrogate-Control");
   res.removeHeader("Cache-Control");
   res.removeHeader("Pragma");
   res.removeHeader("Expires");
 },
});


const mrvSenderProxy = createProxyMiddleware('/mrv-sender', {
 target: 'http://mrv-sender:3005/',
 changeOrigin: true,
 xfwd: true,
 onProxyReq: (proxyReq, req, res) => {
   proxyReq.setHeader('X-Forwarded-For', req.ip);
 },
 onProxyRes: (proxyRes, req, res) => {
   proxyRes.headers['X-Proxy-By'] = 'node-http-proxy';
 },
 logLevel: 'debug',
});


const topicViewerProxy = createProxyMiddleware('/topic-viewer', {
   target: 'http://topic-viewer:3006',
   changeOrigin: true,
   xfwd: true,
   onProxyReq: (proxyReq, req, res) => {
     proxyReq.setHeader('X-Forwarded-For', req.ip);
   },
   onProxyRes: (proxyRes, req, res) => {
     proxyRes.headers['X-Proxy-By'] = 'node-http-proxy';
   },
   logLevel: 'debug',
});


const apiDocsProxy = createProxyMiddleware('/api-docs/v1', {
 target: 'http://api-docs:3001',
 changeOrigin: true,
 xfwd: true,
 onProxyReq: (proxyReq, req, res) => {
   proxyReq.setHeader('X-Forwarded-For', req.ip);
 },
 onProxyRes: (proxyRes, req, res) => {
   proxyRes.headers['X-Proxy-By'] = 'node-http-proxy';
 },
 logLevel: 'debug',
});



const mongoAdminProxy = createProxyMiddleware('/mongo-admin', {
 target: 'http://mongo-express:8081',
 changeOrigin: true,
 xfwd: true,
 onProxyReq: (proxyReq, req, res) => {
   proxyReq.setHeader('X-Forwarded-For', req.ip);
 },
 onProxyRes: (proxyRes, req, res) => {
   proxyRes.headers['X-Proxy-By'] = 'node-http-proxy';
 },
 logLevel: 'debug',
});


app.use(wsProxy);
app.use(apiProxy);
app.use(mrvSenderProxy);
app.use(topicViewerProxy);
app.use(apiDocsProxy);
app.use(mongoAdminProxy);


app.use('/', express.static('public'));


const port = process.env.PORT || 3000;
app.listen(port, () => {
 console.log(`Server is running on port ${port}`);
});

```

After that, we can apply a bunch of improvements such us middlewares or even packages to increase the security. In this case some packages are recommended:

**Helmet**: Helmet is a middleware package that adds various HTTP headers to your responses to increase security. These headers can help to protect against various attacks, such as cross-site scripting (XSS), clickjacking, and cross-site request forgery (CSRF).

**Express-rate-limit**: This package can be used to limit the rate at which clients can make requests to your server. This can help to prevent brute-force attacks and other types of attacks that rely on making a large number of requests in a short period of time.

**csurf**: This package provides CSRF protection by adding a CSRF token to forms and requests made to your server. This token is verified on the server-side to ensure that requests are coming from legitimate sources.

**Node.js crypto module**: This built-in Node.js module provides cryptographic functionality, such as hashing, encryption, and decryption. It can be used to secure data and protect against various types of attacks, such as data tampering and eavesdropping.

## 3. Dead letter/Retries

\
For some kinds of events due to their own criticality, it would be interesting to contain a recovery or a mechanism to rerun specific payloads, such as dead-letter resources to handle unsubscribed events or even to handle subscriptions that could not run properly. Many applications contain this kind of solution such us Google Pub/Sub, AWS SQS, and so on.

Recently we face a situation that leads some events in NATS to cause the TIMEOUT. In this situation, if we were in Production, we won’t be able to trigger these events again and all the messages would be lost.

The main idea of this topic would be to provide a strategy to manage and/or circumvent the situation. But after a lot of research, NATS has some benefits but for the blockchain context, it seems not to be the best approach. The suggestion to be prepared for all these upsetting events would be to migrate the current Message Broker. After some analyses, Kafka would fit better due to the fact that it contains more features that would enhance the whole ecosystem of the Guardian application.

Migrating a message broker built on NATS to Kafka may be necessary for specific use cases where NATS' capabilities are insufficient. Kafka offers additional features such as message durability, fault tolerance, and scalability that may be critical for certain applications.

If your application requires high throughput and real-time processing of streaming data, Kafka's distributed streaming platform and its ability to handle millions of messages per second make it a strong candidate. Additionally, Kafka's built-in partitioning and replication features provide high availability and fault tolerance, ensuring that messages are not lost even in the case of node failures.

Furthermore, Kafka's support for message ordering within a partition and its ability to store messages on disk make it well-suited for use cases where message durability is critical, such as in a blockchain application.

However, it's important to note that migrating to Kafka may require additional development effort and expertise, as Kafka has a steeper learning curve and is a more complex system compared to NATS. Therefore, the decision to migrate should be made after carefully evaluating your specific requirements and use case.

| Features     | NATS                                                        | Kafka                                                                    |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Architecture | Distributed publish/subscribe messaging system              | Distributed streaming platform                                           |
| Focus        | Lightweight, high-performance messaging                     | Real-time data streaming, messaging, and processing                      |
| Scalability  | Can scale horizontally and support thousands of subscribers | Built for horizontal scaling, can handle millions of messages per second |
| Durability   | Does not provide message durability                         | Provides durability through retention of messages                        |
| Ordering     | Does not guarantee message ordering                         | Guarantees message ordering within a partition                           |
| Complexity   | Simple and easy to use                                      | Relatively complex, requires some learning curve                         |
| Community    | Growing community, but smaller than Kafka                   | Large and active community                                               |
| Use cases    | Ideal for high-performance, low-latency messaging scenarios | Ideal for real-time data processing, streaming, and messaging scenarios  |

Now, about migrating to Kafka for a blockchain application where data loss is critical, there are a few factors to consider.

Firstly, blockchain applications typically require a high level of data integrity and durability, as the data stored on the blockchain is immutable and cannot be changed once it is added. This means that any loss of data could have serious consequences, so it is important to choose a messaging system that can provide the necessary level of durability.

While NATS is a high-performance messaging system, it does not provide message durability by default. This means that if a message is lost, it cannot be recovered, which could be problematic for a blockchain application where data loss is critical.

On the other hand, Kafka is designed to provide durability through the retention of messages. It stores messages on disk, and can be configured to replicate messages across multiple brokers to ensure that they are not lost. This makes Kafka a better choice for a blockchain application where data loss is critical.

That being said, it is important to note that Kafka is a more complex system than NATS, and requires some learning curve to get started with. Additionally, Kafka may not be necessary for all blockchain applications, depending on the specific use case and requirements. Therefore, it is important to carefully evaluate your needs and choose the messaging system that best fits your requirements.

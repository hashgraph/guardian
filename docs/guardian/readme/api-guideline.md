# ⚙ API Guideline

We have changed the code avoiding the generalization of the validation status code and any error status code. Instead of 500, we added a specific status code that depends on the situation. Below we provide more information:

### **1xx Informational**

#### **100 Continue:**&#x20;

The server has received the request headers and the client should proceed to send the request body.

#### **101 Switching Protocols:**&#x20;

The server understands and is willing to comply with the client's request, via the Upgrade message header field, for a change in the application protocol being used on this connection.

### **2xx Success**

#### **200 OK:**&#x20;

The request was successful and the server has returned the requested data.

#### **201 Created:**&#x20;

The request was successful and the server has created a new resource based on the request data.

#### **204 No Content:**&#x20;

The request was successful but there is no data to return.

### **3xx Redirection**

#### **301 Moved Permanently:**&#x20;

The requested resource has been moved permanently to a new location.

#### **302 Found:**&#x20;

The requested resource can be found at a different location temporarily.

#### **304 Not Modified:**&#x20;

The requested resource has not been modified since the last time it was accessed.

### **4xx Client Error**

#### **400 Bad Request:**&#x20;

The request was invalid or could not be understood by the server.

#### **401 Unauthorized:**&#x20;

The request requires user authentication.

#### **403 Forbidden:**&#x20;

The request is valid but the server refuses to respond due to lack of permission.

#### **404 Not Found:**&#x20;

The requested resource could not be found on the server.

#### **422 Unprocessable Entity:**&#x20;

The request was well-formed, but the server could not process it because it contains invalid data.

### **5xx Server Error**

#### **500 Internal Server Error:**&#x20;

The server encountered an unexpected condition that prevented it from fulfilling the request.

#### **502 Bad Gateway:**&#x20;

The server received an invalid response from an upstream server while trying to fulfill the request.

#### **503 Service Unavailable:**&#x20;

The server is currently unable to handle the request due to a temporary overload or maintenance.

#### The most prominent changes are described below&#x20;

For validation errors, the **422 unprocessable Entity status** code is commonly used, which indicates that the request was well-formed, but contains invalid data. This could include missing or invalid parameters, incorrect data types, or other issues with the data in the request. A JSON payload could be returned with more details about the validation error.

For success with empty data, the 204 No Content status code can be used, indicating that the request was successful, but there is no data to return. This can be useful in cases where the client is performing a DELETE or PUT request, where the server doesn't need to return any additional data.

The **HTTP 202 Accepted status code** indicates that the request has been accepted but has not yet been processed. This status code is often used in APIs to indicate that the server needs more time to process the request or that the request has been queued for processing.

For example, in the context of the Guardian API ([https://github.com/hashgraph/guardian](https://github.com/hashgraph/guardian)), the 202 status code could be used when submitting a new transaction or request to the network. The API could immediately return a 202 response indicating that the request has been received and is being processed, and include a link or other information that the client can use to check the status of the request later.

### Naming Conventions for RESTful APIs

RESTful APIs are designed around resources, and using consistent naming conventions for resources, HTTP verbs, and query parameters can make your API easier to understand and use. Here are some guidelines for naming conventions in a RESTful API:

#### **Resources**

Use nouns to represent resources in your API. For example, if you are building an API for managing products, you might use the endpoint /products to represent the collection of all products.

#### **Collection Resources**

Use plural nouns for collection resources. For example, you might use /products to represent a collection of products.

#### **Individual Resources**

Use singular nouns for individual resources. For example, you might use /products/{productId} to represent a specific product.

#### **Hyphenated Names**

Use hyphens to separate words in resource names. For example, you might use /user-profiles to represent a collection of user profiles.

#### **HTTP Verbs**

Use HTTP verbs to represent actions on resources. Here are some common HTTP verbs and their actions:

**GET:**&#x20;

Retrieve a resource or a collection of resources.

**POST:**&#x20;

Create a new resource.

**PUT:**&#x20;

Update an existing resource.

**DELETE:**&#x20;

Delete a resource.

For example, you might use GET /products to retrieve a list of products, and POST /products to create a new product.

#### Query Parameters

Use query parameters to filter, sort, or paginate resources.&#x20;

Here are some guidelines for naming query parameters:

1. Use camelCase or snake\_case for query parameter names.
2. Be consistent within your API in the use of query parameter names.
3. Use standard parameter names such as sort\_by, page, or limit whenever possible.

For example, you might use /products?sort\_by=name or /products?sortBy=name to sort products by name.

By following these naming conventions, you can create a consistent and easy-to-use API that will be intuitive for developers to use and understand.\
\
For a complete documentation of name conventions you can follow the recommendations described in this website: [https://restfulapi.net/resource-naming/](https://restfulapi.net/resource-naming/)

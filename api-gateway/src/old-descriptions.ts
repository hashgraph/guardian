/* tslint:disable */
export const SwaggerPaths = {
    '/schemas': {
        'get': {
            'tags': [
                'schemas'
            ],
            'description': 'Returns all schemas.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all schemas.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schema/{schemaId}': {
        'get': {
            'tags': [
                'schema'
            ],
            'description': 'Returns schema by schema ID.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns schema by schema ID.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Schema'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{topicId}': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Creates new schema. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Create new schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'get': {
            'tags': [
                'schemas'
            ],
            'description': 'Returns all schemas by topicId.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all schemas by topicId.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/push/{topicId}': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Creates new schema. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Create new schema.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{schemaId}/publish': {
        'put': {
            'tags': [
                'schemas'
            ],
            'description': 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Publishes the schema.',
            'requestBody': {
                'description': 'Object that contains policy version.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'version': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/push/{schemaId}/publish': {
        'put': {
            'tags': [
                'schemas'
            ],
            'description': 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'requestBody': {
                'description': 'Object that contains policy version.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'version': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{schemaId}': {
        'put': {
            'tags': [
                'schemas'
            ],
            'description': 'Updates the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Updates the schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'delete': {
            'tags': [
                'schemas'
            ],
            'description': 'Deletes the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Deletes the schema.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{topicId}/import/file': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Imports new schema from a zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new schema from a zip file.',
            'requestBody': {
                'description': 'A zip file containing schema to be imported.',
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                },
                'required': true
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/push/{topicId}/import/file': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Imports new schema from a zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new schema from a zip file.',
            'requestBody': {
                'description': 'A zip file containing schema to be imported.',
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                },
                'required': true
            },
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{topicId}/import/message': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Imports new schema from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new schema from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/push/{topicId}/import/message': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Imports new schema from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new schema from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'parameters': [
                {
                    'in': 'path',
                    'name': 'topicId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Topic ID.',
                    'examples': {
                        'topicId': {
                            'summary': 'Example of a Topic ID',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/import/message/preview': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Previews the schema from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Schema preview from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/push/import/message/preview': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Previews the schema from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Schema preview from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/import/file/preview': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Previews the schema from a zip file. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Schema preview from a zip file.',
            'requestBody': {
                'description': 'A zip file containing the schema to be viewed.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{schemaId}/export/message': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Returns Hedera message IDs of the published schemas, these messages contain IPFS CIDs of these schema files. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'List Hedera message IDs of published schemas.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected schema ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ExportSchema'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/{schemaId}/export/file': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Returns schema files for the schemas. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return zip file with schemas.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected schema ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation. Response zip file'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/type/{type}': {
        'get': {
            'tags': [
                'schemas'
            ],
            'description': 'Finds the schema using the json document type.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'type',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'JSON type.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns schema by type.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Schema'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/system/{username}': {
        'post': {
            'tags': [
                'schemas'
            ],
            'description': 'Creates new system schema. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates new system schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'get': {
            'tags': [
                'schemas'
            ],
            'description': 'Returns all system schemas by username. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all system schemas by username.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                },
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set.',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex.',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of items to return.',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize.',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total number of items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/system/{schemaId}': {
        'put': {
            'tags': [
                'schemas'
            ],
            'description': 'Updates the system schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Updates the schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'delete': {
            'tags': [
                'schemas'
            ],
            'description': 'Deletes the system schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Deletes the schema.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/system/{schemaId}/active': {
        'put': {
            'tags': [
                'schemas'
            ],
            'description': 'Makes the selected scheme active. Other schemes of the same type become inactive. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Publishes the schema.',
            'requestBody': {
                'description': 'Object that contains policy version.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'version': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/schemas/system/entity/{schemaEntity}': {
        'get': {
            'tags': [
                'schemas'
            ],
            'description': 'Finds the schema using the schema type.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaEntity',
                    'schema': {
                        'type': 'string',
                        'enum': [
                            'STANDARD_REGISTRY',
                            'USER',
                            'POLICY',
                            'MINT_TOKEN',
                            'WIPE_TOKEN',
                            'MINT_NFTOKEN'
                        ]
                    },
                    'required': true,
                    'description': 'schema type.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns schema by schema type.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Schema'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens': {
        'get': {
            'tags': [
                'tokens'
            ],
            'description': 'Returns all tokens. For the Standard Registry role it returns only the list of tokens, for other users it also returns token balances as well as the KYC, Freeze, and Association statuses. Not allowed for the Auditor role.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of tokens.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'allOf': [
                                        {
                                            '$ref': '#/components/schemas/TokenInfo'
                                        },
                                        {
                                            'type': 'object',
                                            'properties': {
                                                'policies': {
                                                    'type': 'array',
                                                    'items': {
                                                        'type': 'string'
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'tokens'
            ],
            'description': 'Creates a new token. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new token.',
            'requestBody': {
                'description': 'Object that contains token information.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Token'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'allOf': [
                                        {
                                            '$ref': '#/components/schemas/TokenInfo'
                                        },
                                        {
                                            'type': 'object',
                                            'properties': {
                                                'policies': {
                                                    'type': 'array',
                                                    'items': {
                                                        'type': 'string'
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push': {
        'post': {
            'tags': [
                'tokens'
            ],
            'description': 'Creates a new token. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new token.',
            'requestBody': {
                'description': 'Object that contains token information.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Token'
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/{username}/info': {
        'get': {
            'tags': [
                'tokens'
            ],
            'description': 'Returns user information for the selected token. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TokenInfo'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/associate': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Associates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Associates the user with the provided Hedera token.',
            'responses': {
                '200': {
                    'description': 'Successful operation.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/associate': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Associates the user with the provided Hedera token. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Associates the user with the provided Hedera token.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/dissociate': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Disassociates the user with the provided Hedera token. Only users with the Installer role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Associate the user with the provided Hedera token.',
            'responses': {
                '202': {
                    'description': 'Successful operation.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/dissociate': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Disassociates the user with the provided Hedera token. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Disassociates the user with the provided Hedera token.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/{username}/grant-kyc': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Sets the KYC flag for the user. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Sets the KYC flag for the user.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TokenInfo'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/{username}/grant-kyc': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Sets the KYC flag for the user. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Sets the KYC flag for the user.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/{username}/revoke-kyc': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Unsets the KYC flag for the user. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Unsets the KYC flag for the user.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TokenInfo'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/{username}/revoke-kyc': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Unsets the KYC flag for the user. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Unsets the KYC flag for the user.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/{username}/freeze': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Freezes transfers of the specified token for the user. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Freeze transfers of the specified token for the user.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TokenInfo'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/{username}/freeze': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Freezes transfers of the specified token for the user. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Freeze transfers of the specified token for the user.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/{tokenId}/{username}/unfreeze': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Unfreezes transfers of the specified token for the user. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Unfreezes transfers of the specified token for the user.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TokenInfo'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tokens/push/{tokenId}/{username}/unfreeze': {
        'put': {
            'tags': [
                'tokens'
            ],
            'description': 'Unfreezes transfers of the specified token for the user. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Unfreezes transfers of the specified token for the user.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'tokenId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Token ID.'
                },
                {
                    'in': 'path',
                    'name': 'username',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Username.'
                }
            ],
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/trust-chains': {
        'get': {
            'tags': [
                'trustchains'
            ],
            'description': 'Requests all VP documents. Only users with the Auditor role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns a list of all VP documents.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'Selected policy ID.'
                },
                {
                    'in': 'query',
                    'name': 'policyOwner',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'Selected Standard Registry (DID).'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/VerifiablePresentation'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/trust-chains/{hash}': {
        'get': {
            'tags': [
                'trustchains'
            ],
            'description': 'Builds and returns a trustchain, from the VP to the root VC document. Only users with the Auditor role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'hash',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Hash or ID of a VP document.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns a trustchain for a VP document.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TrustChains'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns all policies. Only users with the Standard Registry and Installer role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of all policies.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'allOf': [
                                        {
                                            '$ref': '#/components/schemas/PolicyConfig'
                                        },
                                        {
                                            'type': 'object',
                                            'properties': {
                                                'userRoles': {
                                                    'type': 'array',
                                                    'items': {
                                                        'type': 'string'
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Creates a new policy. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new policy.',
            'requestBody': {
                'description': 'Object that contains policy configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/PolicyConfig'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/push': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Creates a new policy. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new policy.',
            'requestBody': {
                'description': 'Object that contains policy configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/PolicyConfig'
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Retrieves policy configuration for the specified policy ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'summary': 'Retrieves policy configuration.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'allOf': [
                                    {
                                        '$ref': '#/components/schemas/PolicyConfig'
                                    },
                                    {
                                        'type': 'object',
                                        'properties': {
                                            'userRoles': {
                                                'type': 'array',
                                                'items': {
                                                    'type': 'string'
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'tags': [
                'policies'
            ],
            'description': 'Updates policy configuration for the specified policy ID. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Updates policy configuration.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'description': 'Selected policy ID.',
                    'required': true,
                    'schema': {
                        'type': 'string'
                    }
                }
            ],
            'requestBody': {
                'description': 'Object that contains policy configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/PolicyConfig'
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PolicyConfig'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/publish': {
        'put': {
            'tags': [
                'policies'
            ],
            'description': 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'requestBody': {
                'description': 'Object that contains policy version.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'policyVersion': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'summary': 'Publishes the policy onto IPFS.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PublishPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/push/{policyId}/publish': {
        'put': {
            'tags': [
                'policies'
            ],
            'description': 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Publishes the policy with the specified (internal) policy ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'requestBody': {
                'description': 'Object that contains policy version.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'policyVersion': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/validate': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Validates selected policy. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Validates policy.',
            'requestBody': {
                'description': 'Object that contains policy configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/PolicyConfig'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ValidatePolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/groups': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns a list of groups the user is a member of.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'summary': 'Returns a list of groups the user is a member of.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'id': {
                                            'type': 'string'
                                        },
                                        'uuid': {
                                            'type': 'string'
                                        },
                                        'role': {
                                            'type': 'string'
                                        },
                                        'groupLabel': {
                                            'type': 'string'
                                        },
                                        'groupName': {
                                            'type': 'string'
                                        },
                                        'active': {
                                            'type': 'boolean'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Makes the selected group active. if UUID is not set then returns the user to the default state.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'summary': 'Makes the selected group active.',
            'requestBody': {
                'description': 'Selected group.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'uuid': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/blocks': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns data from the root policy block. Only users with the Standard Registry and Installer role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'summary': 'Retrieves data for the policy root block.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PolicyBlock'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/blocks/{uuid}': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Requests block data. Only users with a role that described in block are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                },
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected block UUID.'
                }
            ],
            'summary': 'Requests block data.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PolicyBlockData'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Sends data to the specified block.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                },
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected block UUID.'
                }
            ],
            'summary': 'Sends data to the specified block.',
            'requestBody': {
                'description': 'Object with the data to be sent to the block.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object'
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/tag/{tag}': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Requests block ID from a policy by tag. Only users with the Standard Registry and Installer roles are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                },
                {
                    'in': 'path',
                    'name': 'tag',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Tag from the selected policy.'
                }
            ],
            'summary': 'Requests block ID from a policy by tag.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'id': {
                                        'type': 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/export/message': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns the Hedera message ID for the specified policy published onto IPFS. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return Heder message ID for the specified published policy.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ExportPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/export/file': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns a zip file containing the published policy and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected policy ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return policy and its artifacts in a zip file format for the specified policy.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ExportPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/import/message': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Imports new policy and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'versionOfTopicId',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'The topic ID of policy version.',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a topic ID of policy version.',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new policy from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the Policy.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/PolicyConfig'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/push/import/message': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Imports new policy and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new policy and all associated artifacts from IPFS into the local DB.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the Policy.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/import/file': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'versionOfTopicId',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'The topic ID of policy version.',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a topic ID of policy version.',
                            'value': '0.0.00000001'
                        }
                    }
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new policy from a zip file.',
            'requestBody': {
                'description': 'A zip file that contains the policy and associated schemas and VCs to be imported.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/PolicyConfig'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/push/import/file': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new policy and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB.',
            'requestBody': {
                'description': 'A zip file that contains the policy and associated schemas and VCs to be imported.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/import/message/preview': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Previews the policy from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Policy preview from IPFS.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the policy.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PreviewPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/push/import/message/preview': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Previews the policy from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Previews the policy from IPFS without loading it into the local DB.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the policy.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/import/file/preview': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Previews the policy from a zip file without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Policy preview from a zip file.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'A zip file that contains the policy and associated schemas and VCs to be viewed.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PreviewPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run': {
        'put': {
            'tags': [
                'policies'
            ],
            'description': 'Run policy without making any persistent changes or executing transaction. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Dry Run policy.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PublishPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/draft': {
        'put': {
            'tags': [
                'policies'
            ],
            'description': 'Return policy to editing. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return policy to editing.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PublishPolicy'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/users': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns all virtual users. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all virtual users.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'username': {
                                            'type': 'string'
                                        },
                                        'did': {
                                            'type': 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/user': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Create a new virtual account. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Create a new virtual account.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'username': {
                                            'type': 'string'
                                        },
                                        'did': {
                                            'type': 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/login': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Logs virtual user into the system. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Logs virtual user into the system.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'requestBody': {
                'description': 'Virtual user',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'did': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'username': {
                                            'type': 'string'
                                        },
                                        'did': {
                                            'type': 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/restart': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Restarts the execution of the policy. Clear data in database. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Restarts the execution of the policy.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/transactions': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns lists of virtual transactions. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns lists of virtual transactions.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'createDate': {
                                            'type': 'string'
                                        },
                                        'type': {
                                            'type': 'string'
                                        },
                                        'hederaAccountId': {
                                            'type': 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/artifacts': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns lists of virtual artifacts. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns lists of virtual artifacts.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'createDate': {
                                            'type': 'string'
                                        },
                                        'type': {
                                            'type': 'string'
                                        },
                                        'owner': {
                                            'type': 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/dry-run/ipfs': {
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Returns lists of virtual artifacts. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns lists of virtual artifacts.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'createDate': {
                                            'type': 'string'
                                        },
                                        'documentURL': {
                                            'type': 'string'
                                        },
                                        'document': {
                                            'type': 'object'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/tag/{tag}/blocks': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Sends data to the specified block.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Sends data to the specified block.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                },
                {
                    'in': 'path',
                    'name': 'tag',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Tag from the selected policy.'
                }
            ],
            'requestBody': {
                'description': 'Object with the data to be sent to the block.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PolicyBlockData'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Requests block data by tag. Only users with a role that described in block are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Requests block data.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                },
                {
                    'in': 'path',
                    'name': 'tag',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Tag from the selected policy.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PolicyBlockData'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/policies/{policyId}/multiple': {
        'post': {
            'tags': [
                'policies'
            ],
            'description': 'Creates a link between the current policy and the main policy. Or creates a group making the current policy the main one.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates Multi policy config.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'requestBody': {
                'description': 'Multi policy config.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': [
                                'mainPolicyTopicId',
                                'synchronizationTopicId'
                            ],
                            'properties': {
                                'mainPolicyTopicId': {
                                    'type': 'string'
                                },
                                'synchronizationTopicId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/MultiPolicyConfig'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'get': {
            'tags': [
                'policies'
            ],
            'description': 'Requests Multi policy config.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Requests Multi policy config.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/MultiPolicyConfig'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/external': {
        'post': {
            'tags': [
                'external'
            ],
            'description': 'Sends data from an external source.',
            'summary': 'Sends data from an external source.',
            'requestBody': {
                'description': 'Object that contains a VC Document.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/ExternalData'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/demo/random-key': {
        'get': {
            'tags': [
                'demo'
            ],
            'description': 'Generates a new Hedera account with a random private key.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/HederaAccount'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/demo/push/random-key': {
        'get': {
            'tags': [
                'demo'
            ],
            'description': 'Generates a new Hedera account with a random private key.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Generates a new Hedera account with a random private key.',
            'responses': {
                '202': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Task'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/ipfs/file/{cid}': {
        'get': {
            'tags': [
                'ipfs'
            ],
            'description': 'Get file from ipfs.',
            'summary': 'Get file from ipfs.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'cid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'File CID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'binary/octet-stream': {
                            'schema': {
                                'type': 'string',
                                'format': 'binary'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/ipfs/file/': {
        'post': {
            'tags': [
                'ipfs'
            ],
            'description': 'Add file to ipfs.',
            'summary': 'Add file to ipfs.',
            'requestBody': {
                'description': 'Data array of file.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'description': 'CID of added file.',
                                'type': 'string'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/settings': {
        'get': {
            'tags': [
                'settings'
            ],
            'description': 'Returns current settings. For users with the Standard Registry role only.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns current settings.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/CommonSettings'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'settings'
            ],
            'description': 'Set settings. For users with the Standard Registry role only.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Set settings.',
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/CommonSettings'
                            }
                        }
                    }
                }
            }
        }
    },
    '/settings/environment': {
        'get': {
            'tags': [
                'settings'
            ],
            'description': 'Returns current environment name.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns current environment name.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'text/plain': {
                            'schema': {
                                'type': 'string',
                                'example': 'testnet'
                            }
                        }
                    }
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/logs': {
        'post': {
            'tags': [
                'logs'
            ],
            'description': 'Returns logs. For users with the Standard Registry role only.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'Log filters.',
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/LogFilters'
                        }
                    }
                }
            },
            'summary': 'Returns logs.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'totalCount': {
                                        'type': 'number'
                                    },
                                    'logs': {
                                        '$ref': '#/components/schemas/Log'
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/logs/attributes': {
        'get': {
            'tags': [
                'logs'
            ],
            'description': 'Returns logs attributes. For users with the Standard Registry role only.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'name',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'Part of name.'
                },
                {
                    'in': 'query',
                    'name': 'existingAttributes',
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'string'
                        }
                    },
                    'description': 'Attributes to exclude.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns logs attributes.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tasks/{taskId}': {
        'get': {
            'tags': [
                'tasks'
            ],
            'description': 'Returns task statuses by Id.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns task statuses.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'taskId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Task ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TaskStatus'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifacts': {
        'get': {
            'tags': [
                'artifacts'
            ],
            'description': 'Returns all artifacts.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all artifacts.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'Policy identifier'
                },
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Artifact'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifacts/{policyId}': {
        'post': {
            'tags': [
                'artifacts'
            ],
            'description': 'Upload artifact. For users with the Standard Registry role only.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'content': {
                    'multipart/form-data': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'artifacts': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string',
                                        'format': 'binary'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy identifier'
                }
            ],
            'summary': 'Upload Artifact.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Artifact'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifacts/{artifactId}': {
        'delete': {
            'tags': [
                'artifacts'
            ],
            'description': 'Delete artifact.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Delete artifact.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'artifactId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Artifact identifier'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifact': {
        'get': {
            'deprecated': true,
            'tags': [
                'artifacts'
            ],
            'description': 'Returns all artifacts.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all artifacts.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'description': 'Policy identifier'
                },
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Artifact'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifact/{policyId}': {
        'post': {
            'deprecated': true,
            'tags': [
                'artifacts'
            ],
            'description': 'Upload artifact. For users with the Standard Registry role only.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'content': {
                    'multipart/form-data': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'artifacts': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'string',
                                        'format': 'binary'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy identifier'
                }
            ],
            'summary': 'Upload Artifact.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Artifact'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/artifact/{artifactId}': {
        'delete': {
            'deprecated': true,
            'tags': [
                'artifacts'
            ],
            'description': 'Delete artifact.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Delete artifact.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'artifactId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Artifact identifier'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules': {
        'get': {
            'tags': [
                'modules'
            ],
            'description': 'Returns all modules. Only users with the Standard Registry and Installer role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of all modules.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Module'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Creates a new module. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new module.',
            'requestBody': {
                'description': 'Object that contains module configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Module'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/menu': {
        'get': {
            'tags': [
                'modules'
            ],
            'description': 'Returns modules menu. Only users with the Standard Registry and Installer role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of modules.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Module'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/{uuid}': {
        'get': {
            'tags': [
                'modules'
            ],
            'description': 'Retrieves module configuration for the specified module ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected module ID.'
                }
            ],
            'summary': 'Retrieves module configuration.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Module'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'tags': [
                'modules'
            ],
            'description': 'Updates module configuration for the specified module ID. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Updates module configuration.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'description': 'Selected module ID.',
                    'required': true,
                    'schema': {
                        'type': 'string'
                    }
                }
            ],
            'requestBody': {
                'description': 'Object that contains module configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Module'
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Module'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'delete': {
            'tags': [
                'modules'
            ],
            'description': 'Deletes the module with the provided module ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Module ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Deletes the module.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/{uuid}/publish': {
        'put': {
            'tags': [
                'modules'
            ],
            'description': 'Publishes the module with the specified (internal) module ID onto IPFS, sends a message featuring its IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected module ID.'
                }
            ],
            'summary': 'Publishes the module onto IPFS.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PublishModule'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/{uuid}/export/message': {
        'get': {
            'tags': [
                'modules'
            ],
            'description': 'Returns the Hedera message ID for the specified module published onto IPFS. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected module ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return Heder message ID for the specified published module.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ExportModule'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/{uuid}/export/file': {
        'get': {
            'tags': [
                'modules'
            ],
            'description': 'Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected module ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return module and its artifacts in a zip file format for the specified module.',
            'responses': {
                '200': {
                    'description': 'Successful operation. Response zip file'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/import/message': {
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Imports new module and all associated artifacts from IPFS into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new module from IPFS.',
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the module.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Module'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/import/file': {
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Imports new module and all associated artifacts, such as schemas and VCs, from the provided zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new module from a zip file.',
            'requestBody': {
                'description': 'A zip file that contains the module and associated schemas and VCs to be imported.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Module'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/import/message/preview': {
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Previews the module from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Module preview from IPFS.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'Object that contains the identifier of the Hedera message which contains the IPFS CID of the module.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'messageId': {
                                    'type': 'string'
                                }
                            }
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PreviewModule'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/import/file/preview': {
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Previews the module from a zip file without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.',
            'summary': 'Module preview from a zip file.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'A zip file that contains the module and associated schemas and VCs to be viewed.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/PreviewModule'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/modules/validate': {
        'post': {
            'tags': [
                'modules'
            ],
            'description': 'Validates selected module. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Validates module.',
            'requestBody': {
                'description': 'Object that contains module configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Module'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/ValidateModule'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/map/key': {
        'get': {
            'tags': [
                'maps'
            ],
            'description': 'Returns map api key.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns map api key.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'string'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/': {
        'post': {
            'tags': [
                'tags'
            ],
            'description': 'Creates new tag.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates new tag.',
            'requestBody': {
                'description': 'Object that contains tag information.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Tag'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Tag'
                            }
                        }
                    }
                },
                '400': {
                    'description': 'Bad Request.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/search': {
        'post': {
            'tags': [
                'tags'
            ],
            'description': 'Search tags.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'Object that contains filters.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'oneOf': [
                                {
                                    'type': 'object',
                                    'required': [
                                        'entity',
                                        'target'
                                    ],
                                    'properties': {
                                        'entity': {
                                            'type': 'string',
                                            'enum': [
                                                'Schema',
                                                'Policy',
                                                'Token',
                                                'Module',
                                                'Contract',
                                                'PolicyDocument'
                                            ]
                                        },
                                        'target': {
                                            'type': 'string'
                                        }
                                    }
                                },
                                {
                                    'type': 'object',
                                    'required': [
                                        'entity',
                                        'targets'
                                    ],
                                    'properties': {
                                        'entity': {
                                            'type': 'string',
                                            'enum': [
                                                'Schema',
                                                'Policy',
                                                'Token',
                                                'Module',
                                                'Contract',
                                                'PolicyDocument'
                                            ]
                                        },
                                        'targets': {
                                            'type': 'array',
                                            'items': {
                                                'type': 'string'
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        'examples': {
                            'Single': {
                                'value': {
                                    'entity': 'PolicyDocument',
                                    'target': 'targetId1'
                                }
                            },
                            'Multiple': {
                                'value': {
                                    'entity': 'PolicyDocument',
                                    'targets': [
                                        'targetId1',
                                        'targetId2'
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            'summary': 'Search tags.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'description': 'a (targetId, Tags) map. `targetId1` is an example key',
                                'properties': {
                                    'targetId1': {
                                        '$ref': '#/components/schemas/TagMap'
                                    }
                                },
                                'additionalProperties': {
                                    '$ref': '#/components/schemas/TagMap'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/{uuid}': {
        'delete': {
            'tags': [
                'tags'
            ],
            'description': 'Delete tag.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Delete tag.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'uuid',
                    'schema': {
                        'type': 'string',
                        'example': '00000000-0000-0000-0000-000000000000'
                    },
                    'required': true,
                    'description': 'Tag identifier'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/synchronization': {
        'post': {
            'tags': [
                'tags'
            ],
            'description': 'synchronization.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'requestBody': {
                'description': 'Object that contains filters.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'required': [
                                'entity',
                                'target'
                            ],
                            'properties': {
                                'entity': {
                                    'type': 'string',
                                    'enum': [
                                        'Schema',
                                        'Policy',
                                        'Token',
                                        'Module',
                                        'Contract',
                                        'PolicyDocument'
                                    ],
                                    'example': 'PolicyDocument'
                                },
                                'target': {
                                    'type': 'string',
                                    'example': 'targetId'
                                }
                            }
                        }
                    }
                }
            },
            'summary': 'synchronization.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/TagMap'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/schemas': {
        'get': {
            'tags': [
                'tags'
            ],
            'description': 'Returns all schema.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns all schemas.',
            'parameters': [
                {
                    'in': 'query',
                    'name': 'pageIndex',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The number of pages to skip before starting to collect the result set',
                    'examples': {
                        'pageIndex': {
                            'summary': 'Example of a pageIndex',
                            'value': 0
                        }
                    }
                },
                {
                    'in': 'query',
                    'name': 'pageSize',
                    'schema': {
                        'type': 'integer'
                    },
                    'description': 'The numbers of items to return',
                    'examples': {
                        'pageSize': {
                            'summary': 'Example of a pageSize',
                            'value': 100
                        }
                    }
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'headers': {
                        'x-total-count': {
                            'schema': {
                                'type': 'integer'
                            },
                            'description': 'Total items in the collection.'
                        }
                    },
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'tags'
            ],
            'description': 'Creates new schema. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates new schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Schema'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/schemas/{schemaId}': {
        'delete': {
            'tags': [
                'tags'
            ],
            'description': 'Deletes the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Delete the schema.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'put': {
            'tags': [
                'tags'
            ],
            'description': 'Updates the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Updates the schema.',
            'requestBody': {
                'description': 'Object that contains a valid schema.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Schema'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/schemas/{schemaId}/publish': {
        'put': {
            'tags': [
                'tags'
            ],
            'description': 'Publishes the schema with the provided (internal) schema ID onto IPFS, sends a message featuring IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'schemaId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Schema ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Publishes the schema.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/tags/schemas/published': {
        'get': {
            'tags': [
                'tags'
            ],
            'description': 'Return a list of all published schemas.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of all published schemas.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Schema'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/themes': {
        'get': {
            'tags': [
                'themes'
            ],
            'description': 'Returns all themes.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Return a list of all themes.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'array',
                                'items': {
                                    '$ref': '#/components/schemas/Theme'
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'post': {
            'tags': [
                'themes'
            ],
            'description': 'Creates a new theme.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new theme.',
            'requestBody': {
                'description': 'Object that contains theme configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Theme'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/themes/{themeId}': {
        'put': {
            'tags': [
                'themes'
            ],
            'description': 'Updates theme configuration for the specified theme ID.',
            'summary': 'Updates theme configuration.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'themeId',
                    'description': 'Selected theme ID.',
                    'required': true,
                    'schema': {
                        'type': 'string'
                    }
                }
            ],
            'requestBody': {
                'description': 'Object that contains theme configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/Theme'
                        }
                    }
                }
            },
            'security': [
                {
                    'bearer': []
                }
            ],
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Theme'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        },
        'delete': {
            'tags': [
                'themes'
            ],
            'description': 'Deletes the theme with the provided theme ID.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'themeId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Theme ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Deletes the theme.',
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'boolean'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/themes/{themeId}/export/file': {
        'get': {
            'tags': [
                'themes'
            ],
            'description': 'Returns a zip file containing the theme.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'themeId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Selected theme ID.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Returns a zip file containing the theme.',
            'responses': {
                '200': {
                    'description': 'Successful operation. Response zip file'
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/themes/import/file': {
        'post': {
            'tags': [
                'themes'
            ],
            'description': 'Imports new theme from the provided zip file into the local DB.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Imports new theme from a zip file.',
            'requestBody': {
                'description': 'A zip file that contains the theme to be imported.',
                'required': true,
                'content': {
                    'binary/octet-stream': {
                        'schema': {
                            'type': 'string',
                            'format': 'binary'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Created.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Theme'
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/wizard/policy': {
        'post': {
            'tags': [
                'wizard'
            ],
            'description': 'Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request.',
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Creates a new policy.',
            'requestBody': {
                'description': 'Object that contains wizard configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/WizardConfig'
                        }
                    }
                }
            },
            'responses': {
                '201': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'policyId': {
                                        'type': 'string'
                                    },
                                    'wizardConfig': {
                                        '$ref': '#/components/schemas/WizardConfig'
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    '/wizard/{policyId}/config': {
        'post': {
            'tags': [
                'wizard'
            ],
            'description': 'Get policy config by wizard. Only users with the Standard Registry role are allowed to make the request.',
            'parameters': [
                {
                    'in': 'path',
                    'name': 'policyId',
                    'schema': {
                        'type': 'string'
                    },
                    'required': true,
                    'description': 'Policy identifier.'
                }
            ],
            'security': [
                {
                    'bearer': []
                }
            ],
            'summary': 'Get policy config.',
            'requestBody': {
                'description': 'Object that contains wizard configuration.',
                'required': true,
                'content': {
                    'application/json': {
                        'schema': {
                            '$ref': '#/components/schemas/WizardConfig'
                        }
                    }
                }
            },
            'responses': {
                '200': {
                    'description': 'Successful operation.',
                    'content': {
                        'application/json': {
                            'schema': {
                                'type': 'object',
                                'properties': {
                                    'policyConfig': {
                                        '$ref': '#/components/schemas/PolicyConfig'
                                    },
                                    'wizardConfig': {
                                        '$ref': '#/components/schemas/WizardConfig'
                                    }
                                }
                            }
                        }
                    }
                },
                '401': {
                    'description': 'Unauthorized.'
                },
                '403': {
                    'description': 'Forbidden.'
                },
                '500': {
                    'description': 'Internal server error.',
                    'content': {
                        'application/json': {
                            'schema': {
                                '$ref': '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    }
}

/* tslint:disable */
export const SwaggerModels = {
    'schemas': {
        'Credentials': {
            'type': 'object',
            'required': [
                'username',
                'password'
            ],
            'properties': {
                'username': {
                    'type': 'string'
                },
                'password': {
                    'type': 'string'
                }
            }
        },
        'Account': {
            'type': 'object',
            'required': [
                'username',
                'role'
            ],
            'properties': {
                'username': {
                    'type': 'string'
                },
                'role': {
                    'type': 'string'
                },
                'did': {
                    'type': 'string'
                }
            }
        },
        'Session': {
            'type': 'object',
            'required': [
                'username',
                'role',
                'accessToken'
            ],
            'properties': {
                'username': {
                    'type': 'string'
                },
                'role': {
                    'type': 'string'
                },
                'accessToken': {
                    'type': 'string'
                }
            }
        },
        'User': {
            'type': 'object',
            'required': [
                'username',
                'role'
            ],
            'properties': {
                'confirmed': {
                    'type': 'string'
                },
                'failed': {
                    'type': 'string'
                },
                'username': {
                    'type': 'string'
                },
                'role': {
                    'type': 'string'
                },
                'hederaAccountId': {
                    'type': 'string'
                },
                'hederaAccountKey': {
                    'type': 'string'
                },
                'did': {
                    'type': 'string'
                },
                'didDocument': {
                    'type': 'object'
                },
                'vcDocument': {
                    'type': 'object'
                },
                'parent': {
                    'type': 'string'
                },
                'topicId': {
                    'type': 'string'
                }
            }
        },
        'Schema': {
            'type': 'object',
            'required': [
                'id',
                'name',
                'description',
                'entity',
                'document'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'iri': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'entity': {
                    'type': 'string'
                },
                'hash': {
                    'type': 'string'
                },
                'status': {
                    'type': 'string'
                },
                'document': {
                    'oneOf': [
                        {
                            'type': 'string'
                        },
                        {
                            'type': 'object'
                        }
                    ]
                },
                'topicId': {
                    'type': 'string'
                },
                'version': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'messageId': {
                    'type': 'string'
                }
            }
        },
        'ImportSchema': {
            'type': 'object',
            'required': [
                'schemes'
            ],
            'properties': {
                'schemes': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': [
                            'document',
                            'entity',
                            'name',
                            'uuid'
                        ],
                        'properties': {
                            'document': {
                                'type': 'string'
                            },
                            'entity': {
                                'type': 'string'
                            },
                            'hash': {
                                'type': 'string'
                            },
                            'name': {
                                'type': 'string'
                            },
                            'uuid': {
                                'type': 'string'
                            }
                        }
                    }
                }
            }
        },
        'ExportSchema': {
            'type': 'object',
            'required': [
                'ids'
            ],
            'properties': {
                'name': {
                    'type': 'string'
                },
                'version': {
                    'type': 'string'
                },
                'messageId': {
                    'type': 'string'
                }
            }
        },
        'Token': {
            'type': 'object',
            'required': [
                'changeSupply',
                'decimals',
                'enableAdmin',
                'enableKYC',
                'enableFreeze',
                'enableWipe',
                'initialSupply',
                'tokenName',
                'tokenSymbol',
                'tokenType'
            ],
            'properties': {
                'changeSupply': {
                    'type': 'boolean'
                },
                'decimals': {
                    'type': 'string'
                },
                'enableAdmin': {
                    'type': 'boolean'
                },
                'enableFreeze': {
                    'type': 'boolean'
                },
                'enableKYC': {
                    'type': 'boolean'
                },
                'enableWipe': {
                    'type': 'boolean'
                },
                'initialSupply': {
                    'type': 'string'
                },
                'tokenName': {
                    'type': 'string'
                },
                'tokenSymbol': {
                    'type': 'string'
                },
                'tokenType': {
                    'type': 'string'
                }
            }
        },
        'TokenInfo': {
            'type': 'object',
            'required': [
                'id',
                'tokenId',
                'tokenName',
                'tokenSymbol',
                'tokenType',
                'decimals',
                'associated',
                'balance',
                'frozen',
                'kyc'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'tokenId': {
                    'type': 'string'
                },
                'tokenName': {
                    'type': 'string'
                },
                'tokenSymbol': {
                    'type': 'string'
                },
                'tokenType': {
                    'type': 'string'
                },
                'decimals': {
                    'type': 'string'
                },
                'associated': {
                    'type': 'boolean'
                },
                'balance': {
                    'type': 'string'
                },
                'frozen': {
                    'type': 'boolean'
                },
                'kyc': {
                    'type': 'boolean'
                },
                'enableAdmin': {
                    'type': 'boolean'
                },
                'enableKYC': {
                    'type': 'boolean'
                },
                'enableFreeze': {
                    'type': 'boolean'
                },
                'enableWipe': {
                    'type': 'boolean'
                }
            }
        },
        'PolicyConfig': {
            'type': 'object',
            'required': [
                'name',
                'version',
                'description',
                'topicDescription',
                'config',
                'topicId',
                'policyTag'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'version': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'topicDescription': {
                    'type': 'string'
                },
                'config': {
                    'type': 'object'
                },
                'status': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'policyRoles': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    }
                },
                'topicId': {
                    'type': 'string'
                },
                'policyTag': {
                    'type': 'string'
                },
                'policyTopics': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {
                                'type': 'string'
                            },
                            'description': {
                                'type': 'string'
                            },
                            'type': {
                                'type': 'string'
                            },
                            'static': {
                                'type': 'boolean'
                            }
                        }
                    }
                }
            }
        },
        'TrustChains': {
            'type': 'object',
            'required': [
                'chain',
                'userMap'
            ],
            'properties': {
                'chain': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': [
                            'id',
                            'type',
                            'tag',
                            'label',
                            'schema',
                            'owner',
                            'document'
                        ],
                        'properties': {
                            'id': {
                                'type': 'string'
                            },
                            'type': {
                                'type': 'string'
                            },
                            'tag': {
                                'type': 'string'
                            },
                            'label': {
                                'type': 'string'
                            },
                            'schema': {
                                'type': 'string'
                            },
                            'owner': {
                                'type': 'string'
                            },
                            'document': {
                                'type': 'object'
                            }
                        }
                    }
                },
                'userMap': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': [
                            'did',
                            'username'
                        ],
                        'properties': {
                            'did': {
                                'type': 'string'
                            },
                            'username': {
                                'type': 'string'
                            }
                        }
                    }
                }
            }
        },
        'VerifiablePresentation': {
            'type': 'object',
            'required': [
                'hash',
                'id',
                'policyId',
                'signature',
                'status',
                'tag',
                'type',
                'updateDate',
                'createDate',
                'owner',
                'document'
            ],
            'properties': {
                'hash': {
                    'type': 'string'
                },
                'id': {
                    'type': 'string'
                },
                'policyId': {
                    'type': 'string'
                },
                'signature': {
                    'type': 'string'
                },
                'status': {
                    'type': 'string'
                },
                'tag': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                },
                'updateDate': {
                    'type': 'string'
                },
                'createDate': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'document': {
                    'type': 'object'
                }
            }
        },
        'PublishPolicy': {
            'type': 'object',
            'required': [
                'errors',
                'isValid',
                'policies'
            ],
            'properties': {
                'errors': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                },
                'isValid': {
                    'type': 'boolean'
                },
                'policies': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                }
            }
        },
        'ValidatePolicy': {
            'type': 'object',
            'required': [
                'config',
                'results'
            ],
            'properties': {
                'config': {
                    'type': 'object'
                },
                'results': {
                    'type': 'object'
                }
            }
        },
        'PolicyBlock': {
            'type': 'object',
            'required': [
                'id',
                'blockType',
                'isActive',
                'uiMetaData'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'blockType': {
                    'type': 'string'
                },
                'isActive': {
                    'type': 'boolean'
                },
                'uiMetaData': {
                    'type': 'object'
                },
                'blocks': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                }
            }
        },
        'PolicyBlockData': {
            'type': 'object',
            'required': [
                'id',
                'isActive',
                'uiMetaData',
                'data'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'blockType': {
                    'type': 'string'
                },
                'isActive': {
                    'type': 'boolean'
                },
                'uiMetaData': {
                    'type': 'object'
                },
                'data': {
                    'type': 'object'
                },
                'fields': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                },
                'index': {
                    'type': 'number'
                },
                'roles': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    }
                },
                'blocks': {
                    'type': 'array',
                    'items': {
                        '$ref': '#/components/schemas/PolicyBlock'
                    }
                }
            }
        },
        'ExportPolicy': {
            'type': 'object',
            'required': [
                'name',
                'version',
                'messageId'
            ],
            'properties': {
                'name': {
                    'type': 'string'
                },
                'version': {
                    'type': 'string'
                },
                'tokens': {
                    'type': 'string'
                }
            }
        },
        'PreviewPolicy': {
            'type': 'object',
            'required': [
                'policy',
                'schemas',
                'tokens'
            ],
            'properties': {
                'policy': {
                    'type': 'object'
                },
                'schemas': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                },
                'tokens': {
                    'type': 'array',
                    'items': {
                        'type': 'object'
                    }
                }
            }
        },
        'Error': {
            'type': 'object',
            'required': [
                'code',
                'message'
            ],
            'properties': {
                'code': {
                    'type': 'number'
                },
                'message': {
                    'type': 'string'
                }
            }
        },
        'ExternalData': {
            'type': 'object',
            'required': [
                'owner',
                'policyTag',
                'document'
            ],
            'properties': {
                'owner': {
                    'type': 'string'
                },
                'policyTag': {
                    'type': 'string'
                },
                'document': {
                    'type': 'object'
                }
            }
        },
        'HederaAccount': {
            'type': 'object',
            'required': [
                'id',
                'key'
            ],
            'properties': {
                'id': {
                    'type': 'string'
                },
                'key': {
                    'type': 'string'
                }
            }
        },
        'CommonSettings': {
            'type': 'object',
            'properties': {
                'operatorId': {
                    'type': 'string'
                },
                'operatorKey': {
                    'type': 'string'
                },
                'nftApiKey': {
                    'deprecated': true,
                    'type': 'string'
                },
                'ipfsStorageApiKey': {
                    'type': 'string'
                }
            }
        },
        'LogFilters': {
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string'
                },
                'startDate': {
                    'type': 'string'
                },
                'endDate': {
                    'type': 'string'
                },
                'attributes': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    }
                },
                'message': {
                    'type': 'string'
                },
                'pageSize': {
                    'type': 'number'
                },
                'pageIndex': {
                    'type': 'number'
                },
                'sortDirection': {
                    'type': 'string',
                    'enum': [
                        'ASC',
                        'DESC'
                    ]
                }
            }
        },
        'Log': {
            'type': 'object',
            'properties': {
                'type': {
                    'type': 'string'
                },
                'datetime': {
                    'type': 'string'
                },
                'message': {
                    'type': 'string'
                },
                'attributes': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    }
                }
            }
        },
        'Task': {
            'type': 'object',
            'properties': {
                'taskId': {
                    'type': 'string'
                },
                'expectation': {
                    'type': 'number'
                }
            }
        },
        'TaskStatus': {
            'type': 'object',
            'properties': {
                'date': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'statuses': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'type': {
                                'type': 'string'
                            },
                            'message': {
                                'type': 'string'
                            }
                        }
                    }
                },
                'result': {
                    'type': 'object'
                },
                'error': {
                    'type': 'object'
                }
            }
        },
        'Artifact': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'extention': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                }
            }
        },
        'MultiPolicyConfig': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                },
                'instanceTopicId': {
                    'type': 'string'
                },
                'mainPolicyTopicId': {
                    'type': 'string'
                },
                'synchronizationTopicId': {
                    'type': 'string'
                },
                'policyOwner': {
                    'type': 'string'
                },
                'user': {
                    'type': 'string'
                }
            }
        },
        'Contract': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'contractId': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'isOwnerCreator': {
                    'type': 'string'
                },
                'status': {
                    'type': 'string'
                }
            }
        },
        'RetireRequest': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'contractId': {
                    'type': 'string'
                },
                'baseTokenId': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'oppositeTokenId': {
                    'type': 'string'
                },
                'baseTokenCount': {
                    'type': 'number'
                },
                'oppositeTokenCount': {
                    'type': 'number'
                }
            }
        },
        'Module': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string'
                },
                'uuid': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'config': {
                    'type': 'object'
                },
                'status': {
                    'type': 'string'
                },
                'creator': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                },
                'topicId': {
                    'type': 'string'
                },
                'messageId': {
                    'type': 'string'
                },
                'codeVersion': {
                    'type': 'string'
                },
                'createDate': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                }
            }
        },
        'PreviewModule': {
            'type': 'object',
            'properties': {
                'module': {
                    '$ref': '#/components/schemas/Module'
                }
            }
        },
        'ExportModule': {
            'type': 'object',
            'properties': {
                'uuid': {
                    'type': 'string'
                },
                'name': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'messageId': {
                    'type': 'string'
                },
                'owner': {
                    'type': 'string'
                }
            }
        },
        'PublishModule': {
            'type': 'object',
            'properties': {
                'errors': {
                    'type': 'object'
                },
                'isValid': {
                    'type': 'boolean'
                },
                'module': {
                    '$ref': '#/components/schemas/Module'
                }
            }
        },
        'ValidateModule': {
            'type': 'object',
            'properties': {
                'module': {
                    '$ref': '#/components/schemas/Module'
                },
                'results': {
                    'type': 'object'
                }
            }
        },
        'Tag': {
            'type': 'object',
            'required': [
                'name',
                'entity',
                'localTarget'
            ],
            'properties': {
                'uuid': {
                    'type': 'string',
                    'example': '00000000-0000-0000-0000-000000000000'
                },
                'name': {
                    'type': 'string',
                    'example': 'Tag label'
                },
                'description': {
                    'type': 'string',
                    'example': 'Description'
                },
                'owner': {
                    'type': 'string',
                    'example': 'did'
                },
                'entity': {
                    'type': 'string',
                    'enum': [
                        'Schema',
                        'Policy',
                        'Token',
                        'Module',
                        'Contract',
                        'PolicyDocument'
                    ],
                    'example': 'PolicyDocument'
                },
                'target': {
                    'type': 'string',
                    'example': '0000000000.000000000'
                },
                'localTarget': {
                    'type': 'string',
                    'example': 'db id'
                },
                'status': {
                    'type': 'string',
                    'enum': [
                        'Draft',
                        'Published',
                        'History'
                    ],
                    'example': 'Published'
                },
                'operation': {
                    'type': 'string',
                    'enum': [
                        'Create',
                        'Delete'
                    ],
                    'example': 'Create'
                },
                'date': {
                    'type': 'string',
                    'example': '1900-01-01T00:00:00.000Z'
                },
                'topicId': {
                    'type': 'string',
                    'example': '0.0.0000000'
                },
                'messageId': {
                    'type': 'string',
                    'example': '0000000000.000000000'
                },
                'policyId': {
                    'type': 'string',
                    'example': 'db id'
                },
                'uri': {
                    'type': 'string',
                    'example': 'document uri'
                },
                'document': {
                    'type': 'object'
                }
            }
        },
        'TagMap': {
            'type': 'object',
            'required': [
                'entity',
                'target',
                'refreshDate',
                'tags'
            ],
            'properties': {
                'entity': {
                    'type': 'string',
                    'enum': [
                        'Schema',
                        'Policy',
                        'Token',
                        'Module',
                        'Contract',
                        'PolicyDocument'
                    ],
                    'example': 'PolicyDocument'
                },
                'target': {
                    'type': 'string',
                    'example': 'db id'
                },
                'refreshDate': {
                    'type': 'string',
                    'example': '1900-01-01T00:00:00.000Z'
                },
                'tags': {
                    'type': 'array',
                    'items': {
                        '$ref': '#/components/schemas/Tag'
                    }
                }
            }
        },
        'Theme': {
            'type': 'object',
            'required': [
                'uuid',
                'name',
                'rules'
            ],
            'properties': {
                'id': {
                    'type': 'string',
                    'example': 'db id'
                },
                'uuid': {
                    'type': 'string',
                    'example': '00000000-0000-0000-0000-000000000000'
                },
                'name': {
                    'type': 'string',
                    'example': 'Theme name'
                },
                'rules': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': [
                            'text',
                            'background',
                            'border',
                            'shape',
                            'borderWidth',
                            'filterType',
                            'filterValue'
                        ],
                        'properties': {
                            'description': {
                                'type': 'string',
                                'example': 'description'
                            },
                            'text': {
                                'type': 'string',
                                'pattern': '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
                                'example': '#000000'
                            },
                            'background': {
                                'type': 'string',
                                'pattern': '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
                                'example': '#000000'
                            },
                            'border': {
                                'type': 'string',
                                'pattern': '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
                                'example': '#000000'
                            },
                            'shape': {
                                'type': 'string',
                                'enum': [
                                    '0',
                                    '1',
                                    '2',
                                    '3',
                                    '4',
                                    '5'
                                ],
                                'example': '0'
                            },
                            'borderWidth': {
                                'type': 'string',
                                'enum': [
                                    '0px',
                                    '1px',
                                    '2px',
                                    '3px',
                                    '4px',
                                    '5px',
                                    '6px',
                                    '7px'
                                ],
                                'example': '2px'
                            },
                            'filterType': {
                                'type': 'string',
                                'enum': [
                                    'type',
                                    'api',
                                    'role'
                                ],
                                'example': 'type'
                            },
                            'filterValue': {
                                'oneOf': [
                                    {
                                        'type': 'string'
                                    },
                                    {
                                        'type': 'array',
                                        'items': {
                                            'type': 'string'
                                        }
                                    }
                                ],
                                'example': [
                                    'type'
                                ]
                            }
                        }
                    }
                }
            }
        },
        'WizardConfig': {
            'type': 'object',
            'required': [
                'policy',
                'roles',
                'schemas',
                'trustChain'
            ],
            'properties': {
                'roles': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    }
                },
                'policy': {
                    'type': 'object',
                    'properties': {
                        'name': {
                            'type': 'string'
                        },
                        'description': {
                            'type': 'string'
                        },
                        'topicDescription': {
                            'type': 'string'
                        },
                        'policyTag': {
                            'type': 'string'
                        }
                    }
                },
                'schemas': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {
                                'type': 'string'
                            },
                            'iri': {
                                'type': 'string'
                            },
                            'isApproveEnable': {
                                'type': 'boolean'
                            },
                            'isMintSchema': {
                                'type': 'boolean'
                            },
                            'mintOptions': {
                                'type': 'object',
                                'properties': {
                                    'tokenId': {
                                        'type': 'string'
                                    },
                                    'rule': {
                                        'type': 'string'
                                    }
                                }
                            },
                            'dependencySchemaIri': {
                                'type': 'string'
                            },
                            'relationshipsSchemaIri': {
                                'type': 'string'
                            },
                            'initialRolesFor': {
                                'type': 'array',
                                'items': {
                                    'type': 'string'
                                }
                            },
                            'rolesConfig': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'role': {
                                            'type': 'string'
                                        },
                                        'isApprover': {
                                            'type': 'boolean'
                                        },
                                        'isCreator': {
                                            'type': 'boolean'
                                        },
                                        'gridColumns': {
                                            'type': 'array',
                                            'items': {
                                                'type': 'object',
                                                'properties': {
                                                    'field': {
                                                        'type': 'string'
                                                    },
                                                    'title': {
                                                        'type': 'string'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                'trustChain': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'role': {
                                'type': 'string'
                            },
                            'mintSchemaIri': {
                                'type': 'string'
                            },
                            'viewOnlyOwnDocuments': {
                                'type': 'boolean'
                            }
                        }
                    }
                }
            }
        }
    }
}

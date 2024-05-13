import { Guardians } from '../../helpers/guardians.js';
import { Logger, RunFunctionAsync, } from '@guardian/common';
import { TaskManager } from '../../helpers/task-manager.js';
import { ServiceError } from '../../helpers/service-requests-base.js';
import { Controller, HttpCode, HttpStatus, Post, Req, Response } from '@nestjs/common';
import { TaskAction, UserRole } from '@guardian/interfaces';
import { ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/errors.js';
import { Auth } from '../../auth/auth.decorator.js';

@Controller('wizard')
@ApiTags('wizard')
export class WizardApi {
    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        schema: {
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
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/policy')
    @HttpCode(HttpStatus.CREATED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setPolicy(@Req() req, @Response() res): Promise<any> {
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const guardians = new Guardians();
            return res.status(201).send(
                await guardians.wizardPolicyCreate(wizardConfig, user.did)
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }

    @ApiOperation({
        summary: 'Creates a new policy.',
        description: 'Creates a new policy by wizard. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                saveState: {
                    type: 'boolean',
                },
                wizardConfig: {
                    type: 'object',
                    required: ['policy', 'roles', 'schemas', 'trustChain'],
                    properties: {
                        roles: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                        },
                        policy: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                },
                                description: {
                                    type: 'string',
                                },
                                topicDescription: {
                                    type: 'string',
                                },
                                policyTag: {
                                    type: 'string',
                                },
                            },
                        },
                        schemas: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                    },
                                    iri: {
                                        type: 'string',
                                    },
                                    isApproveEnable: {
                                        type: 'boolean',
                                    },
                                    isMintSchema: {
                                        type: 'boolean',
                                    },
                                    mintOptions: {
                                        type: 'object',
                                        properties: {
                                            tokenId: {
                                                type: 'string',
                                            },
                                            rule: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    dependencySchemaIri: {
                                        type: 'string',
                                    },
                                    relationshipsSchemaIri: {
                                        type: 'string',
                                    },
                                    initialRolesFor: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                        },
                                    },
                                    rolesConfig: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                role: {
                                                    type: 'string',
                                                },
                                                isApprover: {
                                                    type: 'boolean',
                                                },
                                                isCreator: {
                                                    type: 'boolean',
                                                },
                                                gridColumns: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            field: {
                                                                type: 'string',
                                                            },
                                                            title: {
                                                                type: 'string',
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        trustChain: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    role: {
                                        type: 'string',
                                    },
                                    mintSchemaIri: {
                                        type: 'string',
                                    },
                                    viewOnlyOwnDocuments: {
                                        type: 'boolean',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/push/policy')
    @HttpCode(HttpStatus.ACCEPTED)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setPolicyAsync(@Req() req, @Response() res): Promise<any> {
        const { wizardConfig, saveState } = req.body;
        const user = req.user;
        const taskManager = new TaskManager();
        const task = taskManager.start(TaskAction.WIZARD_CREATE_POLICY, user.id);
        RunFunctionAsync<ServiceError>(
            async () => {
                const guardians = new Guardians();
                await guardians.wizardPolicyCreateAsyncNew(
                    wizardConfig,
                    user.did,
                    saveState,
                    task
                );
            },
            async (error) => {
                new Logger().error(error, ['API_GATEWAY']);
                taskManager.addError(task.taskId, {
                    code: 500,
                    message: error.message,
                });
            }
        );
        return res.status(202).send(task);
    }

    @ApiOperation({
        summary: 'Get policy config.',
        description: 'Get policy config by wizard. Only users with the Standard Registry role are allowed to make the request.',
    })
    @ApiBody({
        schema: {
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
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'boolean'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @Post('/:policyId/config')
    @HttpCode(HttpStatus.OK)
    @Auth(UserRole.STANDARD_REGISTRY)
    async setPolicyConfig(@Req() req, @Response() res): Promise<any> {
        try {
            const wizardConfig = req.body;
            const user = req.user;
            const {policyId} = req.params;
            const guardians = new Guardians();
            return res.send(
                await guardians.wizardGetPolicyConfig(
                    policyId,
                    wizardConfig,
                    user.did
                )
            );
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            throw error;
        }
    }
}

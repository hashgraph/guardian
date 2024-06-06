import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, getArtifactExtention, getArtifactType, Logger, MessageError, MessageResponse, } from '@guardian/common';
import { IOwner, MessageAPI, ModuleStatus, PolicyType } from '@guardian/interfaces';

export async function getParent(parentId: string) {
    if (!parentId) {
        return null;
    }
    const policy = await DatabaseServer.getPolicyById(parentId);
    if (policy) {
        return {
            type: 'policy',
            item: policy
        }
    }
    const tool = await DatabaseServer.getToolById(parentId);
    if (tool) {
        return {
            type: 'tool',
            item: tool
        }
    }
    return null;
}

/**
 * Connect to the message broker methods of working with artifacts.
 */
export async function artifactAPI(): Promise<void> {
    /**
     * Upload artifact
     *
     * @param {any} msg - Artifact parameters
     *
     * @returns {Artifact} - Uploaded artifact
     */
    ApiResponse(MessageAPI.UPLOAD_ARTIFACT, async (msg: {
        artifact: any,
        owner: IOwner,
        parentId: string
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get artifact parameters');
            }

            const { artifact, parentId, owner } = msg;
            if (!artifact || !parentId || !owner) {
                throw new Error('Invalid upload artifact parameters');
            }

            const parent = await getParent(parentId);

            if (!parent) {
                throw new Error('There is no appropriate entity');
            }

            const category: string = parent.type;
            if (parent.type === 'policy') {
                if (parent.item.status !== PolicyType.DRAFT) {
                    throw new Error('There is no appropriate policy or policy is not in DRAFT status');
                }
            } else if (parent.type === 'tool') {
                if (parent.item.status === ModuleStatus.PUBLISHED) {
                    throw new Error('There is no appropriate tool or tool is not in DRAFT status');
                }
            }

            const extention = getArtifactExtention(artifact.originalname);
            const type = getArtifactType(extention);
            const row = await DatabaseServer.saveArtifact({
                name: artifact.originalname.split('.')[0],
                extention,
                type,
                policyId: parentId,
                owner: owner.owner,
                category
            } as any);
            await DatabaseServer.saveArtifactFile(row.uuid, Buffer.from(msg.artifact.buffer));
            return new MessageResponse(row);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    /**
     * Get artifacts
     *
     * @param {any} msg - Get artifact parameters
     *
     * @returns {any} Artifacts and count
     */
    ApiResponse(MessageAPI.GET_ARTIFACTS, async (msg: {
        type: string,
        id: string,
        toolId: string,
        policyId: string,
        pageIndex: string,
        pageSize: string,
        owner: IOwner
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get artifact parameters');
            }

            const {
                type,
                id,
                toolId,
                policyId,
                pageIndex,
                pageSize,
                owner
            } = msg;
            const filter: any = {};

            if (owner) {
                filter.owner = owner.owner;
            }

            if (policyId) {
                filter.category = 'policy';
                filter.policyId = policyId;
            } else if (toolId) {
                filter.category = 'tool';
                filter.policyId = toolId;
            } else if (id) {
                filter.policyId = id;
            } else if (type) {
                filter.category = type;
            }
            if (filter.category === 'policy') {
                filter.category = { $in: ['policy', undefined] }
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const [artifacts, count] = await DatabaseServer.getArtifactsAndCount(filter, otherOptions);

            return new MessageResponse({
                artifacts,
                count
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Get artifacts V2 04.06.2024
     *
     * @param {any} msg - Get artifact parameters
     *
     * @returns {any} Artifacts and count
     */
    ApiResponse(MessageAPI.GET_ARTIFACTS_V2, async (msg: {
        fields: string[],
        type: string,
        id: string,
        toolId: string,
        policyId: string,
        pageIndex: string,
        pageSize: string,
        owner: IOwner
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid get artifact parameters');
            }

            const {
                fields,
                type,
                id,
                toolId,
                policyId,
                pageIndex,
                pageSize,
                owner
            } = msg;
            const filter: any = {};

            if (owner) {
                filter.owner = owner.owner;
            }

            if (policyId) {
                filter.category = 'policy';
                filter.policyId = policyId;
            } else if (toolId) {
                filter.category = 'tool';
                filter.policyId = toolId;
            } else if (id) {
                filter.policyId = id;
            } else if (type) {
                filter.category = type;
            }
            if (filter.category === 'policy') {
                filter.category = { $in: ['policy', undefined] }
            }

            const otherOptions: any = { fields };
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }

            const [artifacts, count] = await DatabaseServer.getArtifactsAndCount(filter, otherOptions);

            return new MessageResponse({
                artifacts,
                count
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Delete artifact
     *
     * @param {any} msg - Delete artifact parameters
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_ARTIFACT,
        async (msg: { artifactId: string, owner: IOwner }) => {
            try {
                const { artifactId, owner } = msg;
                if (!artifactId || !owner) {
                    return new MessageError('Invalid delete artifact parameters');
                }

                const artifactToDelete = await DatabaseServer.getArtifact({
                    id: artifactId,
                    owner: owner.owner
                });
                const parentId = artifactToDelete.policyId;

                if (!parentId) {
                    return new MessageResponse(false);
                }

                const parent = await getParent(parentId);
                if (parent) {
                    if (parent.type === 'policy') {
                        if (parent.item.status !== PolicyType.DRAFT) {
                            throw new Error('There is no appropriate policy or policy is not in DRAFT status');
                        }
                    } else if (parent.type === 'tool') {
                        if (parent.item.status === ModuleStatus.PUBLISHED) {
                            throw new Error('There is no appropriate tool or tool is not in DRAFT status');
                        }
                    }
                }

                await DatabaseServer.removeArtifact(artifactToDelete);
                return new MessageResponse(true);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}

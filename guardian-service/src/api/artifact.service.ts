import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI, PolicyType } from '@guardian/interfaces';
import { DatabaseServer } from '@database-modules';
import { getArtifactExtention, getArtifactType } from '@helpers/utils';

/**
 * Connect to the message broker methods of working with artifacts.
 *
 * @param channel - channel
 */
export async function artifactAPI(
    channel: MessageBrokerChannel
): Promise<void> {

    /**
     * Create new token
     *
     * @param {IToken} payload - token
     *
     * @returns {IToken[]} - all tokens
     */
    ApiResponse(channel, MessageAPI.UPLOAD_ARTIFACT, async (msg) => {
        try {
            if (!msg || !msg.artifact || !msg.policyId || !msg.owner) {
                throw new Error('Invalid Artifact Parameters');
            }
            const extention = getArtifactExtention(msg.artifact.name);
            const type = getArtifactType(extention);
            const artifact = await DatabaseServer.saveArtifact({
                name: msg.artifact.name.split('.')[0],
                extention,
                type,
                policyId: msg.policyId,
                owner: msg.owner
            } as any);
            await DatabaseServer.saveArtifactFile(artifact.uuid, Buffer.from(msg.artifact.data));
            return new MessageResponse(artifact);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error.message);
        }
    });

    ApiResponse(channel, MessageAPI.GET_ARTIFACTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load artifact parameter');
            }

            const { policyId, pageIndex, pageSize, owner } = msg;
            const filter: any = {}

            if (policyId) {
                filter.policyId = policyId;
            }
            if (owner) {
                filter.owner = owner;
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
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

    ApiResponse(channel, MessageAPI.DELETE_ARTIFACT, async (msg) => {
        try {
            if (!msg.artifactId || !msg.owner) {
                return new MessageError('Invalid load schema parameter');
            }
            const artifactToDelete = await DatabaseServer.getArtifact({
                id: msg.artifactId,
                owner: msg.owner
            });
            if (!artifactToDelete.policyId) {
                return new MessageResponse(false);
            }
            const policy = await DatabaseServer.getPolicy({
                id: artifactToDelete.policyId,
                owner: msg.owner
            });
            if (policy && policy.status !== PolicyType.DRAFT) {
                throw new Error('There is no appropriate policy or policy is not in DRAFT status');
            }
            await DatabaseServer.removeArtifact(artifactToDelete);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}

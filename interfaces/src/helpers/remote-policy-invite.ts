/**
 * Invite link of a public policy.
 * The link does not name a home instance: the user pastes it into the remote policy
 * import of any instance, which reads the policy message ID from it.
 */
export class RemotePolicyInvite {
    /**
     * Link prefix
     */
    public static readonly PREFIX = 'guardian://remote-policy/';

    /**
     * Query parameter that opens the import dialog prefilled
     */
    public static readonly QUERY_PARAM = 'invite';

    private static readonly MESSAGE_ID = /^\d+\.\d+$/;

    /**
     * Create an invite link
     * @param messageId - policy message ID
     */
    public static encode(messageId: string): string {
        return `${RemotePolicyInvite.PREFIX}${messageId}`;
    }

    /**
     * Read the policy message ID from an invite link, a URL with the invite
     * query parameter, or a plain message ID
     * @param value
     * @returns message ID, or null when the value holds none
     */
    public static decode(value: string | null | undefined): string | null {
        let text = typeof value === 'string' ? value.trim() : '';
        if (!text) {
            return null;
        }
        if (text.startsWith(RemotePolicyInvite.PREFIX)) {
            text = text.substring(RemotePolicyInvite.PREFIX.length).split(/[?#/]/)[0];
        } else if (/^https?:\/\//i.test(text)) {
            const match = text.match(new RegExp(`[?&]${RemotePolicyInvite.QUERY_PARAM}=([^&#]+)`));
            if (!match) {
                return null;
            }
            let param: string;
            try {
                param = decodeURIComponent(match[1]);
            } catch (error) {
                return null;
            }
            return param.startsWith('http') ? null : RemotePolicyInvite.decode(param);
        }
        return RemotePolicyInvite.MESSAGE_ID.test(text) ? text : null;
    }
}

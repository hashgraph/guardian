import { MessageAPI } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import { Branding, DatabaseServer, IAuthUser, MessageResponse } from '@guardian/common';

const termsAndConditions = `Lorem Ipsum Version Introduction
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Use License
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Disclaimer
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Limitations
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
Revisions and Errata
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
Links
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos.
Site Terms of Use Modifications
Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius.
Governing Law
Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates.
`

/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param dataBaseServer - Data base server
 */export async function brandingAPI(
    dataBaseServer: DatabaseServer,
): Promise<void> {
    /**
     * Return Branding
     *
     * @returns {Branding} - branding object
     */
    ApiResponse(MessageAPI.GET_BRANDING, async () => {
        const brandingJSON: Branding = await dataBaseServer.findOne(Branding, {
            config: { $exists: true }
        }, {
            orderBy: { updateDate: -1 }
        });
        if (brandingJSON) {
            return new MessageResponse(brandingJSON);
        } else {
            const initialBranding = JSON.stringify({
                'headerColor': '#0031ff',
                'headerColor1': '#8259ef',
                'primaryColor': '#0031ff',
                'companyName': 'GUARDIAN',
                'companyLogoUrl': '/assets/images/logo.png',
                'loginBannerUrl': '/assets/bg.jpg',
                'faviconUrl': 'favicon.ico',
                termsAndConditions
            });
            const newBrandingJSON: Branding = await dataBaseServer.save(Branding, { config: initialBranding });
            return new MessageResponse(newBrandingJSON);
        }
    });

    /**
     * Create new Branding
     *
     * @param {Branding} payload - branding
     *
     * @returns {Branding} - new branding object
     */
    ApiResponse(MessageAPI.STORE_BRANDING, async (msg: {
        user: IAuthUser,
        config: string
    }) => {
        const { config } = msg;
        const branding: any = await dataBaseServer.save(Branding, { config });
        return new MessageResponse(branding);
    });
}

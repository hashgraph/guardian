import { MessageAPI } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import { Branding, DataBaseHelper, MessageResponse } from '@guardian/common';

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
 * @param brandingRepository - table with Branding
 */
export async function brandingAPI(
    brandingRepository: DataBaseHelper<Branding>
): Promise<void> {
    /**
     * Return Branding
     *
     * @returns {Branding} - branding object
     */
    ApiResponse(MessageAPI.GET_BRANDING, async () => {
        const brandingJSON: Branding[] = await brandingRepository.findAll();
        let newBrandingJSON: Branding[];
        if (!brandingJSON.length) {
            const initialBranding = JSON.stringify({'headerColor': '#000', 'primaryColor': '#2C78F6', 'companyName': 'Guardian', 'companyLogoUrl': '', 'loginBannerUrl': 'bg.jpg', 'faviconUrl': 'favicon.ico', termsAndConditions});
            await brandingRepository.save({config: initialBranding});
            newBrandingJSON = await brandingRepository.findAll();
        }
        return new MessageResponse(brandingJSON.length ? brandingJSON[brandingJSON.length - 1] : newBrandingJSON[newBrandingJSON.length-1]);
    });

    /**
     * Create new Branding
     *
     * @param {Branding} payload - branding
     *
     * @returns {Branding} - new branding object
     */
    ApiResponse(MessageAPI.STORE_BRANDING, async (config) => {
            const branding: any = await brandingRepository.save(config);
            return new MessageResponse(branding);
    });
}

import {
    MessageAPI
} from '@guardian/interfaces';
import { ApiResponse } from '@api/helpers/api-response';
import {
    MessageResponse,
    DataBaseHelper,
    Branding
} from '@guardian/common';
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
            const initialBranding = JSON.stringify({'headerColor':'#000','primaryColor':'#2C78F6','companyName':'Guardian','companyLogoUrl':'','loginBannerUrl':'bg.jpg','faviconUrl':'favicon.ico'});
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

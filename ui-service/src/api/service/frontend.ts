import express, {Request, Response, Router} from 'express';
import path from 'path';

const FRONTEND_FOLDER_NAME = process.env.FRONTEND_FOLDER_NAME || 'www-data';

/**
 * Angular route
 */
export const frontendService = Router();
const normalizedPathToFrontend = path.normalize(path.join(process.cwd(), '..', FRONTEND_FOLDER_NAME));

frontendService.use('/', express.static(normalizedPathToFrontend, {
    immutable: true,
    extensions: false,
    dotfiles: 'ignore'
}));
frontendService.get('/*', (req: Request, res: Response) => {
    res.sendFile(path.join(normalizedPathToFrontend, 'index.html'));
})

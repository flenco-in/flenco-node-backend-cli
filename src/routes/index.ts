import { Router } from 'express';
import metadataRoute from './metadata.route';

const router = Router();

// System routes
router.use('/metadata', metadataRoute);

export default router;

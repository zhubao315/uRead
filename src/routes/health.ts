import { Router } from 'express';
import { ResponseHelper } from '../utils/response';

const router = Router();

router.get('/', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '0.1.0'
  };

  res.json(ResponseHelper.success(healthCheck));
});

export default router;
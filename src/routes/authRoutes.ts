import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { requireRole, logAccess } from '../middleware/authorization';
import { UserRole } from '../types';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.post('/login', 
    logAccess('login'),
    authController.login.bind(authController)
  );

  // Protected routes (authentication required)
  router.post('/logout', 
    authMiddleware,
    logAccess('logout'),
    authController.logout.bind(authController)
  );

  router.get('/me', 
    authMiddleware,
    logAccess('get_current_user'),
    authController.getCurrentUser.bind(authController)
  );

  // Admin only routes
  router.post('/users', 
    authMiddleware,
    requireRole(UserRole.MANAGER),
    logAccess('create_user'),
    authController.createUser.bind(authController)
  );

  router.post('/users/:userId/revoke-sessions', 
    authMiddleware,
    requireRole(UserRole.ADMIN),
    logAccess('revoke_user_sessions', (req) => `/api/auth/users/${req.params.userId}/revoke-sessions`),
    authController.revokeUserSessions.bind(authController)
  );

  return router;
}
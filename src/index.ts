import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { connectDatabase, getPool } from './config/database';
import { DatabaseMigration } from './utils/migration';
import { UserRepository } from './repositories/userRepository';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { createAuthRoutes } from './routes/authRoutes';
import { injectAuthService } from './middleware/authorization';
import { 
  dataProtectionMiddleware, 
  sanitizeResponseMiddleware, 
  enforceHTTPS, 
  securityHeadersMiddleware 
} from './middleware/dataProtection';
import { secureConfig } from './utils/secureConfig';
import { schoolRoutes } from './routes/schoolRoutes';
import { contactRoutes } from './routes/contactRoutes';
import { schoolContactRoutes } from './routes/schoolContactRoutes';
import { interactionRoutes } from './routes/interactionRoutes';
import { schoolInteractionRoutes } from './routes/schoolInteractionRoutes';
import { searchRoutes } from './routes/searchRoutes';
import { createBackupRoutes } from './routes/backupRoutes';
import { createExportRoutes } from './routes/exportRoutes';
import { createImportRoutes } from './routes/importRoutes';
import { partnershipRoutes, initializePartnershipServices } from './routes/partnershipRoutes';
import { createDashboardRoutes } from './routes/dashboardRoutes';

// Load environment variables
dotenv.config();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
  process.exit(1);
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(enforceHTTPS);
app.use(securityHeadersMiddleware);

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data protection middleware
app.use(dataProtectionMiddleware);
app.use(sanitizeResponseMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'recruitment-crm-api'
  });
});

// Initialize authentication system
let userRepository: UserRepository;
let authService: AuthService;
let authController: AuthController;

// Initialize routes after server startup
function initializeRoutes() {
  // API routes
  app.use('/api/auth', (req, res, next) => {
    // Inject repositories into app locals for access in middleware
    req.app.locals.userRepository = userRepository;
    next();
  }, createAuthRoutes(authController));

  app.use('/api/schools', authMiddleware, injectAuthService(authService), schoolRoutes);
  app.use('/api/schools/:schoolId/contacts', authMiddleware, injectAuthService(authService), schoolContactRoutes);
  app.use('/api/schools/:schoolId/interactions', authMiddleware, injectAuthService(authService), schoolInteractionRoutes);
  app.use('/api/contacts', authMiddleware, injectAuthService(authService), contactRoutes);
  app.use('/api/interactions', authMiddleware, injectAuthService(authService), interactionRoutes);
  app.use('/api/search', authMiddleware, injectAuthService(authService), searchRoutes);
  app.use(
    '/api/backup',
    authMiddleware,
    injectAuthService(authService),
    createBackupRoutes(getPool())
  );
  app.use('/api/partnerships', authMiddleware, injectAuthService(authService), partnershipRoutes);
  app.use('/api/dashboard', createDashboardRoutes(getPool()));
  app.use('/api/export', createExportRoutes(getPool()));
  app.use('/api/import', createImportRoutes(getPool()));
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    console.log('[DEBUG] Starting server...');
    console.log('[DEBUG] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST
    });
    
    // Connect to database
    console.log('[DEBUG] Connecting to database...');
    await connectDatabase();
    console.log('[DEBUG] Database connected');
    
    // Run database migrations
    const migration = new DatabaseMigration(getPool());
    await migration.runMigrations();
    
    // Initialize authentication system
    const pool = getPool();
    userRepository = new UserRepository(pool);
    authService = new AuthService(userRepository);
    authController = new AuthController(authService);
    
    // Store repositories in app locals for middleware access
    app.locals.userRepository = userRepository;
    app.locals.authService = authService;
    
    // Initialize partnership services and reminder scheduler
    initializePartnershipServices(pool);
    
    // Initialize routes after services are ready
    initializeRoutes();
    
    // Schedule cleanup of expired sessions (every hour)
    setInterval(async () => {
      try {
        await userRepository.cleanupExpiredSessions();
        logger.info('過期會話清理完成');
      } catch (error) {
        logger.error('清理過期會話失敗:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`招生CRM系統API服務已啟動，端口: ${PORT}`);
    });
  } catch (error) {
    console.error('[ERROR] Service startup failed:', error);
    logger.error('服務啟動失敗:', error);
    // Keep process alive for a moment to see error
    setTimeout(() => process.exit(1), 2000);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信號，正在關閉服務...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信號，正在關閉服務...');
  process.exit(0);
});

// Always start server when this file is executed directly
console.log('[ENTRY] index.ts loaded, calling startServer()');
try {
  startServer();
} catch (error) {
  console.error('[ENTRY] Failed to call startServer():', error);
  process.exit(1);
}

export { app };
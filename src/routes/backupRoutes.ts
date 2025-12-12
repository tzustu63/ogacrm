import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { BackupService } from '../services/backupService';
import { BackupScheduler, defaultScheduleConfig } from '../services/backupScheduler';
import { RecoveryService } from '../services/recoveryService';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { UserRole } from '../types';

/**
 * 需要在資料庫連線完成後才初始化備份相關元件，避免 getPool() 尚未建立時拋錯
 */
export function createBackupRoutes(pool: import('pg').Pool) {
  const router = Router();

  // 初始化備份服務和排程器
  const backupService = new BackupService(undefined, pool);
  const backupScheduler = new BackupScheduler(backupService, defaultScheduleConfig);
  const recoveryService = new RecoveryService(backupService);
  const backupController = new BackupController(backupService, backupScheduler, recoveryService);

  // 初始化備份服務
  backupService.initialize().catch(error => {
    console.error('備份服務初始化失敗:', error);
  });

  // 啟動備份排程器
  backupScheduler.start();

  // 所有備份相關的路由都需要管理員權限
  router.use(requireRole(UserRole.ADMIN));

  // 備份管理路由
  router.post('/create', backupController.createBackup);
  router.get('/list', backupController.listBackups);
  router.delete('/:backupId', backupController.deleteBackup);
  router.post('/:backupId/verify', backupController.verifyBackup);

  // 排程管理路由
  router.get('/schedule/status', backupController.getScheduleStatus);
  router.put('/schedule/config', backupController.updateScheduleConfig);

  // 維護路由
  router.post('/cleanup', backupController.cleanupOldBackups);

  // 復原管理路由
  router.post('/:backupId/restore', backupController.restoreFromBackup);
  router.post('/:backupId/restore/selective', backupController.restoreSelectiveTables);
  router.get('/restorable', backupController.getRestorableBackups);
  router.get('/:backupId/preview', backupController.previewRestore);
  router.post('/:backupId/test', backupController.testRestore);

  return router;
}

export default createBackupRoutes;
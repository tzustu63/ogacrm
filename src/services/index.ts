export { SearchEngine } from './searchEngine';
export { AuthService } from './authService';
export { BackupService } from './backupService';
export { BackupScheduler } from './backupScheduler';
export { RecoveryService } from './recoveryService';
export { ExportService } from './exportService';
export { ReminderService } from './reminderService';
export { ReminderScheduler, defaultReminderScheduleConfig } from './reminderScheduler';
export type { 
  SearchResult, 
  FilterOptions, 
  SortOptions, 
  PaginationOptions, 
  ExportFormat 
} from './searchEngine';
export type {
  BackupMetadata,
  BackupOptions
} from './backupService';
export type {
  ScheduleConfig
} from './backupScheduler';
export type {
  RecoveryOptions,
  RecoveryResult
} from './recoveryService';
export type {
  ExportOptions,
  ExportResult,
  ExportProgress
} from './exportService';
export type {
  ExpiryReminder,
  ReminderNotification
} from './reminderService';
export type {
  ReminderScheduleConfig
} from './reminderScheduler';
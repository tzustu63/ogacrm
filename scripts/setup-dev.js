#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 設定招生CRM系統開發環境...\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 創建環境配置文件...');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env 文件已創建，請根據需要修改配置\n');
} else {
  console.log('✅ .env 文件已存在\n');
}

// Build TypeScript
console.log('🔨 編譯TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ TypeScript編譯完成\n');
} catch (error) {
  console.error('❌ TypeScript編譯失敗');
  process.exit(1);
}

// Run tests
console.log('🧪 運行測試...');
try {
  execSync('npm run test:unit', { stdio: 'inherit' });
  console.log('✅ 測試通過\n');
} catch (error) {
  console.error('❌ 測試失敗');
  process.exit(1);
}

console.log('🎉 開發環境設定完成！');
console.log('\n下一步：');
console.log('1. 確保PostgreSQL已安裝並運行');
console.log('2. 創建資料庫：recruitment_crm 和 recruitment_crm_test');
console.log('3. 修改 .env 文件中的資料庫配置');
console.log('4. 運行 npm run dev 啟動開發服務器');
import { execSync } from 'child_process';

console.log('Running TypeScript migration script...');

try {
  // Use ts-node to run the TypeScript migration script
  execSync('npx ts-node scripts/migrate-data.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Migration failed:', (error as Error).message);
  process.exit(1);
}

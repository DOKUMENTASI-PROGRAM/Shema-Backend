/**
 * Script to migrate shared components to individual services
 * This script will copy all shared components to each service directory
 */

const fs = require('fs');
const path = require('path');

// Services that need shared components
const services = ['api-gateway', 'auth', 'booking', 'course', 'recommendation'];

// Shared components to migrate
const sharedComponents = [
  { src: 'shared/config/environment.ts', dest: 'src/config/environment.ts' },
  { src: 'shared/config/redis.ts', dest: 'src/config/redis.ts' },
  { src: 'shared/config/supabase.ts', dest: 'src/config/supabase.ts' },
  { src: 'shared/middleware/cors.ts', dest: 'src/middleware/cors.ts' },
  { src: 'shared/middleware/errorHandler.ts', dest: 'src/middleware/errorHandler.ts' },
  { src: 'shared/middleware/serviceAuth.ts', dest: 'src/middleware/serviceAuth.ts' },
  { src: 'shared/middleware/timeout.ts', dest: 'src/middleware/timeout.ts' },
  { src: 'shared/types/index.ts', dest: 'src/types/index.ts' },
  { src: 'shared/utils/circuitBreakerService.ts', dest: 'src/utils/circuitBreakerService.ts' },
  { src: 'shared/utils/concurrencyService.ts', dest: 'src/utils/concurrencyService.ts' },
  { src: 'shared/utils/errors.ts', dest: 'src/utils/errors.ts' },
  { src: 'shared/utils/healthService.ts', dest: 'src/utils/healthService.ts' },
  { src: 'shared/utils/logger.ts', dest: 'src/utils/logger.ts' },
  { src: 'shared/utils/serviceCall.ts', dest: 'src/utils/serviceCall.ts' },
  { src: 'shared/utils/serviceClient.ts', dest: 'src/utils/serviceClient.ts' },
];

// Service-specific configurations
const serviceConfigs = {
  'api-gateway': {
    port: 3000,
    useAllComponents: true
  },
  'auth': {
    port: 3001,
    useAllComponents: true
  },
  'booking': {
    port: 3004,
    useAllComponents: true
  },
  'course': {
    port: 3003,
    useAllComponents: true,
    excludeComponents: ['environment.ts', 'redis.ts'] // Course service doesn't use these
  },
  'recommendation': {
    port: 3005,
    useAllComponents: true
  },
  'documentation': {
    port: 3006,
    useAllComponents: false,
    includeComponents: ['redis.ts'] // Only uses redis
  }
};

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Copy file from shared to service
 */
function copyFileToService(serviceName, component) {
  const srcPath = component.src;
  const destPath = path.join(serviceName, component.dest);
  
  // Create destination directory if it doesn't exist
  const destDir = path.dirname(destPath);
  ensureDirectoryExists(destDir);
  
  // Read source file
  try {
    const content = fs.readFileSync(srcPath, 'utf8');
    
    // Service-specific modifications
    let modifiedContent = content;
    
    // Update port in environment.ts for each service
    if (component.dest === 'src/config/environment.ts') {
      const config = serviceConfigs[serviceName];
      if (config && config.port) {
        modifiedContent = content.replace(
          /PORT: z\.string\(\)\.transform\(Number\)\.default\(\d+\)/,
          `PORT: z.string().transform(Number).default(${config.port})`
        );
      }
    }
    
    // Write to destination
    fs.writeFileSync(destPath, modifiedContent);
    console.log(`📄 Copied ${srcPath} -> ${destPath}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${srcPath} to ${destPath}:`, error.message);
    return false;
  }
}

/**
 * Migrate shared components to a specific service
 */
function migrateToService(serviceName) {
  console.log(`\n🚀 Migrating shared components to ${serviceName}...`);
  
  const config = serviceConfigs[serviceName];
  if (!config) {
    console.log(`⚠️  No configuration found for ${serviceName}, skipping...`);
    return;
  }
  
  let successCount = 0;
  let totalCount = 0;
  
  for (const component of sharedComponents) {
    // Check if this component should be included/excluded
    if (config.useAllComponents) {
      if (config.excludeComponents && config.excludeComponents.includes(path.basename(component.src))) {
        console.log(`⏭️  Skipping ${component.src} (excluded for ${serviceName})`);
        continue;
      }
    } else if (config.includeComponents) {
      if (!config.includeComponents.includes(path.basename(component.src))) {
        console.log(`⏭️  Skipping ${component.src} (not included for ${serviceName})`);
        continue;
      }
    }
    
    totalCount++;
    if (copyFileToService(serviceName, component)) {
      successCount++;
    }
  }
  
  console.log(`✅ Migration to ${serviceName} completed: ${successCount}/${totalCount} files copied`);
}

/**
 * Main migration function
 */
function main() {
  console.log('🔄 Starting migration of shared components to individual services...\n');
  
  let totalServices = 0;
  let totalSuccess = 0;
  
  for (const serviceName of services) {
    if (fs.existsSync(serviceName)) {
      totalServices++;
      migrateToService(serviceName);
      totalSuccess++;
    } else {
      console.log(`⚠️  Service directory ${serviceName} not found, skipping...`);
    }
  }
  
  console.log(`\n🎉 Migration completed: ${totalSuccess}/${totalServices} services processed`);
  
  if (totalSuccess === totalServices && totalSuccess > 0) {
    console.log('\n✨ All services have been successfully migrated!');
    console.log('📝 Next steps:');
    console.log('   1. Update import statements in each service');
    console.log('   2. Test each service individually');
    console.log('   3. Remove the shared folder from root project');
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = {
  migrateToService,
  main
};
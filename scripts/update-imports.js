/**
 * Script to update import statements in all services
 * This script will update imports from shared to local paths
 */

const fs = require('fs');
const path = require('path');

// Services that need import updates
const services = ['api-gateway', 'auth', 'booking', 'course', 'recommendation'];

// Import mappings from shared to local
const importMappings = [
  {
    from: '../../../shared/config/',
    to: '../config/',
    files: ['src/index.ts']
  },
  {
    from: '../../shared/config/',
    to: '../config/',
    files: ['src/index.ts']
  },
  {
    from: '../shared/config/',
    to: './config/',
    files: ['src/**/*.ts']
  },
  {
    from: '../../../shared/middleware/',
    to: '../middleware/',
    files: ['src/index.ts']
  },
  {
    from: '../../shared/middleware/',
    to: '../middleware/',
    files: ['src/index.ts']
  },
  {
    from: '../shared/middleware/',
    to: './middleware/',
    files: ['src/**/*.ts']
  },
  {
    from: '../../../shared/types/',
    to: '../types/',
    files: ['src/index.ts']
  },
  {
    from: '../../shared/types/',
    to: '../types/',
    files: ['src/index.ts']
  },
  {
    from: '../shared/types/',
    to: './types/',
    files: ['src/**/*.ts']
  },
  {
    from: '../../../shared/utils/',
    to: '../utils/',
    files: ['src/index.ts']
  },
  {
    from: '../../shared/utils/',
    to: '../utils/',
    files: ['src/index.ts']
  },
  {
    from: '../shared/utils/',
    to: './utils/',
    files: ['src/**/*.ts']
  }
];

/**
 * Get all TypeScript files in a directory recursively
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Update imports in a single file
 */
function updateImportsInFile(serviceName, filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Apply each import mapping
    for (const mapping of importMappings) {
      // Check if this file matches the pattern
      const relativePath = path.relative(serviceName, filePath);
      const matches = mapping.files.some(pattern => {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(relativePath);
      });
      
      if (matches) {
        // Replace import statements
        const regex = new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const newContent = content.replace(regex, mapping.to);
        
        if (newContent !== content) {
          content = newContent;
          updated = true;
          console.log(`📝 Updated imports in ${filePath}`);
        }
      }
    }
    
    // Write back if updated
    if (updated) {
      fs.writeFileSync(filePath, content);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
  
  return false;
}

/**
 * Update imports in a service
 */
function updateImportsInService(serviceName) {
  console.log(`\n🔄 Updating imports in ${serviceName}...`);
  
  const srcPath = path.join(serviceName, 'src');
  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  Source directory not found: ${srcPath}`);
    return;
  }
  
  const tsFiles = getAllTsFiles(srcPath);
  let updatedCount = 0;
  
  for (const filePath of tsFiles) {
    if (updateImportsInFile(serviceName, filePath)) {
      updatedCount++;
    }
  }
  
  console.log(`✅ Updated imports in ${serviceName}: ${updatedCount}/${tsFiles.length} files`);
  return updatedCount;
}

/**
 * Main update function
 */
function main() {
  console.log('🔄 Starting import statement updates...\n');
  
  let totalServices = 0;
  let totalUpdated = 0;
  
  for (const serviceName of services) {
    if (fs.existsSync(serviceName)) {
      totalServices++;
      const updatedCount = updateImportsInService(serviceName);
      totalUpdated += updatedCount;
    } else {
      console.log(`⚠️  Service directory ${serviceName} not found, skipping...`);
    }
  }
  
  console.log(`\n🎉 Import updates completed: ${totalUpdated} files updated across ${totalServices} services`);
  
  if (totalUpdated > 0) {
    console.log('\n📝 Next steps:');
    console.log('   1. Test each service individually');
    console.log('   2. Run unit tests');
    console.log('   3. Run e2e tests with curl');
    console.log('   4. Remove the shared folder from root project');
  }
}

// Run the update
if (require.main === module) {
  main();
}

module.exports = {
  updateImportsInService,
  main
};
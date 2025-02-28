// Script to update the auth-related files without modifying the database schema
const fs = require('fs');
const path = require('path');

async function updateAuthFiles() {
  console.log('Updating auth-related files...');
  
  try {
    // 1. Create backup of original files
    console.log('Creating backups of original files...');
    
    const filesToBackup = [
      { src: '../api/auth.js', dest: '../api/auth.js.bak' },
      { src: '../api/auth.ts', dest: '../api/auth.ts.bak' },
      { src: '../routes/auth.js', dest: '../routes/auth.js.bak' }
    ];
    
    for (const file of filesToBackup) {
      const srcPath = path.join(__dirname, file.src);
      const destPath = path.join(__dirname, file.dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Backed up ${file.src} to ${file.dest}`);
      } else {
        console.log(`Warning: ${file.src} does not exist, skipping backup`);
      }
    }
    
    // 2. Replace the auth files with the new versions
    console.log('Replacing auth files with new versions...');
    
    const filesToReplace = [
      { src: '../api/auth.js.new', dest: '../api/auth.js' },
      { src: '../api/auth.ts.new', dest: '../api/auth.ts' },
      { src: '../routes/auth.js.new', dest: '../routes/auth.js' }
    ];
    
    for (const file of filesToReplace) {
      const srcPath = path.join(__dirname, file.src);
      const destPath = path.join(__dirname, file.dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Replaced ${file.dest} with ${file.src}`);
      } else {
        console.log(`Warning: ${file.src} does not exist, skipping replacement`);
      }
    }
    
    console.log('Auth files updated successfully!');
    
  } catch (error) {
    console.error('Error updating auth files:', error);
    process.exit(1);
  }
}

// Run the function
updateAuthFiles().then(() => {
  console.log('Auth files update completed');
  process.exit(0);
}).catch(error => {
  console.error('Auth files update failed:', error);
  process.exit(1);
});

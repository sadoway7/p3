#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixPackageJson(packagePath) {
  console.log(`Fixing package.json at ${packagePath}`);
  
  // Read the package.json
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('Successfully read package.json');
  } catch (err) {
    console.error(`Error reading package.json: ${err.message}`);
    return;
  }
  
  // Platform-specific packages to remove
  const platformSpecificPackages = [
    '@rollup/rollup-win32-x64-msvc',
    'vite-react-typescript-starter'
  ];
  
  // Make a backup
  fs.writeFileSync(`${packagePath}.bak`, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('Created backup of package.json');
  
  // Remove platform-specific dependencies
  let modified = false;
  if (packageJson.dependencies) {
    platformSpecificPackages.forEach(pkg => {
      if (packageJson.dependencies[pkg]) {
        console.log(`Removing dependency: ${pkg}`);
        delete packageJson.dependencies[pkg];
        modified = true;
      }
    });
  }
  
  // If file: references exist, they will cause issues in Docker
  Object.keys(packageJson.dependencies || {}).forEach(pkg => {
    const value = packageJson.dependencies[pkg];
    if (value.startsWith('file:')) {
      console.log(`Removing file: dependency: ${pkg} (${value})`);
      delete packageJson.dependencies[pkg];
      modified = true;
    }
  });
  
  // Write back the modified package.json
  if (modified) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('Successfully modified package.json');
  } else {
    console.log('No modifications needed for package.json');
  }
}

// Main package.json
fixPackageJson(path.join(process.cwd(), 'package.json'));

// Backend package.json if it exists
const backendPackagePath = path.join(process.cwd(), 'backend', 'package.json');
if (fs.existsSync(backendPackagePath)) {
  fixPackageJson(backendPackagePath);
}
#!/usr/bin/env node

// This script helps synchronize package.json with package.docker.json
// Run this after adding new dependencies to package.json

const fs = require('fs');

// Read the original package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// Create a copy for Docker without platform-specific dependencies
const dockerPackageJson = { ...packageJson };

// List of Windows-specific dependencies to exclude
const windowsSpecificPackages = [
  '@rollup/rollup-win32-x64-msvc',
  'vite-react-typescript-starter' // This is a file: dependency that won't work in Docker
];

// Remove Windows-specific dependencies
if (dockerPackageJson.dependencies) {
  windowsSpecificPackages.forEach(pkg => {
    if (dockerPackageJson.dependencies[pkg]) {
      console.log(`Removing Windows-specific dependency: ${pkg}`);
      delete dockerPackageJson.dependencies[pkg];
    }
  });
}

// Write the Docker-specific package.json
fs.writeFileSync(
  './package.docker.json',
  JSON.stringify(dockerPackageJson, null, 2),
  'utf8'
);

console.log('Successfully created package.docker.json without Windows-specific dependencies.');
console.log('Use this file for Docker builds to avoid platform compatibility issues.');
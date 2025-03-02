import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageLockJsonPath = path.resolve(__dirname, 'package-lock.json');

try {
  // 1. Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // 2. Remove optional dependencies that are Windows-specific
  if (packageJson.optionalDependencies) {
      delete packageJson.optionalDependencies['@esbuild/win32-x64'];
  }

    // 3. Remove from dependencies (if present)
    if (packageJson.dependencies) {
        delete packageJson.dependencies['@esbuild/win32-x64'];
    }
    
  // 4. Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('package.json updated successfully.');

  // 5. Delete package-lock.json
  if (fs.existsSync(packageLockJsonPath)) {
  
      fs.unlinkSync(packageLockJsonPath);
      console.log('package-lock.json deleted successfully.');
  } else {
      console.log('package-lock.json does not exist.');
  }

  // 6. Inform the user to run npm install
  console.log('Now run `npm install` to regenerate package-lock.json without the Windows dependency.');

} catch (error) {
  console.error('An error occurred:', error);
}
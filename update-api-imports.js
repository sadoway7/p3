#!/usr/bin/env node

/**
 * This script updates all API files to use relative paths
 * by changing imports and API URL handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, 'src', 'api');
const API_FILES = fs.readdirSync(API_DIR)
  .filter(file => file.endsWith('.ts') && file !== 'apiUtils.ts');

// The pattern to look for and replace
const IMPORT_PATTERN = /const API_BASE_URL = import\.meta\.env\.VITE_API_BASE_URL \|\| 'http:\/\/localhost:3001';/g;
const FETCH_PATTERN = /fetch\(`\${API_BASE_URL}\/api\/([^`]+)`/g;

// The replacements
const IMPORT_REPLACEMENT = `import { getApiBaseUrl, getApiPath } from './apiUtils';\n\nconst API_BASE_URL = getApiBaseUrl();`;
const FETCH_REPLACEMENT = "fetch(getApiPath(`/api/$1`)";

console.log('Updating API files to use relative paths...');

let updatedCount = 0;

API_FILES.forEach(file => {
  const filePath = path.join(API_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if this file already has the import
  if (!content.includes('import { getApiBaseUrl, getApiPath } from ')) {
    // Replace the import
    content = content.replace(IMPORT_PATTERN, IMPORT_REPLACEMENT);
    
    // Replace all fetch calls
    content = content.replace(FETCH_PATTERN, FETCH_REPLACEMENT);
    
    // Write the updated content back
    fs.writeFileSync(filePath, content);
    updatedCount++;
    console.log(`Updated ${file}`);
  } else {
    console.log(`Skipping ${file} - already updated`);
  }
});

console.log(`\nUpdate complete! Modified ${updatedCount} API files.`);
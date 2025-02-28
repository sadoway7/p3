// Script to update the database connection to use the new database
const fs = require('fs');
const path = require('path');

// Function to update the .env file
function updateEnvFile(useNewDb = true) {
  const envPath = path.join(__dirname, '..', '.env');
  
  // Read the current .env file
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.error('Error reading .env file:', error);
    return false;
  }
  
  // Define the old and new database configurations
  const oldDbConfig = {
    DB_HOST: '68.146.102.33',
    DB_PORT: '3306',
    DB_USER: 'root', // Replace with your actual user
    DB_PASSWORD: '', // Replace with your actual password
    DB_NAME: 'rumfor' // Replace with your actual database name
  };
  
  const newDbConfig = {
    DB_HOST: '68.146.102.33',
    DB_PORT: '3306',
    DB_USER: 'rumfornew2',
    DB_PASSWORD: 'Oswald1986!',
    DB_NAME: 'rumfornew2'
  };
  
  // Choose which configuration to use
  const dbConfig = useNewDb ? newDbConfig : oldDbConfig;
  
  // Update the .env content
  let updatedContent = envContent;
  
  // Update or add each database configuration variable
  for (const [key, value] of Object.entries(dbConfig)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (updatedContent.match(regex)) {
      // Update existing variable
      updatedContent = updatedContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new variable
      updatedContent += `\n${key}=${value}`;
    }
  }
  
  // Write the updated content back to the .env file
  try {
    fs.writeFileSync(envPath, updatedContent);
    console.log(`Successfully updated .env file to use ${useNewDb ? 'new' : 'old'} database`);
    return true;
  } catch (error) {
    console.error('Error writing .env file:', error);
    return false;
  }
}

// Create a backup of the original .env file
function backupEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const backupPath = path.join(__dirname, '..', '.env.backup');
  
  try {
    // Check if a backup already exists
    if (!fs.existsSync(backupPath)) {
      // Create a backup
      fs.copyFileSync(envPath, backupPath);
      console.log('Created backup of .env file at .env.backup');
    } else {
      console.log('Backup of .env file already exists at .env.backup');
    }
    return true;
  } catch (error) {
    console.error('Error creating backup of .env file:', error);
    return false;
  }
}

// Restore the original .env file from backup
function restoreEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const backupPath = path.join(__dirname, '..', '.env.backup');
  
  try {
    // Check if a backup exists
    if (fs.existsSync(backupPath)) {
      // Restore from backup
      fs.copyFileSync(backupPath, envPath);
      console.log('Restored .env file from backup');
      return true;
    } else {
      console.error('No backup of .env file found at .env.backup');
      return false;
    }
  } catch (error) {
    console.error('Error restoring .env file from backup:', error);
    return false;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default to using the new database
    return { useNewDb: true, backup: true };
  }
  
  const options = {
    useNewDb: true,
    backup: true
  };
  
  for (const arg of args) {
    if (arg === '--old') {
      options.useNewDb = false;
    } else if (arg === '--new') {
      options.useNewDb = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--restore') {
      options.restore = true;
    } else if (arg === '--help') {
      console.log(`
Usage: node update_connection.js [options]

Options:
  --new          Use the new database (default)
  --old          Use the old database
  --no-backup    Don't create a backup of the .env file
  --restore      Restore the .env file from backup
  --help         Show this help message
      `);
      process.exit(0);
    }
  }
  
  return options;
}

// Main function
function main() {
  const options = parseArgs();
  
  if (options.restore) {
    // Restore the .env file from backup
    if (restoreEnvFile()) {
      console.log('Successfully restored .env file from backup');
    } else {
      console.error('Failed to restore .env file from backup');
      process.exit(1);
    }
    return;
  }
  
  if (options.backup) {
    // Create a backup of the .env file
    if (!backupEnvFile()) {
      console.error('Failed to create backup of .env file');
      process.exit(1);
    }
  }
  
  // Update the .env file
  if (updateEnvFile(options.useNewDb)) {
    console.log(`Successfully updated .env file to use ${options.useNewDb ? 'new' : 'old'} database`);
  } else {
    console.error(`Failed to update .env file to use ${options.useNewDb ? 'new' : 'old'} database`);
    process.exit(1);
  }
}

// Run the main function
main();

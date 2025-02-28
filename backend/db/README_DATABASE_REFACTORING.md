# Database Refactoring Guide

This guide explains the database refactoring process and how to use the scripts provided to migrate from the old database structure to the new one.

## Overview

The database refactoring addresses several issues with the current database:

1. **Data Duplication**: Eliminated duplicate data across tables
2. **Missing Activity Tracking**: Added comprehensive activity tracking system
3. **Inconsistent Naming Conventions**: Standardized naming conventions
4. **Missing Personal Information**: Added support for more user information

## New Database Structure

The new database structure includes:

- Improved user tables with support for personal information and addresses
- Consolidated user statistics in a single table
- Comprehensive activity tracking system
- Standardized naming conventions
- Better relationship handling

## Scripts

The following scripts are provided to help with the migration:

### 1. `new_schema.sql`

This file contains the complete SQL schema for the new database. It defines all tables, indexes, triggers, and default data.

### 2. `apply_new_schema.js`

This script creates the new database and applies the schema. It:

- Creates the `rumfornew2` database if it doesn't exist
- Creates the `rumfornew2` user with the password `Oswald1986!`
- Grants necessary privileges
- Applies the schema from `new_schema.sql`

Usage:

For Windows PowerShell:
```powershell
node .\backend\db\apply_new_schema.js
```

For Bash/Linux:
```bash
node backend/db/apply_new_schema.js
```

### 3. `migrate_data.js`

This script migrates data from the old database to the new one. It:

- Connects to both the old and new databases
- Reads data from the old database tables
- Transforms the data to fit the new schema
- Inserts the transformed data into the new database tables

### 3a. `generate_sample_data.js`

This script generates sample data for the new database. It:

- Connects to the new database
- Generates sample users, communities, posts, comments, and activities
- Inserts the sample data into the new database tables

This script is useful when you don't have an existing database to migrate from, or when you want to test the new database with sample data.

### 3b. `add_admin_user.js`

This script adds an admin user to the new database. It:

- Connects to the new database
- Creates an admin user with username 'admin' and password 'Oswald1986!'
- Sets up the necessary user statistics and settings for the admin user

This script is useful for quickly setting up an admin account to access the system.

Usage:

For Windows PowerShell:
```powershell
node .\backend\db\add_admin_user.js
```

For Bash/Linux:
```bash
node backend/db/add_admin_user.js
```

Usage:

For Windows PowerShell:
```powershell
node .\backend\db\migrate_data.js
```

For Bash/Linux:
```bash
node backend/db/migrate_data.js
```

### 4. `update_connection.js`

This script updates the application's database connection to use either the old or new database. It:

- Creates a backup of the original `.env` file
- Updates the database connection parameters in the `.env` file
- Provides options to switch between the old and new databases

Usage:

For Windows PowerShell:
```powershell
# Switch to the new database (default)
node .\backend\db\update_connection.js

# Switch to the old database
node .\backend\db\update_connection.js --old

# Restore the original .env file
node .\backend\db\update_connection.js --restore

# Show help
node .\backend\db\update_connection.js --help
```

For Bash/Linux:
```bash
# Switch to the new database (default)
node backend/db/update_connection.js

# Switch to the old database
node backend/db/update_connection.js --old

# Restore the original .env file
node backend/db/update_connection.js --restore

# Show help
node backend/db/update_connection.js --help
```

## Migration Process

Follow these steps to migrate to the new database:

1. **Backup your data**: Ensure you have a backup of your current database before proceeding.

2. **Create the new database and apply the schema**:
   
   For Windows PowerShell:
   ```powershell
   node .\backend\db\apply_new_schema.js
   ```
   
   For Bash/Linux:
   ```bash
   node backend/db/apply_new_schema.js
   ```

3. **Migrate the data from the old database to the new one**:
   
   For Windows PowerShell:
   ```powershell
   node .\backend\db\migrate_data.js
   ```
   
   For Bash/Linux:
   ```bash
   node backend/db/migrate_data.js
   ```

4. **Update the application to use the new database**:
   
   For Windows PowerShell:
   ```powershell
   node .\backend\db\update_connection.js
   ```
   
   For Bash/Linux:
   ```bash
   node backend/db/update_connection.js
   ```

5. **Test the application with the new database**:
   Start your application and verify that everything works as expected.

6. **If needed, switch back to the old database**:
   
   For Windows PowerShell:
   ```powershell
   node .\backend\db\update_connection.js --old
   ```
   
   For Bash/Linux:
   ```bash
   node backend/db/update_connection.js --old
   ```

## Key Improvements

### 1. User Data Structure

- Added support for first name, last name, date of birth, and secondary email
- Added support for user addresses
- Consolidated user statistics in a single table

### 2. Activity Tracking

- Added activity types and actions tables
- Added comprehensive activity tracking
- Automatic activity logging through triggers

### 3. Naming Conventions

- Standardized table names to singular form
- Consistent field naming across related tables
- Consistent use of snake_case for all field names

### 4. Relationships

- Improved handling of user relationships (friends, follows, blocks)
- Better community membership and moderation tracking
- Enhanced post and comment relationships

## Database Diagram

The new database structure follows this general organization:

```
User-related tables:
  - user
  - user_address
  - user_statistic
  - user_setting
  - user_relationship
  - user_achievement
  - user_flair

Community-related tables:
  - community
  - community_member
  - community_rule
  - community_setting
  - community_join_request
  - moderator_permission
  - banned_user

Content-related tables:
  - post
  - comment
  - vote
  - saved_item
  - post_moderation

Activity tracking:
  - activity_type
  - action
  - activity
  - moderation_log
```

## Troubleshooting

If you encounter issues during the migration process:

1. **Database connection errors**: Verify the connection parameters in the scripts match your environment.

2. **Permission issues**: Ensure the database user has the necessary privileges.

3. **Schema errors**: Check the MySQL error logs for details about any schema errors.

4. **Data migration errors**: The migration script will log errors for specific tables. You can modify the script to skip problematic tables or fix the data issues.

5. **Application errors**: If the application doesn't work with the new database, you can switch back to the old one using `update_connection.js --old` while you troubleshoot.

## Windows-Specific Notes

### Batch File for Windows Users

For Windows users, we've provided a batch file that makes it easier to run the migration scripts. You can run the batch file by double-clicking on it or by running it from PowerShell/Command Prompt:

```powershell
# From the project root
.\backend\db\migrate_database.bat

# Or navigate to the backend/db directory first
cd .\backend\db
.\migrate_database.bat
```

This will display a menu with options to:
1. Create new database and apply schema
2. Migrate data from old database to new database
3. Generate sample data for new database
4. Switch application to use new database
5. Switch application to use old database
6. Restore original .env file
7. Run complete migration with existing data (steps 1-2-4)
8. Run complete migration with sample data (steps 1-3-4)
9. Exit

Simply choose the option you want by entering the corresponding number.

### Additional Windows Notes

When running these scripts on Windows:

1. Make sure you're using the correct path separator (`\` instead of `/`) when running commands in PowerShell or Command Prompt.

2. If you encounter permission issues, you might need to run PowerShell as Administrator.

3. If you have issues with MySQL connections, ensure that the MySQL service is running:
   ```powershell
   # Check MySQL service status
   Get-Service MySQL*
   
   # Start MySQL service if it's not running
   Start-Service MySQL*
   ```

4. For database root access, you might need to specify the password in the scripts if your MySQL installation requires it.

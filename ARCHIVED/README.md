# ARCHIVED Files

This directory contains files that were part of the original codebase but are no longer in use after the database refactoring.

## Purpose

These files are kept for reference purposes only and **should not be used or imported** in the active codebase. They represent the pre-refactoring state of the application and may contain references to the old database schema.

## Directory Structure

The directory structure mirrors the main project structure to make it easier to locate the original versions of files:

```
/ARCHIVED/
  /backend/
    /api/       # Backend API files
    /db/        # Database-related files
    /routes/    # Express route handlers
    /middleware/# Express middleware
  /src/
    /api/       # Frontend API client files
    /components/# React components
    /pages/     # React page components
    /context/   # React context providers
```

## When to Reference These Files

You might need to reference these files when:
- Debugging issues related to the database refactoring
- Understanding the original data flow
- Recovering functionality that was accidentally lost during refactoring

However, any code copied from these files should be adapted to work with the new database schema.

## Archiving Date

These files were archived on February 26, 2025 as part of the database refactoring project.

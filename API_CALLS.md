# API Call Guidelines

This document outlines the correct method for making API calls in the frontend, and highlights incorrect methods to avoid.

## Correct Method: `getApiPath`

Always use the `getApiPath` function from `src/api/apiUtils.ts` to construct API paths. This ensures that:

1.  All API paths are relative, which is crucial for deployment.
2.  The `/api` prefix is automatically added if it's missing.

**Example (Correct):**

```typescript
import { getApiPath } from './api/apiUtils';

async function fetchData() {
  const response = await fetch(getApiPath('/my-endpoint')); // Correct: Results in /api/my-endpoint
  // ...
}

async function fetchDataFromAnotherEndpoint() {
    const response = await fetch(getApiPath('/api/my-other-endpoint')); // Correct, even with /api already present: Results in /api/my-other-endpoint
}
```

## Incorrect Methods (To Avoid)

1.  **Hardcoding `API_BASE_URL`:** Do *not* use `import.meta.env.VITE_API_BASE_URL` directly, or any other hardcoded base URL. This will cause problems in deployment.

    **Example (Incorrect):**

    ```typescript
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    async function fetchData() {
      const response = await fetch(`${API_BASE_URL}/api/my-endpoint`); // INCORRECT
      // ...
    }
    ```

2.  **Using absolute URLs:** Do not use absolute URLs (e.g., `http://localhost:3001/api/my-endpoint`) for API calls.

    **Example (Incorrect):**

    ```typescript
    async function fetchData() {
      const response = await fetch('http://localhost:3001/api/my-endpoint'); // INCORRECT
      // ...
    }
    ```
3. **Not using `getApiPath` at all:** Always use the helper function.

    **Example (Incorrect):**
    ```typescript
     async function fetchData() {
        const response = await fetch('/api/my-endpoint'); // INCORRECT - could be missing /api in some cases, and is less explicit
     }
    ```

By consistently using `getApiPath`, you ensure that your API calls will work correctly in both development and production environments.
# Development Change Log

This file tracks temporary changes made to the codebase to facilitate development. These items should be addressed before deploying to a production environment.

## Postponed Tasks

### 1. Revert Hardcoded Authentication

- **File Affected**: `src/store/authStore.ts`
- **Change**: The authentication store has been hardcoded to always simulate a logged-in admin user.
- **Action Required**: Remove the hardcoded mock data and re-enable the original Supabase authentication logic for `login`, `logout`, and `checkAuth` functions.

### 2. Finalize Database Setup

- **Context**: We encountered issues setting up the local Supabase database and creating an admin user via the `seed.sql` file.
- **Action Required**: Choose one of the following paths:
    - **Local Database**: Resolve the Docker/network issues to successfully run `npx supabase db reset` and seed the local database with the admin user.
    - **Live Database**: Manually create the admin user in your production Supabase project via the dashboard as previously discussed.

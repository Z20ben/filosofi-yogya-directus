-- Fix Administrator Role via Database
-- Run this SQL directly in PostgreSQL

-- Update Administrator role to have admin access
UPDATE directus_roles
SET
  admin_access = true,
  app_access = true
WHERE name = 'Administrator' OR id = 'a9005e30-4f11-40a2-994d-09b923c023a7';

-- Verify the change
SELECT id, name, admin_access, app_access FROM directus_roles;

-- Note: After running this, restart Directus server

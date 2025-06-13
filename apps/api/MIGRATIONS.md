# 🗄️ Database Migrations

This document explains how to use the APStat Park database migration system for version-controlled schema management.

## 📋 Overview

The migration system provides:

- **Version Control**: Track database schema changes over time
- **Reproducible Deployments**: Consistent schema across environments
- **Rollback Capability**: Safely undo schema changes
- **Team Collaboration**: Share schema changes through code

## 🚀 Getting Started

### Available Commands

```bash
# Create a new migration
npm run migrate:create <migration_name>

# Run pending migrations
npm run migrate:run

# Check migration status
npm run migrate:status

# Rollback the last migration
npm run migrate:rollback

# Reset database (⚠️ DANGEROUS - drops all data)
npm run migrate:reset
```

### Basic Workflow

1. **Create a Migration**:

   ```bash
   npm run migrate:create add_email_to_users
   ```

2. **Edit the Migration File**:

   ```typescript
   export const up = `
     ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
     CREATE INDEX idx_users_email ON users(email);
   `;

   export const down = `
     DROP INDEX IF EXISTS idx_users_email;
     ALTER TABLE users DROP COLUMN IF EXISTS email;
   `;
   ```

3. **Run the Migration**:
   ```bash
   npm run migrate:run
   ```

## 📁 Migration File Structure

Migration files follow the naming convention: `YYYYMMDDHHMMSS_description.ts`

Example: `20241211213000_create_users_table.ts`

```typescript
// Migration: create_users_table
// Created: 2025-06-11T21:30:00.000Z

export const up = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  CREATE INDEX idx_users_username ON users(username);
`;

export const down = `
  DROP INDEX IF EXISTS idx_users_username;
  DROP TABLE IF EXISTS users;
`;
```

## 📊 Current Schema

The initial migrations create these tables:

### 1. `users` (20241211213000)

- User accounts and authentication
- Indexes: `username`

### 2. `progress` (20241211213100)

- Student lesson progress tracking
- Foreign key: `user_id → users.id`
- Indexes: `user_id + lesson_id`, `lesson_completed`, `updated_at`

### 3. `bookmarks` (20241211213200)

- Student bookmarked content
- Foreign key: `user_id → users.id`
- Indexes: `user_id`, `lesson_id`, `bookmark_type`, `created_at`

### 4. `gold_stars` (20241211213300)

- Achievement and streak tracking
- Foreign key: `user_id → users.id` (unique)
- Indexes: `user_id`, leaderboard optimized, `updated_at`
- Constraints: positive values for stars/streaks

## 🛡️ Best Practices

### Writing Migrations

1. **Always write both up and down**:

   ```typescript
   export const up = `-- Forward migration`;
   export const down = `-- Rollback migration`;
   ```

2. **Use IF EXISTS/IF NOT EXISTS**:

   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   DROP INDEX IF EXISTS idx_my_index;
   ```

3. **Order matters for dependencies**:

   ```sql
   -- Drop indexes before dropping tables
   DROP INDEX IF EXISTS idx_users_email;
   DROP TABLE IF EXISTS users;
   ```

4. **Add indexes for performance**:
   ```sql
   CREATE INDEX idx_table_column ON table_name(column_name);
   ```

### Rollback Safety

- Test rollbacks in development first
- Use transactions (automatically handled)
- Backup data before major schema changes
- Consider data migration scripts for complex changes

### Naming Conventions

- Use descriptive names: `add_email_to_users` not `update_users`
- Use snake_case: `create_user_profiles`
- Be specific: `add_index_users_email` not `add_index`

## 🔧 Advanced Usage

### Custom Migration Scripts

For complex data migrations, you can create TypeScript functions:

```typescript
export const up = `
  -- Create new column
  ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
  
  -- Custom data migration would go here
  -- (Consider writing a separate script for complex data transforms)
`;
```

### Environment Variables

Configure database connection:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/apstat_park
NODE_ENV=development  # affects SSL settings
```

### Integration with Application

Migrations run automatically on application startup:

```typescript
// In src/index.ts
await initializeDatabase(); // Runs pending migrations
```

## 🚨 Troubleshooting

### Migration Fails

1. Check database connectivity
2. Verify SQL syntax in migration
3. Check for naming conflicts
4. Review application logs

### Rollback Issues

1. Ensure down migration is correct
2. Check for data dependencies
3. Verify foreign key constraints

### Schema Drift

1. Always use migrations for schema changes
2. Never modify database directly in production
3. Keep migrations in version control

## 📈 Monitoring

The migration system integrates with Winston logging:

```
INFO: Running database migrations...
INFO: Running migration: 20241211213000_create_users_table
INFO: Migration completed: 20241211213000_create_users_table
INFO: Database migrations completed successfully
```

## 🎯 Production Deployment

1. **Test migrations** in staging environment
2. **Backup database** before production deployment
3. **Run migrations** as part of deployment pipeline
4. **Monitor logs** for migration success/failure
5. **Have rollback plan** ready

---

**🔒 Security Note**: Never include sensitive data in migration files. Use environment variables for credentials and connection strings.

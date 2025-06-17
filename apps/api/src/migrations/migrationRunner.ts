import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { appLogger } from "../logger";

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  appliedAt?: Date;
}

export interface MigrationFile {
  timestamp: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationRunner {
  constructor(private pool: Pool) {}

  /**
   * Initialize the migrations table to track applied migrations
   */
  async initializeMigrationsTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(255) UNIQUE NOT NULL,
          migration_name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64)
        );
      `);

      // Create index for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_id 
        ON schema_migrations(migration_id);
      `);

      appLogger.info("Schema migrations table initialized");
    } catch (error) {
      appLogger.error(
        "Failed to initialize migrations table",
        { error },
        error instanceof Error ? error : undefined,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all applied migrations from the database
   */
  async getAppliedMigrations(): Promise<Migration[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT migration_id as id, migration_name as name, applied_at
        FROM schema_migrations 
        ORDER BY migration_id ASC
      `);

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        up: "",
        down: "",
        appliedAt: row.applied_at,
      }));
    } catch (error) {
      appLogger.error(
        "Failed to get applied migrations",
        { error },
        error instanceof Error ? error : undefined,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all available migration files from the migrations directory
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, ".");
    const migrations: Migration[] = [];

    try {
      const files = fs
        .readdirSync(migrationsDir)
        .filter(
          (file) =>
            file.match(/^\d{14}_.*\.ts$/) && file !== "migrationRunner.ts",
        )
        .sort();

      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const migration = await this.loadMigrationFile(filePath);
        if (migration) {
          migrations.push(migration);
        }
      }

      return migrations;
    } catch (error) {
      appLogger.error(
        "Failed to load migration files",
        { error },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Load a single migration file
   */
  private async loadMigrationFile(filePath: string): Promise<Migration | null> {
    try {
      const fileName = path.basename(filePath, ".ts");
      const [timestamp, ...nameParts] = fileName.split("_");
      const name = nameParts.join("_");

      // Read the file content
      const content = fs.readFileSync(filePath, "utf-8");

      // Extract up and down SQL from the file
      const upMatch = content.match(/export const up = `([\s\S]*?)`;/);
      const downMatch = content.match(/export const down = `([\s\S]*?)`;/);

      if (!upMatch || !downMatch) {
        appLogger.warn("Migration file missing up/down exports", { filePath });
        return null;
      }

      return {
        id: timestamp,
        name,
        up: upMatch[1].trim(),
        down: downMatch[1].trim(),
      };
    } catch (error) {
      appLogger.error(
        "Failed to load migration file",
        { filePath, error },
        error instanceof Error ? error : undefined,
      );
      return null;
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.initializeMigrationsTable();

    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.getAvailableMigrations();

    const appliedIds = new Set(appliedMigrations.map((m) => m.id));
    const pendingMigrations = availableMigrations.filter(
      (m) => !appliedIds.has(m.id),
    );

    if (pendingMigrations.length === 0) {
      appLogger.info("No pending migrations to run");
      return;
    }

    appLogger.info(`Running ${pendingMigrations.length} pending migrations`, {
      migrations: pendingMigrations.map((m) => `${m.id}_${m.name}`),
    });

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    appLogger.info("All migrations completed successfully");
  }

  /**
   * Run a single migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      appLogger.info(`Running migration: ${migration.id}_${migration.name}`);

      // Execute the migration SQL
      await client.query(migration.up);

      // Record the migration as applied
      await client.query(
        `
        INSERT INTO schema_migrations (migration_id, migration_name)
        VALUES ($1, $2)
      `,
        [migration.id, migration.name],
      );

      await client.query("COMMIT");

      appLogger.info(`Migration completed: ${migration.id}_${migration.name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      appLogger.error(
        `Migration failed: ${migration.id}_${migration.name}`,
        { error },
        error instanceof Error ? error : undefined,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      appLogger.info("No migrations to rollback");
      return;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const migrationFile = await this.getAvailableMigrations();
    const migration = migrationFile.find((m) => m.id === lastMigration.id);

    if (!migration) {
      throw new Error(
        `Migration file not found for ${lastMigration.id}_${lastMigration.name}`,
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      appLogger.info(
        `Rolling back migration: ${migration.id}_${migration.name}`,
      );

      // Execute the rollback SQL
      await client.query(migration.down);

      // Remove the migration record
      await client.query(
        `
        DELETE FROM schema_migrations 
        WHERE migration_id = $1
      `,
        [migration.id],
      );

      await client.query("COMMIT");

      appLogger.info(
        `Migration rolled back: ${migration.id}_${migration.name}`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      appLogger.error(
        `Rollback failed: ${migration.id}_${migration.name}`,
        { error },
        error instanceof Error ? error : undefined,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    applied: Migration[];
    pending: Migration[];
  }> {
    await this.initializeMigrationsTable();

    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.getAvailableMigrations();

    const appliedIds = new Set(appliedMigrations.map((m) => m.id));
    const pendingMigrations = availableMigrations.filter(
      (m) => !appliedIds.has(m.id),
    );

    return {
      applied: appliedMigrations,
      pending: pendingMigrations,
    };
  }

  /**
   * Mark a migration as applied without running it
   */
  async markMigrationAsApplied(migrationId: string): Promise<void> {
    await this.initializeMigrationsTable();

    const availableMigrations = await this.getAvailableMigrations();
    const migration = availableMigrations.find((m) => m.id === migrationId);

    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO schema_migrations (migration_id, migration_name)
        VALUES ($1, $2)
        ON CONFLICT (migration_id) DO NOTHING
      `,
        [migration.id, migration.name],
      );

      appLogger.info(`Marked migration as applied: ${migration.id}_${migration.name}`);
    } finally {
      client.release();
    }
  }
}

export default MigrationRunner;

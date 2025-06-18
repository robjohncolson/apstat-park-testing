import type { Knex } from "knex";
import "dotenv/config";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./src/seeds",
    },
  },

  test: {
    client: "postgresql",
    connection: {
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: false,
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./src/seeds",
    },
  },

  production: {
    client: "postgresql",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    },
    migrations: {
      directory: "./dist/src/migrations",
      tableName: "knex_migrations",
      loadExtensions: [".js"],
    },
    seeds: {
      directory: "./dist/src/seeds",
      loadExtensions: [".js"],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config; 
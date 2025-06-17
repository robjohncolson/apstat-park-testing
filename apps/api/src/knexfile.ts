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
      directory: "./migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  test: {
    client: "postgresql",
    connection: {
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: false,
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  production: {
    client: "postgresql",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    },
    migrations: {
      directory: "./migrations", // Points to compiled JS files
      tableName: "knex_migrations",
      // 👇 This line fixes the warnings about missing up/down exports
      loadExtensions: [".js"], 
    },
    seeds: {
      directory: "./seeds",
      loadExtensions: [".js"],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config; 
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_pace", (table) => {
    table.increments("id").primary();
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE").notNullable();
    table.timestamp("current_deadline").nullable();
    table.decimal("buffer_hours", 10, 2).defaultTo(0);
    table.timestamp("last_lesson_completion").nullable();
    table.decimal("last_completed_lessons", 8, 2).defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    
    // Add unique constraint on user_id (one pace record per user)
    table.unique(["user_id"]);
    
    // Add indexes for performance
    table.index(["user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("user_pace");
} 
import { knex, Knex } from 'knex';
import 'dotenv/config';
import knexConfig from '../knexfile';

// Determine the correct environment ('production', 'development', etc.)
const environment = process.env.NODE_ENV || 'development';

// Select the configuration for the current environment
const config = knexConfig[environment];

// Initialize Knex with the configuration from the file
const knexInstance: Knex = knex(config);

export default knexInstance; 
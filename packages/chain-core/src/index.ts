/**
 * APStat Chain Core Package
 * 
 * Main entry point for the @apstatchain/core package.
 * This file exports all the core functionality of the blockchain.
 */

// Export all types
export * from './types';

// Export cryptographic utilities
export * from './crypto';

// Export database operations
export * from './database';

// Export validation functions
export * from './validation';

// Export consensus mechanism
export * from './consensus';

// Export QuizBank functionality
export * from './QuizBank';

// Package version
export const VERSION = '0.1.0'; 
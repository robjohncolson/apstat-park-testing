# @apstatchain/core

Core blockchain components for the APStat Park learning platform.

## Overview

This package provides the foundational blockchain infrastructure for managing quiz data, progress tracking, and educational content validation in the APStat Park ecosystem.

## Features

- **Cryptographic Utilities**: SHA256 hashing and digital signatures using noble cryptography libraries
- **Local Storage**: IndexedDB wrapper using Dexie for blockchain data persistence
- **Validation System**: Transaction and block validation mechanisms
- **Consensus Protocol**: Educational blockchain consensus implementation
- **Quiz Bank Management**: Specialized data structures for educational content

## Installation

From the project root:

```bash
npm install --workspace=packages/chain-core
```

## Development

### Build

```bash
npm run build --workspace=packages/chain-core
```

### Watch Mode

```bash
npm run dev --workspace=packages/chain-core
```

### Linting

```bash
npm run lint --workspace=packages/chain-core
```

## Dependencies

- **dexie**: IndexedDB wrapper for local blockchain storage
- **@noble/hashes**: Cryptographic hashing functions
- **@noble/secp256k1**: Digital signature implementation

## Architecture

```
src/
├── types.ts        # Core TypeScript interfaces and types
├── crypto.ts       # Cryptographic utilities (hashing, signing)
├── database.ts     # IndexedDB operations using Dexie
├── validation.ts   # Transaction and block validation
├── consensus.ts    # Consensus mechanism implementation
├── QuizBank.ts     # Quiz data management
└── index.ts        # Main package exports
```

## Usage

```typescript
import { 
  // Types
  Block, Transaction, Quiz,
  
  // Crypto utilities
  sha256, verifySignature,
  
  // Database operations
  ChainDatabase,
  
  // Validation
  validateTransaction, validateBlock,
  
  // Consensus
  ConsensusEngine,
  
  // Quiz management
  QuizBank
} from '@apstatchain/core';

// Example usage will be added as implementation progresses
```

## Development Status

🚧 **Phase 1.1 Complete**: Package scaffolding and dependency setup
- ✅ Workspace configuration
- ✅ Package structure created
- ✅ Dependencies installed
- ✅ TypeScript configuration
- ✅ Build system working

🔄 **Next Phase**: Core type definitions and interfaces

## License

MIT 
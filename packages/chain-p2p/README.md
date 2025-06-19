# @apstatchain/p2p

Peer-to-peer networking package for APStat Chain.

## Overview

This package provides P2P networking capabilities using WebRTC for the APStat Chain learning platform.

## Structure

- `src/protocol.ts` - P2P protocol implementation
- `src/bootstrap.ts` - Network bootstrap functionality  
- `src/node.ts` - P2P node implementation
- `src/index.ts` - Main package exports

## Dependencies

- **@apstatchain/core** - Local workspace dependency for core blockchain types and functions
- **peerjs** - WebRTC peer-to-peer connections library

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode compilation
- `npm run test` - Run tests

## Development

This package is part of the APStat Park monorepo and can import types and functions from `@apstatchain/core` without issues. 
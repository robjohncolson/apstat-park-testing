/**
 * Cryptographic utilities for the APStat Chain
 * 
 * This module provides a simple, reliable, and testable wrapper for all
 * cryptographic operations using noble-hashes and noble-secp256k1 libraries.
 */

import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import * as secp256k1 from '@noble/secp256k1';
import type { KeyPair } from './types.js';

// Set up HMAC for noble-secp256k1 (required for signing operations)
secp256k1.etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) => {
  // Combine all messages into one buffer
  const totalLength = messages.reduce((sum, msg) => sum + msg.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const msg of messages) {
    combined.set(msg, offset);
    offset += msg.length;
  }
  
  // Return HMAC-SHA256 of the combined messages
  return hmac(sha256, key, combined);
};

/**
 * Generate a new cryptographic key pair
 * @returns {KeyPair} An object containing the public and private keys as hex strings
 */
export function generateKeyPair(): KeyPair {
  // Generate a random private key (32 bytes)
  const privateKey = secp256k1.utils.randomPrivateKey();
  
  // Derive the public key from the private key
  const publicKey = secp256k1.getPublicKey(privateKey);
  
  return {
    publicKey: bytesToHex(publicKey),
    privateKey: bytesToHex(privateKey)
  };
}

/**
 * Hash data using SHA-256
 * @param {any} data - The data to hash (will be JSON stringified)
 * @returns {string} The hash as a hex string
 */
export function hash(data: any): string {
  // Convert data to string and then to bytes
  const dataString = JSON.stringify(data);
  const dataBytes = new TextEncoder().encode(dataString);
  
  // Hash the data
  const hashBytes = sha256(dataBytes);
  
  return bytesToHex(hashBytes);
}

/**
 * Sign data with a private key
 * @param {any} data - The data to sign (will be JSON stringified and hashed)
 * @param {string} privateKey - The private key as a hex string
 * @returns {string} The signature as a hex string
 */
export function sign(data: any, privateKey: string): string {
  // First hash the data
  const dataHash = hash(data);
  
  // Convert the hash and private key to bytes
  const hashBytes = hexToBytes(dataHash);
  const privateKeyBytes = hexToBytes(privateKey);
  
  // Sign the hash
  const signature = secp256k1.sign(hashBytes, privateKeyBytes);
  
  return signature.toCompactHex();
}

/**
 * Verify a signature against data and a public key
 * @param {string} signature - The signature as a hex string
 * @param {any} data - The original data that was signed
 * @param {string} publicKey - The public key as a hex string
 * @returns {boolean} True if the signature is valid, false otherwise
 */
export function verify(signature: string, data: any, publicKey: string): boolean {
  try {
    // Hash the data (same as in sign function)
    const dataHash = hash(data);
    
    // Convert inputs to bytes
    const hashBytes = hexToBytes(dataHash);
    const publicKeyBytes = hexToBytes(publicKey);
    
    // Create signature object from hex string
    const sig = secp256k1.Signature.fromCompact(signature);
    
    // Verify the signature
    return secp256k1.verify(sig, hashBytes, publicKeyBytes);
  } catch (error) {
    // If any error occurs during verification, return false
    return false;
  }
} 
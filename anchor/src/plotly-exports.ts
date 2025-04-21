// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import FarmIDL from '../target/idl/farm.json'
import type { Farm } from '../target/types/farm'

// Re-export the generated IDL and type
export { Farm, FarmIDL }

// The programId is imported from the program IDL.
export const BASIC_PROGRAM_ID = new PublicKey(FarmIDL.address)

// This is a helper function to get the Basic Anchor program.
export function getBasicProgram(provider: AnchorProvider) {
  return new Program(FarmIDL as Farm, provider)
}

// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import FarmIDL from '../target/idl/farm.json'
import type { Farm } from '../target/types/farm'

// Re-export the generated IDL and type
export { Farm, FarmIDL }

// The programId is imported from the program IDL.
export const PLOTLY_PROGRAM_ID = new PublicKey(FarmIDL.address)

// This is a helper function to get the Basic Anchor program.
export function getFarmProgram(provider: AnchorProvider): Program<Farm> {
  return new Program(FarmIDL as Farm, provider)
}

export function toLeBytes(value: number, byteLength = 4, signed = false) {
  const buffer = Buffer.alloc(byteLength)

  let newVal: any = value

  switch (byteLength) {
    case 1:
      buffer.writeUInt8(value, 0)
      break
    case 2:
      if (signed) {
        buffer.writeInt16LE(value, 0)
      } else {
        buffer.writeUInt16LE(value, 0)
      }
      break
    case 4:
      if (signed) {
        buffer.writeInt32LE(value, 0)
      } else {
        buffer.writeUInt32LE(value, 0)
      }
      break
    case 8:
      if (typeof value !== 'bigint') {
        newVal = BigInt(value)
      }

      if (signed) {
        buffer.writeBigInt64LE(newVal, 0)
      } else {
        buffer.writeBigUInt64LE(newVal, 0)
      }

      // JS doesn't support 64-bit integers natively in all versions, so use BigInt
      break
    default:
      throw new Error('Unsupported byte length')
  }

  return buffer
}

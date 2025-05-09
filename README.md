# Plotly

Plotly is an all-on-blockchain game. The UI is a helper to make the game more entertaining and avoid writing transactions yourself. There also an extra [Plotly-indexer](https://github.com/jsonDoge/plotly-indexer) which follows events to help provide further information. The idea is that the user is always control and game is transparent/decentralized.

Plotly as a game provides a gamified tokens emission implementation. Where a limit amount of plots (1M), can be used to "unwrap" seed tokens created by token issuers. The plants (after seeding) impact surrounding plots by draining resources. 

## Plotly entities
- Plot -> NFT token (1M plots in total fixed)
- Seed -> SPL token (Can be minted by anyone, by wrapping an amount of SPL program tokens)
- Recipe -> Custom account (Can be created by anyone, by defining INPUT 2x SPL tokens -> OUPUT 1x SPL tokens and depositing the OUTPUT tokens).
- Offer -> Custom account (Allows selling seeds for a fixed price, defined by user and fixed currency defined by Plotly - USDC).
- Plant -> Custom account (Plotly generates a plant each time a farmer deposits a plot and a seed)


Default Plotly grow flow:
  - Token issuer/owner => creates **Seeds** by submitting owned tokens to Plotly with **Seed** parameters.
  - Token issuer/owner => Uses any DEX or Plotly simplified **Offer** flow to distribute **Seeds**.
  - Farmer buys at least 1 **Plot** 
  - Farmer buys at least 1 **Seed**.  <- Cycle repeats here
  - Farmers submit 1x **Plot** NFT and 1x **Seed** SPL token to Plotly => Plotly creates a **Plant** which starts immediately growing 
  - Farmer waits for the **Plant** to absorb enough resources from the deposited **Plot**
  - Farmer can now harvest the **Plant**, which emits tokens wrapped by token issuer when **Seed** was minted and token issuer gets the absorbed resources.
  - Cycle repeats ->


Gotchas:
 - **Plots** have 2 types of resources - Water and Balance. **Plants** need both to grow. Water can be "stolen" by surrounding plants, while Balance cannot. Water regenerates at a fixed rate, but Balance is only deposited by the owner.
 - If **Plots** balance falls below Free Rent value (1 USDC token  -> 1,000,000), Plotly start to drain the balance.
 - If **Plots** balance falls below 10% of Free Rent value (0.1 USDC token -> 100,000), anyone can "revoke" **Plot** ownership, transfering it to Plotly. And for that the revoker gets the remaining **Plot** balance.
 - **Plot** can always be manually returned to Plotly by the owner. Plotly will transfer all **Plot** balance back to the owner.
 - If during harvesting **Plot** has less than Free Rent balance, it's not transfered to the owner. But he will still be the owner and before mentioned rules apply. The owner can regain the NFT if he deposits enough balance to cross Free Rent.

## Plotly game view
![image](https://github.com/user-attachments/assets/1ed9cec0-4ce1-46ec-9c8b-667ece986d15)


## Upcoming chanllenges

By using solana account storage extensively it makes the game quite expensive, especially initially. The goal is to investigate smarter storage solution without sacrificing decentralization. The game should be functional even without UI or external services.

Things than can be tested:
  - Custom storage/compression mechanism (store multiple plot information in one account using compression).
  - Implement a "chain-within-a-chain". The total state of the game has a fixed sized, due to the fixed MAX plot number (Ignoring Seeds/Recipes/Offers). Means we could try crafting a generates + seed, to generate the whole state. And find a way to submit verifiable transitions.
  
## Current entity state

Everything is an account/token:

- Seed = SPL token
- Plot = NFT (SPL token)
- Offers/Recipes/Plant = Custom Accounts (non-transferable)

## Getting Started

### Prerequisites

- Node v22.12.0 or higher
- Rust v1.79.0 or higher
- Anchor CLI 0.31.0 or higher + proc-micro2 fix (defined.rs)
- Solana CLI 2.1.0 or higher 

### Installation

#### Install Dependencies

```shell
pnpm install
```

#### Start the web app

```
pnpm dev
```

## Apps

### anchor

This is a Solana program written in Rust using the Anchor framework.

#### Commands

You can use any normal anchor commands. Either move to the `anchor` directory and run the `anchor` command or prefix the command with `pnpm`, eg: `pnpm anchor`.

#### Sync the program id:

Running this command will create a new keypair in the `anchor/target/deploy` directory and save the address to the Anchor config file and update the `declare_id!` macro in the `./src/lib.rs` file of the program.

You will manually need to update the constant in `anchor/lib/basic-exports.ts` to match the new program id.

```shell
pnpm anchor keys sync
```

#### Build the program:

```shell
pnpm anchor-build
```

#### Start the test validator with the program deployed:

```shell
pnpm anchor-localnet
```

#### Run the tests

```shell
pnpm anchor-test
```

#### Deploy to Devnet

```shell
pnpm anchor deploy --provider.cluster devnet
```

### web

This is a React app that uses the Anchor generated client to interact with the Solana program.

#### Commands

Start the web app

```shell
pnpm dev
```

Build the web app

```shell
pnpm build
```

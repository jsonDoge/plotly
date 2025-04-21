// TODO: why not always use enum? and vice versa
export const CONTRACT_TYPE = {
  FARM: 'FARM',
  SEED_TOKEN: 'SEED_TOKEN', // Item and stable token
  PLOT: 'PLOT',
  DISH: 'DISH', // likely will be recipe instead
}

export const SEED_TYPE = {
  SPL_TOKEN: 'SPL_TOKEN', // could be more
} as const

// SeedType seems to require a separate type definition to be used in return types
export type SeedType = (typeof SEED_TYPE)[keyof typeof SEED_TYPE]

// later use for recipies
export const PRODUCT_TYPE = {
  ...SEED_TYPE,
}

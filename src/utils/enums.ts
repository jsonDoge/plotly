// eslint-disable-next-line import/prefer-default-export
export enum PlantState {
  GROWING = 'GROWING',
  NEEDS_TENDING = 'NEEDS_TENDING',
}

export enum PlotWaterState {
  GOOD = 'GOOD',
  HALF_DRY = 'HALF_DRY',
  DRY = 'DRY',
}

export enum PlotWaterRegenerationState {
  REGENERATING = 'REGENERATING',
  EQUALIBRIUM = 'EQUALIBRIUM',
  DRAINING = 'DRAINING',
}

export enum PlotBalanceState {
  ABOVE_FREE_RENT = 'ABOVE_FREE_RENT',
  BELOW_FREE_RENT = 'BELOW_FREE_RENT',
  CAN_BE_REVOKED = 'CAN_BE_REVOKED',
}

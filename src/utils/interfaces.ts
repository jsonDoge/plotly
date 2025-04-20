export interface Wallet {
  address: string;
  privateKey: string;
}

interface ContractPlant {
  type: string;
  state: string;
  owner: string;
}

export interface ContractPlot {
  plant?: ContractPlant;
  x: number;
  y: number;
  owner?: string;
}

export interface ContractPlotInfo {
  plant: ContractPlant;
  owner: string;
}

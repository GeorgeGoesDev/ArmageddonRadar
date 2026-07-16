export interface SentryRisk {
  designation: string;
  name: string;
  impactProb: number;
  palermoCum: number;
  torinoMax: number;
  estDiameterM: number;
  nImpacts: number;
  yearRange: string;
}

export interface SentryDetail {
  designation: string;
  name: string;
  impactProb: number;
  palermoCum: number;
  palermoMax: number;
  torinoMax: number;
  energyMt: number;
  estDiameterM: number;
  massKg: number;
  vInfKps: number;
  firstObs: string;
  lastObs: string;
  nImpacts: number;
}

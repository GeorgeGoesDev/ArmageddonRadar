export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  orbitalPeriodDays: number;
  perihelionAu: number;
  aphelionAu: number;
  orbitClassType: string;
  orbitClassDescription: string;
  firstObservation: string;
  lastObservation: string;
}

export interface ApproachEntry {
  epochMs: number;
  dateFull: string;
  missLunar: number;
  missKm: number;
  velocityKph: number;
  orbitingBody: string;
}

export interface NeoDetail {
  id: string;
  name: string;
  absoluteMagnitude: number;
  isHazardous: boolean;
  orbital: OrbitalElements;
  approaches: ApproachEntry[];
}

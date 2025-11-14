export type Base = "Bergen" | "Tromsø" | "Hammerfest";
export type Maskin = "LN-OXH" | "LN-OXI" | "LN-OXJ";

export interface CheckItem {
  key: string;
  label: string;
  checked: boolean;
}

export interface VaktReport {
  id: string;
  crew: string;
  ukeFra: string;
  ukeTil: string;
  maskin: Maskin;
  base: Base;
  operativ: string;
  annen: string;
  teknisk: string;
  checks: CheckItem[];
  datoSign: string;
  skrevetAv: string;
  createdAt: number;
}

export type DraftReport = Omit<VaktReport, "createdAt">;


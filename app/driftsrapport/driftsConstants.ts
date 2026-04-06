import type { Base } from "./page";

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const CAUSES = [
  "Tåke",
  "Lyn",
  "Sikt/Skydekke",
  "Vind",
  "Bølgehøyde",
  "Teknisk",
  "Annet",
] as const;

export type StatsBaseFilter = "Alle" | Base;

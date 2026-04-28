"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";

export const CAPTAINS = [
	  "AMU",
	  "GUN",
	  "FOL",
	  "LEI",
	  "HUS",
	  "BRÆ",
	  "LOO",
	  "TJA",
	  "TUR",
	  "MÆL",
	  "BAC",
	  "OHN",
	].sort((a, b) => a.localeCompare(b, "nb-NO"));

export const FIRST_OFFICERS = [
  "LUN",
  "KIR",
  "DAM",
  "HOL",
  "ØST",
  "HAN",
  "MYH",
  "SMÅ",
  "KON",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

const TECHNICIANS = [
	"MÆL",
	"KRO",
	"DYP",
	"STE",
	"FIK",
	"HØV",
	"ROT",
	"ADS",
	"FES",
	"HES",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

export type CrewPickerOption = { value: string; label: string };
export type CrewPickerOptionGroups = {
	captains: CrewPickerOption[];
	firstOfficers: CrewPickerOption[];
	technicians: CrewPickerOption[];
};

function toOptions(values: string[]): CrewPickerOption[] {
	return values.map((value) => ({ value, label: value }));
}

const DEFAULT_OPTION_GROUPS: CrewPickerOptionGroups = {
	captains: toOptions(CAPTAINS),
	firstOfficers: toOptions(FIRST_OFFICERS),
	technicians: toOptions(TECHNICIANS),
};

function parseCrew(initialCrew: string, options: CrewPickerOptionGroups) {
  const tokens = initialCrew
    .split(/[\/ ,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
	const captainValues = options.captains.map((option) => option.value);
	const firstOfficerValues = options.firstOfficers.map((option) => option.value);
	const technicianValues = options.technicians.map((option) => option.value);

  return {
    captains: tokens.filter((t) => captainValues.includes(t)),
    firstOfficers: tokens.filter((t) => firstOfficerValues.includes(t)),
    technicians: tokens.filter((t) => technicianValues.includes(t)),
  };
}

interface CrewPickerProps {
  initialCrew: string;
  onChangeCrew: (crew: string) => void;
  onClose: () => void;
	options?: CrewPickerOptionGroups;
}

export default function CrewPicker({
  initialCrew,
  onChangeCrew,
  onClose,
	options,
}: CrewPickerProps) {
  const optionGroups = useMemo(() => options ?? DEFAULT_OPTION_GROUPS, [options]);
  const [selectedCaptains, setSelectedCaptains] = useState<string[]>([]);
  const [selectedFirstOfficers, setSelectedFirstOfficers] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  useEffect(() => {
    const { captains, firstOfficers, technicians } = parseCrew(initialCrew, optionGroups);
    setSelectedCaptains(captains);
    setSelectedFirstOfficers(firstOfficers);
    setSelectedTechnicians(technicians);
  }, [initialCrew, optionGroups]);

  const handleDone = () => {
    const crewString = [
      ...[...selectedCaptains].sort((a, b) => a.localeCompare(b, "nb-NO")),
      ...[...selectedFirstOfficers].sort((a, b) => a.localeCompare(b, "nb-NO")),
      ...[...selectedTechnicians].sort((a, b) => a.localeCompare(b, "nb-NO")),
    ].join(" / ");

    onChangeCrew(crewString);
    onClose();
  };

  const handleReset = () => {
    setSelectedCaptains([]);
    setSelectedFirstOfficers([]);
    setSelectedTechnicians([]);
    onChangeCrew("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-2">Velg crew</h2>
        <p className="text-sm text-gray-700 mb-3">
          Velg kaptein(er), styrmann/styrmenn og tekniker(e). Kapteiner vises
          først, deretter styrmenn og teknikere.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Kapteiner</h3>
            <div className="space-y-2">
              {optionGroups.captains.map((option) => {
                const selected = selectedCaptains.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSelectedCaptains((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((x) => x !== option.value)
                          : [...prev, option.value]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Styrmenn</h3>
            <div className="space-y-2">
              {optionGroups.firstOfficers.map((option) => {
                const selected = selectedFirstOfficers.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSelectedFirstOfficers((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((x) => x !== option.value)
                          : [...prev, option.value]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Teknikere</h3>
            <div className="space-y-2">
              {optionGroups.technicians.map((option) => {
                const selected = selectedTechnicians.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSelectedTechnicians((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((x) => x !== option.value)
                          : [...prev, option.value]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-full border bg-white text-gray-900 text-sm"
          >
            Nullstill
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-4 py-1.5 rounded-full bg-black text-white text-sm"
          >
            Ferdig
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-full border bg-white text-gray-900 text-sm"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}


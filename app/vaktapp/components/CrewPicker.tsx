"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";

export const CAPTAINS = [
  "BFA",
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

function parseCrew(initialCrew: string) {
  const tokens = initialCrew
    .split(/[\/ ,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return {
    captains: tokens.filter((t) => CAPTAINS.includes(t)),
    firstOfficers: tokens.filter((t) => FIRST_OFFICERS.includes(t)),
    technicians: tokens.filter((t) => TECHNICIANS.includes(t)),
  };
}

interface CrewPickerProps {
  initialCrew: string;
  onChangeCrew: (crew: string) => void;
  onClose: () => void;
}

export default function CrewPicker({
  initialCrew,
  onChangeCrew,
  onClose,
}: CrewPickerProps) {
  const [selectedCaptains, setSelectedCaptains] = useState<string[]>([]);
  const [selectedFirstOfficers, setSelectedFirstOfficers] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  useEffect(() => {
    const { captains, firstOfficers, technicians } = parseCrew(initialCrew);
    setSelectedCaptains(captains);
    setSelectedFirstOfficers(firstOfficers);
    setSelectedTechnicians(technicians);
  }, [initialCrew]);

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
              {CAPTAINS.map((c) => {
                const selected = selectedCaptains.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setSelectedCaptains((prev) =>
                        prev.includes(c)
                          ? prev.filter((x) => x !== c)
                          : [...prev, c]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Styrmenn</h3>
            <div className="space-y-2">
              {FIRST_OFFICERS.map((c) => {
                const selected = selectedFirstOfficers.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setSelectedFirstOfficers((prev) =>
                        prev.includes(c)
                          ? prev.filter((x) => x !== c)
                          : [...prev, c]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Teknikere</h3>
            <div className="space-y-2">
              {TECHNICIANS.map((c) => {
                const selected = selectedTechnicians.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setSelectedTechnicians((prev) =>
                        prev.includes(c)
                          ? prev.filter((x) => x !== c)
                          : [...prev, c]
                      )
                    }
                    className={
                      "w-full text-left p-2 rounded-xl border text-sm " +
                      (selected
                        ? "bg-black text-white border-black"
                        : "bg-white hover:bg-gray-50")
                    }
                  >
                    {c}
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


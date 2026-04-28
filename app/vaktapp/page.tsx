"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import StepShell from "./components/StepShell";
import Section from "./components/Section";
import CrewPicker, { type CrewPickerOptionGroups } from "./components/CrewPicker";
import VaktReportArchive from "./components/VaktReportArchive";
import { DEFAULT_CREW_DIRECTORY, formatCrewDirectoryEntry, sortCrewDirectoryEntries, type CrewDirectoryEntry, type CrewRole } from "../../lib/crewDirectory";
import { DEFAULT_MASKIN, MASKINER } from "./types";

// ----- Typer -----
import type { Base, Maskin, CheckItem, VaktReport, DraftReport } from "./types";


// ----- Hjelpefunksjoner -----
const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getISOWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((+d - +yearStart + 1) / 86400000) / 7);
};

const defaultWeekRange = () => {
  const now = new Date();
  const thisWeek = getISOWeek(now);
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 7);
  const prevWeek = getISOWeek(prev);
  return {
    from: String(prevWeek),
    to: String(thisWeek),
  };
};

const getVaktrapportFileName = (base: Base, ukeFra: string, ukeTil: string) =>
	`Vaktrapport_${base}_${ukeFra}-${ukeTil}.pdf`;

const defaultChecks: CheckItem[] = [
  { key: "nvg", label: "NVG utstyr kontrollert", checked: false },
  { key: "efb", label: "EFB/Publikasjoner oppdatert", checked: false },
  {
    key: "flightman",
    label: "Avsluttet og godkjent ukas flight i Flightman",
    checked: false,
  },
  { key: "sengetoy", label: "Bestilt sengetøy Flesland", checked: false },
];

// Ny nøkkel for lokal lagring slik at gamle testdata i vaktrapport-arkivet ikke vises etter "go live"
const STORAGE_KEY = "vaktapp_reports_v2";

function loadReports(): VaktReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveReports(reports: VaktReport[]) {
	  if (typeof window === "undefined") return;
	  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
	}

function crewPickerOptionsByRole(entries: CrewDirectoryEntry[], role: CrewRole) {
	return entries
		.filter((entry) => entry.active && entry.role === role)
		.map((entry) => ({ value: entry.code, label: formatCrewDirectoryEntry(entry) || entry.code }));
}

function signerNamesFromDirectory(entries: CrewDirectoryEntry[]) {
	return Array.from(new Set(entries.filter((entry) => entry.active && entry.fullName.trim()).map((entry) => entry.fullName.trim()))).sort((a, b) => a.localeCompare(b, "nb-NO"));
}

// ----- UI-byggeklosser -----
// ----- Hovedkomponent (side) -----
export default function VaktAppPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);

  const [crew, setCrew] = useState("");
  const [ukeFra, setUkeFra] = useState(() => defaultWeekRange().from);
  const [ukeTil, setUkeTil] = useState(() => defaultWeekRange().to);
  const [maskin, setMaskin] = useState<Maskin>(DEFAULT_MASKIN);
  const [base, setBase] = useState<Base>("Bergen");
  const [operativ, setOperativ] = useState("");
  const [annen, setAnnen] = useState("");
  const [teknisk, setTeknisk] = useState("");
  const [checks, setChecks] = useState<CheckItem[]>(defaultChecks);
  const [datoSign, setDatoSign] = useState(todayISO());
  const [skrevetAv, setSkrevetAv] = useState("");

		  const [reports, setReports] = useState<VaktReport[]>(() => loadReports());
		  const [showArchive, setShowArchive] = useState(false);
		  const [showCrewPicker, setShowCrewPicker] = useState(false);
		  const [sendStatus, setSendStatus] = useState<null | "sending" | "success" | "error">(null);
		  const [viewReport, setViewReport] = useState<VaktReport | null>(null);
		  const [showSignerPicker, setShowSignerPicker] = useState(false);
		  const [signerMode, setSignerMode] = useState<"picker" | "manual">("picker");
		  const signerInputRef = useRef<HTMLInputElement | null>(null);
			  const [crewDirectory, setCrewDirectory] = useState<CrewDirectoryEntry[]>(() => sortCrewDirectoryEntries(DEFAULT_CREW_DIRECTORY));

			  const crewPickerOptions = useMemo<CrewPickerOptionGroups>(
			    () => ({
			      captains: crewPickerOptionsByRole(crewDirectory, "captain"),
			      firstOfficers: crewPickerOptionsByRole(crewDirectory, "firstOfficer"),
			      technicians: crewPickerOptionsByRole(crewDirectory, "technician"),
			    }),
			    [crewDirectory]
			  );

			  const signerNames = useMemo(() => signerNamesFromDirectory(crewDirectory), [crewDirectory]);

			  useEffect(() => {
			    let cancelled = false;
			    fetch("/api/crew-directory")
			      .then((res) => (res.ok ? res.json() : null))
			      .then((data: { ok?: boolean; entries?: CrewDirectoryEntry[] } | null) => {
			        if (cancelled || !data?.ok || !Array.isArray(data.entries)) return;
			        setCrewDirectory(sortCrewDirectoryEntries(data.entries));
			      })
			      .catch(() => {
			        // Fallback-listen over brukes hvis Firestore/API ikke er tilgjengelig.
			      });
			    return () => {
			      cancelled = true;
			    };
			  }, []);

		  useEffect(() => {
		    if (signerMode === "manual" && !showSignerPicker && signerInputRef.current) {
		      signerInputRef.current.focus();
		    }
		  }, [signerMode, showSignerPicker]);

  const openCrewPicker = () => {
    setShowCrewPicker(true);
  };

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return crew.trim().length > 0;
      case 1:
        return ukeFra.trim().length > 0 && ukeTil.trim().length > 0;
      case 2:
        return !!maskin;
      case 3:
        return !!base;
      case 8:
        return datoSign.trim().length > 0 && skrevetAv.trim().length > 0;
      default:
        return true;
    }
  }, [step, crew, ukeFra, ukeTil, maskin, base, datoSign, skrevetAv]);

	  const report: DraftReport = useMemo(
	    () => ({
	      id: crypto.randomUUID(),
	      crew,
	      ukeFra,
	      ukeTil,
	      maskin,
	      base,
	      operativ,
	      annen,
	      teknisk,
	      checks,
	      datoSign,
	      skrevetAv,
	    }),
	    [
	      crew,
	      ukeFra,
	      ukeTil,
	      maskin,
	      base,
	      operativ,
	      annen,
	      teknisk,
	      checks,
	      datoSign,
	      skrevetAv,
	    ]
	  );

  async function saveCurrent() {
    const newReport: VaktReport = {
      ...report,
      createdAt: Date.now(),
    };
    const next = [newReport, ...reports].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    setReports(next);
    saveReports(next);
  }

  async function handleSend() {
    setSendStatus("sending");

    await saveCurrent();

    const linjer = [
      `Crew: ${crew}`,
      `Uke: ${ukeFra}-${ukeTil}`,
      `Maskin i bruk: ${maskin}`,
      `Base: ${base}`,
      "",
      "Operativ informasjon:",
      operativ || "(tom)",
      "",
      "Annen informasjon:",
      annen || "(tom)",
      "",
      "Tekniske utfordringer:",
      teknisk || "(tom)",
      "",
      "Sjekkliste:",
      ...checks.map((c) => `- [${c.checked ? "x" : " "}] ${c.label}`),
      "",
      `Dato/Sign: ${datoSign}`,
      `Skrevet av: ${skrevetAv}`,
    ];

    const plainText = linjer.join("\n");
    const subject = `LOS-helikopter ${base} - vaktrapport ${datoSign}`;
	    const fileName = getVaktrapportFileName(base, ukeFra, ukeTil);
    const title = `Vaktrapport ${base} ${datoSign}`;
    const fromName = `LOS Helikopter ${base}`;

    try {
      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          body: plainText,
          fileName,
          title,
				fromName,
				base,
				reportType: "vaktrapport",
        }),
      });

      if (!response.ok) {
        setSendStatus("error");
        return;
      }

	      setSendStatus("success");
	      startNew();
		      // Etter vellykket sending går vi helt tilbake til hovedforsiden
		      // der du kan velge mellom vaktrapport og driftsforstyrrelse.
	      router.push("/");
    } catch {
      setSendStatus("error");
    }
  }

  function startNew() {
    setCrew("");
    const weekRange = defaultWeekRange();
    setUkeFra(weekRange.from);
    setUkeTil(weekRange.to);
    setMaskin(DEFAULT_MASKIN);
    setBase("Bergen");
    setOperativ("");
    setAnnen("");
    setTeknisk("");
    setChecks(defaultChecks.map((c) => ({ ...c, checked: false })));
    setDatoSign(todayISO());
    setSkrevetAv("");
    setStep(0);
  }

		function openExisting(r: VaktReport) {
			setViewReport(r);
	  }

	async function deleteReport(r: VaktReport) {
		// Sørg for at vi bruker helt samme filnavn som ved opplasting til SharePoint
		const fileName = getVaktrapportFileName(r.base, r.ukeFra, r.ukeTil);

		try {
			const res = await fetch("/api/send-report", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					base: r.base,
					datoSign: r.datoSign,
					fileName,
				}),
			});

			if (!res.ok) {
				// Hvis vi ikke klarer å slette i SharePoint, lar vi rapporten ligge i arkivet
				// slik at du kan prøve igjen senere.
				if (typeof window !== "undefined") {
					alert(
						"Klarte ikke å slette rapporten fra SharePoint. Den er ikke fjernet fra arkivet."
					);
				}
				return;
			}
		} catch (error) {
			console.error("Feil ved sletting av vaktrapport", error);
			if (typeof window !== "undefined") {
				alert(
					"Uventet feil ved sletting. Rapporten er ikke fjernet fra arkivet."
				);
			}
			return;
		}

		// Lokalt sletter vi kun hvis SharePoint-sletting gikk bra (eller filen allerede var borte)
		const next = reports.filter((report) => report.id !== r.id);
		setReports(next);
		saveReports(next);
	}

  function updateCheck(key: string, checked: boolean) {
    setChecks((prev) =>
      prev.map((c) => (c.key === key ? { ...c, checked } : c))
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b text-gray-900">
        <div className="mx-auto max-w-md p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-900"
            >
              Til forsiden
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Vaktrapport</h1>
              <Image
                src="/Airlift-logo.png"
                alt="Airlift-logo"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
            </div>
          </div>
          <button
            onClick={() => setShowArchive((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition
              ${showArchive ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300"}
            `}
          >
            {showArchive ? "Skjul arkiv" : "Arkiv"}
          </button>
        </div>
      </header>

      {!showArchive && (
        <main>
          {/* --- alle step --- */}

          {step === 0 && (
            <StepShell
              onNext={() => setStep(1)}
              canNext={canNext}
              belowButtons={
                <button
                  onClick={startNew}
                  className="w-full py-3 rounded-xl bg-gray-200 text-gray-900"
                >
                  Start ny vaktrapport
                </button>
              }
            >
              <Section title="Crew">
                <input
                  value={crew}
                  onChange={(e) => setCrew(e.target.value)}
                  onClick={openCrewPicker}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                  placeholder="Skriv crew eller trykk for å velge"
                />
                <p className="mt-2 text-xs text-gray-600">
                  Trykk i feltet for å velge kapteiner, styrmenn og teknikere fra listen.
                </p>
              </Section>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              onPrev={() => setStep(0)}
              onNext={() => setStep(2)}
              canNext={canNext}
            >
              <Section title="Dato – uke (fra og til)">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={ukeFra}
                    onChange={(e) => setUkeFra(e.target.value)}
                    className="flex-1 border rounded-xl p-3 text-base text-gray-900"
                  />
                  <input
                    value={ukeTil}
                    onChange={(e) => setUkeTil(e.target.value)}
                    className="flex-1 border rounded-xl p-3 text-base text-gray-900"
                  />
                </div>
              </Section>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell onPrev={() => setStep(1)} onNext={() => setStep(3)}>
              <Section title="Hvilken maskin i bruk?">
                <div className="grid grid-cols-1 gap-2">
                  {MASKINER.map((m) => (
                    <label
                      key={m}
                      className={`p-3 border rounded-xl flex items-center gap-3 ${
                        maskin === m ? "bg-gray-100" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="maskin"
                        checked={maskin === m}
                        onChange={() => setMaskin(m)}
                      />
                      <span className="text-base text-gray-900">{m}</span>
                    </label>
                  ))}
                </div>
              </Section>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell onPrev={() => setStep(2)} onNext={() => setStep(4)}>
              <Section title="Hvilken base?">
                <div className="grid grid-cols-1 gap-2">
                  {(["Bergen", "Tromsø", "Hammerfest"] as Base[]).map((b) => (
                    <label
                      key={b}
                      className={`p-3 border rounded-xl flex items-center gap-3 ${
                        base === b ? "bg-gray-100" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="base"
                        checked={base === b}
                        onChange={() => setBase(b)}
                      />
                      <span className="text-base text-gray-900">{b}</span>
                    </label>
                  ))}
                </div>
              </Section>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell onPrev={() => setStep(3)} onNext={() => setStep(5)}>
              <Section title="Operativ informasjon">
                <textarea
                  value={operativ}
                  onChange={(e) => setOperativ(e.target.value)}
                  rows={5}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
              </Section>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell onPrev={() => setStep(4)} onNext={() => setStep(6)}>
              <Section title="Annen informasjon">
                <textarea
                  value={annen}
                  onChange={(e) => setAnnen(e.target.value)}
                  rows={5}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
              </Section>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell onPrev={() => setStep(5)} onNext={() => setStep(7)}>
              <Section title="Tekniske utfordringer">
                <textarea
                  value={teknisk}
                  onChange={(e) => setTeknisk(e.target.value)}
                  rows={5}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
              </Section>
            </StepShell>
          )}

          {step === 7 && (
            <StepShell onPrev={() => setStep(6)} onNext={() => setStep(8)}>
              <Section title="Avkryssing (huke av det som gjelder)">
                <div className="space-y-2">
                  {checks.map((c) => (
                    <label
                      key={c.key}
                      className="p-3 border rounded-xl flex items-center gap-3 text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={(e) =>
                          updateCheck(c.key, e.target.checked)
                        }
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </Section>
            </StepShell>
          )}

          {step === 8 && (
            <StepShell
              onPrev={() => setStep(7)}
              onNext={() => setStep(9)}
              canNext={canNext}
            >
              <Section title="Dato/Sign og skrevet av">
                <input
                  value={datoSign}
                  onChange={(e) => setDatoSign(e.target.value)}
                  type="date"
                  className="w-full border rounded-xl p-3 mb-2 text-base text-gray-900"
                />
		            <input
		              ref={signerInputRef}
		              value={skrevetAv}
		              readOnly={signerMode !== "manual"}
		              onClick={() => {
		                if (signerMode === "picker") {
		                  setShowSignerPicker(true);
		                }
		              }}
		              className="w-full border rounded-xl p-3 text-base text-gray-900"
		              placeholder="Velg eller skriv inn navn"
		            />
              </Section>
            </StepShell>
          )}

          {step === 9 && (
            <div className="mx-auto w-full max-w-md p-4">
              <div className="bg-white rounded-2xl shadow p-4">
                <h2 className="text-lg font-semibold mb-2">
                  Se over før sending
                </h2>
                <div className="text-sm space-y-2">
                  <div>
                    <b>Crew:</b> {crew}
                  </div>
                  <div>
                    <b>Uke:</b> {ukeFra} – {ukeTil}
                  </div>
                  <div>
                    <b>Maskin:</b> {maskin}
                  </div>
                  <div>
                    <b>Base:</b> {base}
                  </div>

                  <div>
                    <b>Operativ informasjon:</b>
                    <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                      {operativ || "—"}
                    </div>
                  </div>

                  <div>
                    <b>Annen informasjon:</b>
                    <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                      {annen || "—"}
                    </div>
                  </div>

                  <div>
                    <b>Tekniske utfordringer:</b>
                    <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                      {teknisk || "—"}
                    </div>
                  </div>

                  <div>
                    <b>Sjekkliste:</b>
                    <ul className="list-disc ml-5">
                      {checks.map((c) => (
                        <li key={c.key}>[{c.checked ? "x" : " "}] {c.label}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <b>Dato/Sign:</b> {datoSign}
                  </div>
                  <div>
                    <b>Skrevet av:</b> {skrevetAv}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setStep(0)}
                    className="py-3 rounded-xl border"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={handleSend}
                    className="py-3 rounded-xl bg-black text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Arkiv */}
	      {showArchive && (
	        <VaktReportArchive
	          reports={reports}
	          onOpen={openExisting}
		          onNew={startNew}
		          onDelete={deleteReport}
	        />
	      )}

	      {viewReport && (
	        <div
	          className="fixed inset-0 z-40 bg-white text-gray-900"
	          onClick={() => setViewReport(null)}
	        >
	          <div className="mx-auto h-full max-w-md p-4 flex items-center justify-center">
	            <div className="w-full max-h-full overflow-y-auto space-y-3 text-sm">
	              <h2 className="text-lg font-semibold mb-2 text-center">
	                Vaktrapport
	              </h2>
	              <div>
	                <b>Crew:</b> {viewReport.crew}
	              </div>
	              <div>
	                <b>Uke:</b> {viewReport.ukeFra} – {viewReport.ukeTil}
	              </div>
	              <div>
	                <b>Maskin:</b> {viewReport.maskin}
	              </div>
	              <div>
	                <b>Base:</b> {viewReport.base}
	              </div>
	              <div>
	                <b>Opprettet:</b> {new Date(viewReport.createdAt).toLocaleString()}
	              </div>
	              <div>
	                <b>Operativ informasjon:</b>
	                <div className="whitespace-pre-wrap border border-gray-300 rounded-lg p-2 mt-1">
	                  {viewReport.operativ || "—"}
	                </div>
	              </div>
	              <div>
	                <b>Annen informasjon:</b>
	                <div className="whitespace-pre-wrap border border-gray-300 rounded-lg p-2 mt-1">
	                  {viewReport.annen || "—"}
	                </div>
	              </div>
	              <div>
	                <b>Tekniske utfordringer:</b>
	                <div className="whitespace-pre-wrap border border-gray-300 rounded-lg p-2 mt-1">
	                  {viewReport.teknisk || "—"}
	                </div>
	              </div>
	              <div>
	                <b>Sjekkliste:</b>
	                <ul className="list-disc ml-5 mt-1 space-y-0.5">
	                  {viewReport.checks.map((c) => (
	                    <li key={c.key}>[{c.checked ? "x" : " "}] {c.label}</li>
	                  ))}
	                </ul>
	              </div>
	              <div>
	                <b>Dato/Sign:</b> {viewReport.datoSign}
	              </div>
	              <div>
	                <b>Skrevet av:</b> {viewReport.skrevetAv}
	              </div>
	              <p className="mt-4 text-xs text-center text-gray-500">
	                Trykk hvor som helst for å gå tilbake til arkivet.
	              </p>
	            </div>
	          </div>
	        </div>
	      )}

	      {showCrewPicker && (
	        <CrewPicker
	          initialCrew={crew}
	          onChangeCrew={setCrew}
	          onClose={() => setShowCrewPicker(false)}
		          options={crewPickerOptions}
	        />
	      )}

	      {showSignerPicker && (
	        <div
	          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	          onClick={() => setShowSignerPicker(false)}
	        >
	          <div
	            className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-4"
	            onClick={(e) => e.stopPropagation()}
	          >
	            <h2 className="text-lg font-semibold mb-2">Velg navn for signering</h2>
		            <p className="text-sm text-gray-700 mb-3">
			              Trykk på et navn for å fylle inn feltet Skrevet av. Listen hentes fra
			              felles crew-liste.
		            </p>
	            <div className="space-y-2">
		              {signerNames.map((name) => (
	                <button
	                  key={name}
	                  type="button"
	                  onClick={() => {
	                    setSkrevetAv(name);
	                    setShowSignerPicker(false);
	                  }}
	                  className="w-full text-left p-2 rounded-xl border text-sm bg-white hover:bg-gray-50"
	                >
	                  {name}
	                </button>
	              ))}
	            </div>
		            <div className="mt-4 flex items-center justify-between">
		              <button
		                type="button"
		                onClick={() => {
		                  setSignerMode("manual");
		                  setShowSignerPicker(false);
		                }}
		                className="px-3 py-1.5 rounded-full border bg-white text-gray-900 text-sm"
		              >
		                Fritekst
		              </button>
	              <button
	                type="button"
	                onClick={() => setShowSignerPicker(false)}
	                className="px-3 py-1.5 rounded-full border bg-white text-gray-900 text-sm"
	              >
	                Lukk
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

	      {sendStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-4 text-center">
            {sendStatus === "sending" && (
              <>
                <p className="text-base font-semibold mb-2">Sender rapport...</p>
                <p className="text-sm text-gray-700">
                  Vennligst vent, dette kan ta noen sekunder.
                </p>
              </>
            )}
            {sendStatus === "success" && (
              <>
                <p className="text-base font-semibold mb-4">Rapporten er sendt.</p>
                <button
	                  onClick={() => {
	                    // Ved suksess har vi allerede navigert til forsiden.
	                    // Denne knappen trengs mest som "OK" dersom dialogen fortsatt vises.
	                    setSendStatus(null);
	                  }}
                  className="px-4 py-2 rounded-xl bg-black text-white text-sm"
                >
                  Lukk
                </button>
              </>
            )}
            {sendStatus === "error" && (
              <>
                <p className="text-base font-semibold mb-2">
                  Klarte ikke å sende rapporten.
                </p>
                <p className="text-sm text-gray-700 mb-4">Prøv igjen senere.</p>
                <button
                  onClick={() => setSendStatus(null)}
                  className="px-4 py-2 rounded-xl bg-black text-white text-sm"
                >
                  Lukk
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


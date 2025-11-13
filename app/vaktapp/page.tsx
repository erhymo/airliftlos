"use client";

import React, { useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ----- Typer -----
type Base = "Bergen" | "Tromsø" | "Hammerfest";
type Maskin = "LN-OXH" | "LN-OXI" | "LN-OXJ";

interface CheckItem {
  key: string;
  label: string;
  checked: boolean;
}

interface VaktReport {
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

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

type DraftReport = Omit<VaktReport, "createdAt">;


// ----- Hjelpefunksjoner -----
const todayISO = () => new Date().toISOString().slice(0, 10);

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

const STORAGE_KEY = "vaktapp_reports_v1";

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

function wrapText(text: string, maxChars: number) {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((w) => {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line ? line + " " : "") + w;
    }
  });

  if (line) lines.push(line);
  return lines;
}

async function buildPdf(report: DraftReport): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const marginX = 50;
  let y = 800;

  const draw = (text: string, x: number, size = 12) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  const drawSection = (title: string) => {
    y -= 8;
    page.drawText(title, {
      x: marginX,
      y,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;
  };

  // Header
  page.drawText("VAKTRAPPORT", {
    x: marginX,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 32;

  draw(`Crew: ${report.crew}`, marginX);
  draw(`Uke (fra–til): ${report.ukeFra} – ${report.ukeTil}`, marginX);
  draw(`Maskin i bruk: ${report.maskin}`, marginX);
  draw(`Base: ${report.base}`, marginX);

  drawSection("Operativ informasjon:");
  wrapText(report.operativ, 80).forEach((line) => draw(line, marginX));

  drawSection("Annen informasjon:");
  wrapText(report.annen, 80).forEach((line) => draw(line, marginX));

  drawSection("Tekniske utfordringer:");
  wrapText(report.teknisk, 80).forEach((line) => draw(line, marginX));

  drawSection("Sjekkliste:");
  report.checks.forEach((c) =>
    draw(`- [${c.checked ? "x" : " "}] ${c.label}`, marginX)
  );

  y -= 10;
  draw(`Dato/Sign: ${report.datoSign}`, marginX);
  draw(`Skrevet av: ${report.skrevetAv}`, marginX);

  const bytes = await pdf.save();
  const arrayBuffer = bytes.buffer as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

// ----- UI-byggeklosser -----
function StepShell(props: {
  children: React.ReactNode;
  onNext: () => void;
  onPrev?: () => void;
  canNext?: boolean;
}) {
  const { children, onNext, onPrev, canNext = true } = props;

  return (
    <div className="mx-auto w-full max-w-md p-4 text-gray-900">
      <div className="bg-white rounded-2xl shadow p-4">
        {children}
        <div className="mt-4 flex gap-2">
          {onPrev && (
            <button
              onClick={onPrev}
              className="flex-1 py-3 rounded-xl border border-gray-300"
            >
              Tilbake
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!canNext}
            className="flex-1 py-3 rounded-xl bg-black text-white disabled:opacity-40"
          >
            Neste
          </button>
        </div>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-base font-medium text-gray-900 mb-1">{props.title}</div>
      {props.children}
    </div>
  );
}

// ----- Hovedkomponent (side) -----
export default function VaktAppPage() {
  const [step, setStep] = useState(0);

  const [crew, setCrew] = useState("");
  const [ukeFra, setUkeFra] = useState("");
  const [ukeTil, setUkeTil] = useState("");
  const [maskin, setMaskin] = useState<Maskin>("LN-OXH");
  const [base, setBase] = useState<Base>("Bergen");
  const [operativ, setOperativ] = useState("");
  const [annen, setAnnen] = useState("");
  const [teknisk, setTeknisk] = useState("");
  const [checks, setChecks] = useState<CheckItem[]>(defaultChecks);
  const [datoSign, setDatoSign] = useState(todayISO());
  const [skrevetAv, setSkrevetAv] = useState("");

  const [reports, setReports] = useState<VaktReport[]>(() => loadReports());
  const [showArchive, setShowArchive] = useState(false);

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

  function resetFrom(r: VaktReport) {
    setCrew(r.crew);
    setUkeFra(r.ukeFra);
    setUkeTil(r.ukeTil);
    setMaskin(r.maskin);
    setBase(r.base);
    setOperativ(r.operativ);
    setAnnen(r.annen);
    setTeknisk(r.teknisk);
    setChecks(r.checks);
    setDatoSign(r.datoSign);
    setSkrevetAv(r.skrevetAv);
  }

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
    await saveCurrent();

    const blob = await buildPdf(report);
    const file = new File(
      [blob],
      `Vaktrapport_${report.ukeFra}-${report.ukeTil}.pdf`,
      { type: "application/pdf" }
    );

    const nav = navigator as NavigatorWithShare;
    const canShareFiles = nav.canShare?.({ files: [file] });

    if (nav.share && canShareFiles) {
      try {
        await nav.share({
          title: "Vaktrapport",
          text: "Se vedlagt vaktrapport (PDF).",
          files: [file],
        });
      } catch {}
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      const subject = encodeURIComponent(`LOS-helikopter ${base} – vaktrapport`);
      const body = encodeURIComponent(
        `LOS-helikopter ${base}\n\nVedlagt PDF er lastet ned.`
      );
      window.location.assign(`mailto:?subject=${subject}&body=${body}`);
    }

    startNew();
  }

  function startNew() {
    setCrew("");
    setUkeFra("");
    setUkeTil("");
    setMaskin("LN-OXH");
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
    resetFrom(r);
    setStep(9);
    setShowArchive(false);
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
          <h1 className="text-xl font-semibold">Vaktapp</h1>
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
            <StepShell onNext={() => setStep(1)} canNext={canNext}>
              <Section title="Crew">
                <input
                  value={crew}
                  onChange={(e) => setCrew(e.target.value)}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
              </Section>

              <div className="mt-4">
                <button
                  onClick={startNew}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white"
                >
                  Start ny vaktrapport
                </button>
              </div>
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
                  {(["LN-OXH", "LN-OXI", "LN-OXJ"] as Maskin[]).map((m) => (
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
                  value={skrevetAv}
                  onChange={(e) => setSkrevetAv(e.target.value)}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
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
        <main className="mx-auto max-w-md p-4">
          <div className="bg-white rounded-2xl shadow divide-y">
            <div className="p-4 font-semibold">Arkiv (nyeste øverst)</div>

            {reports.length === 0 && (
              <div className="p-4 text-sm text-gray-800">
                Ingen rapporter enda.
              </div>
            )}

            {reports.map((r) => (
              <div key={r.id} className="p-4">
                <div className="text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {r.crew} — uke {r.ukeFra}–{r.ukeTil}
                    </div>
                    <div className="text-gray-900 text-sm">
                      {r.maskin} • {r.base} •{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openExisting(r)}
                      className="text-blue-600 underline"
                    >
                      Åpne
                    </button>

                    <button
                      className="text-gray-900 underline"
                      onClick={async () => {
                        const blob = await buildPdf(r);
                        const file = new File(
                          [blob],
                          `Vaktrapport_${r.ukeFra}-${r.ukeTil}.pdf`,
                          { type: "application/pdf" }
                        );

                        const nav = navigator as NavigatorWithShare;
                        const canShareFiles = nav.canShare?.({ files: [file] });

                        if (nav.share && canShareFiles) {
                          await nav.share({
                            title: "Vaktrapport",
                            text: "Se vedlagt vaktrapport (PDF).",
                            files: [file],
                          });
                        } else {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = file.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              onClick={startNew}
              className="w-full py-3 rounded-xl bg-black text-white"
            >
              Ny vaktrapport
            </button>
          </div>
        </main>
      )}
    </div>
  );
}


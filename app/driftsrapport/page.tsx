"use client";

import React, { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Base = "Bergen" | "Tromsø" | "Hammerfest";

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

interface DriftsReport {
  base: Base;
  dato: string;
  tid: string;
  arsaker: string[];
  teknisk: string;
  annen: string;
  varighetTimer: number;
  varighetTekst: string;
  gjenopptakTimer: number;
  gjenopptakTekst: string;
  oppfolgingTimer: number;
  oppfolgingTekst: string;
  alternativ: string;
  signatur: string;
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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

async function buildPdf(report: DriftsReport): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
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
  page.drawText("DRIFTSRAPPORT", {
    x: marginX,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 32;

  draw(`Base: ${report.base}`, marginX);
  draw(`Dato/klokkeslett: ${report.dato} ${report.tid}`, marginX);
  draw(`Årsak: ${report.arsaker.join(", ") || "ikke valgt"}`, marginX);

  drawSection("Teknisk (årsak):");
  wrapText(report.teknisk, 80).forEach((line) => draw(line, marginX));

  drawSection("Annen årsak:");
  wrapText(report.annen, 80).forEach((line) => draw(line, marginX));

  drawSection("Antatt varighet:");
  draw(`${report.varighetTimer} timer`, marginX);
  wrapText(report.varighetTekst, 80).forEach((line) => draw(line, marginX));

  drawSection("Estimert gjenopptakelse:");
  draw(`Kl ${report.gjenopptakTimer}:00`, marginX);
  wrapText(report.gjenopptakTekst, 80).forEach((line) => draw(line, marginX));

  drawSection("Neste oppfølging:");
  draw(`Kl ${report.oppfolgingTimer}:00`, marginX);
  wrapText(report.oppfolgingTekst, 80).forEach((line) => draw(line, marginX));

  drawSection("Vurdering alternativ løsning:");
  wrapText(report.alternativ, 80).forEach((line) => draw(line, marginX));

  y -= 10;
  draw(`Signatur: ${report.signatur}`, marginX);

  const bytes = await pdf.save();
  const arrayBuffer = bytes.buffer as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

function StepShell(props: {
  children: React.ReactNode;
  onNext: () => void;
  onPrev?: () => void;
}) {
  const { children, onNext, onPrev } = props;
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
            className="flex-1 py-3 rounded-xl bg-black text-white"
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
      <div className="text-base font-medium text-gray-900 mb-1">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

export default function DriftsrapportPage() {
  const [step, setStep] = useState(0);
  const [base, setBase] = useState<Base>("Bergen");
  const [dato, setDato] = useState(getDefaultDate);
  const [tid, setTid] = useState(getDefaultTime);
  const [arsaker, setArsaker] = useState<string[]>([]);
  const [teknisk, setTeknisk] = useState("");
  const [annen, setAnnen] = useState("");
  const [varighetTimer, setVarighetTimer] = useState(0);
  const [varighetTekst, setVarighetTekst] = useState("");
  const [gjenopptakTimer, setGjenopptakTimer] = useState(0);
  const [gjenopptakTekst, setGjenopptakTekst] = useState("");
  const [oppfolgingTimer, setOppfolgingTimer] = useState(0);
  const [oppfolgingTekst, setOppfolgingTekst] = useState("");
  const [alternativ, setAlternativ] = useState("");
  const [signatur, setSignatur] = useState("");

  function toggleArsak(value: string) {
    setArsaker((prev) =>
      prev.includes(value)
        ? prev.filter((a) => a !== value)
        : [...prev, value]
    );
  }

  function reset() {
    setStep(0);
    setBase("Bergen");
    setDato(getDefaultDate());
    setTid(getDefaultTime());
    setArsaker([]);
    setTeknisk("");
    setAnnen("");
    setVarighetTimer(0);
    setVarighetTekst("");
    setGjenopptakTimer(0);
    setGjenopptakTekst("");
    setOppfolgingTimer(0);
    setOppfolgingTekst("");
    setAlternativ("");
    setSignatur("");
  }

  async function handleSend() {
    const linjer = [
      `Base: ${base}`,
      `Dato/klokkeslett: ${dato} ${tid}`,
      `Årsak: ${arsaker.join(", ") || "ikke valgt"}`,
      "Teknisk (årsak):",
      teknisk || "(tom)",
      "Annen årsak:",
      annen || "(tom)",
      `Antatt varighet: ${varighetTimer} timer`,
      varighetTekst && `Merknad varighet: ${varighetTekst}`,
      `Estimert gjenopptakelse: kl ${gjenopptakTimer}:00`,
      gjenopptakTekst && `Merknad gjenopptakelse: ${gjenopptakTekst}`,
      `Neste oppfølging: kl ${oppfolgingTimer}:00`,
      oppfolgingTekst && `Merknad oppfølging: ${oppfolgingTekst}`,
      "Vurdering alternativ løsning:",
      alternativ || "(tom)",
      `Signatur: ${signatur || "(tom)"}`,
    ].filter(Boolean);

    const report: DriftsReport = {
      base,
      dato,
      tid,
      arsaker,
      teknisk,
      annen,
      varighetTimer,
      varighetTekst,
      gjenopptakTimer,
      gjenopptakTekst,
      oppfolgingTimer,
      oppfolgingTekst,
      alternativ,
      signatur,
    };

    const blob = await buildPdf(report);
    const fileName = `Driftsrapport_${base}_${dato}.pdf`;
    const file = new File([blob], fileName, { type: "application/pdf" });

    const nav = navigator as NavigatorWithShare;
    const canShareFiles = nav.canShare?.({ files: [file] });

    const subject = encodeURIComponent(
      `LOS-helikopter ${base} – driftsrapport ${dato}`
    );

    const body = encodeURIComponent(
      linjer.join("\n") +
        "\n\nVedlagt driftsrapport er lastet ned som PDF (se nedlastinger)."
    );

    const mottakere =
      base === "Bergen"
        ? "myhre.oyvind@gmail.com,tom.ostrem@airlift.no"
        : "";

    if (nav.share && canShareFiles) {
      try {
        await nav.share({
          title: `Driftsrapport ${base} ${dato}`,
          text: "Se vedlagt driftsrapport (PDF).",
          files: [file],
        });
      } catch {
        // Hvis bruker avbryter deling, gjør ingenting
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      const mailto = `mailto:${mottakere}?subject=${subject}&body=${body}`;
      window.location.assign(mailto);
    }

    reset();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b text-gray-900">
        <div className="mx-auto max-w-md p-4">
          <h1 className="text-xl font-semibold">Driftsrapport</h1>
          <p className="text-sm text-gray-600">
            Stegvis driftsrapport for LOS-helikopter.
          </p>
        </div>
      </header>

      <main>
        {step === 0 && (
          <StepShell onNext={() => setStep(1)}>
            <Section title="Base, dato og klokkeslett">
              <div className="space-y-3">
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
                <input
                  type="date"
                  value={dato}
                  onChange={(e) => setDato(e.target.value)}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
                <input
                  type="time"
                  value={tid}
                  onChange={(e) => setTid(e.target.value)}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                />
              </div>
            </Section>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell onPrev={() => setStep(0)} onNext={() => setStep(2)}>
            <Section title="Årsak (huke av det som gjelder)">
              <div className="space-y-2">
                {["Tåke", "Lyn", "Sikt/Skydekke", "Vind/Bølgehøyde"].map((a) => (
                  <label
                    key={a}
                    className="p-3 border rounded-xl flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={arsaker.includes(a)}
                      onChange={() => toggleArsak(a)}
                    />
                    <span className="text-base text-gray-900">{a}</span>
                  </label>
                ))}
              </div>
            </Section>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell onPrev={() => setStep(1)} onNext={() => setStep(3)}>
            <Section title="Teknisk (årsak)">
              <textarea
                value={teknisk}
                onChange={(e) => setTeknisk(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-3 text-base text-gray-900"
              />
            </Section>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell onPrev={() => setStep(2)} onNext={() => setStep(4)}>
            <Section title="Annen årsak til driftsforstyrrelsen">
              <textarea
                value={annen}
                onChange={(e) => setAnnen(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-3 text-base text-gray-900"
              />
            </Section>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell onPrev={() => setStep(3)} onNext={() => setStep(5)}>
            <Section title="Antatt varighet">
              <div className="space-y-3">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={varighetTimer}
                    onChange={(e) => setVarighetTimer(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-700 mt-1">
                    {varighetTimer} timer
                  </div>
                </div>
                <textarea
                  value={varighetTekst}
                  onChange={(e) => setVarighetTekst(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                  placeholder="Fritekst om varighet"
                />
              </div>
            </Section>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell onPrev={() => setStep(4)} onNext={() => setStep(6)}>
            <Section title="Estimert tidspunkt for gjenopptakelse">
              <div className="space-y-3">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={gjenopptakTimer}
                    onChange={(e) => setGjenopptakTimer(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-700 mt-1">
                    Kl {gjenopptakTimer}:00
                  </div>
                </div>
                <textarea
                  value={gjenopptakTekst}
                  onChange={(e) => setGjenopptakTekst(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                  placeholder="Fritekst om gjenopptakelse"
                />
              </div>
            </Section>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell onPrev={() => setStep(5)} onNext={() => setStep(7)}>
            <Section title="Oppfølging (neste tidspunkt for oppdatering)">
              <div className="space-y-3">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={oppfolgingTimer}
                    onChange={(e) => setOppfolgingTimer(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-700 mt-1">
                    Kl {oppfolgingTimer}:00
                  </div>
                </div>
                <textarea
                  value={oppfolgingTekst}
                  onChange={(e) => setOppfolgingTekst(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl p-3 text-base text-gray-900"
                  placeholder="Fritekst om videre oppfølging"
                />
              </div>
            </Section>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell onPrev={() => setStep(6)} onNext={() => setStep(8)}>
            <Section title="Vurdering av alternativ løsning">
              <textarea
                value={alternativ}
                onChange={(e) => setAlternativ(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-3 text-base text-gray-900"
              />
            </Section>
          </StepShell>
        )}

        {step === 8 && (
          <StepShell onPrev={() => setStep(7)} onNext={() => setStep(9)}>
            <Section title="Signatur">
              <input
                value={signatur}
                onChange={(e) => setSignatur(e.target.value)}
                className="w-full border rounded-xl p-3 text-base text-gray-900"
              />
            </Section>
          </StepShell>
        )}

        {step === 9 && (
          <div className="mx-auto w-full max-w-md p-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Se over før sending</h2>
              <div className="text-sm space-y-2">
                <div>
                  <b>Base:</b> {base}
                </div>
                <div>
                  <b>Dato/klokkeslett:</b> {dato} {tid}
                </div>
                <div>
                  <b>Årsak:</b> {arsaker.join(", ") || "ikke valgt"}
                </div>
                <div>
                  <b>Teknisk (årsak):</b>
                  <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                    {teknisk || "(tom)"}
                  </div>
                </div>
                <div>
                  <b>Annen årsak:</b>
                  <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                    {annen || "(tom)"}
                  </div>
                </div>
                <div>
                  <b>Antatt varighet:</b> {varighetTimer} timer
                </div>
                {varighetTekst && (
                  <div>
                    <b>Merknad varighet:</b> {varighetTekst}
                  </div>
                )}
                <div>
                  <b>Estimert gjenopptakelse:</b> kl {gjenopptakTimer}:00
                </div>
                {gjenopptakTekst && (
                  <div>
                    <b>Merknad gjenopptakelse:</b> {gjenopptakTekst}
                  </div>
                )}
                <div>
                  <b>Neste oppfølging:</b> kl {oppfolgingTimer}:00
                </div>
                {oppfolgingTekst && (
                  <div>
                    <b>Merknad oppfølging:</b> {oppfolgingTekst}
                  </div>
                )}
                <div>
                  <b>Vurdering alternativ løsning:</b>
                  <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                    {alternativ || "(tom)"}
                  </div>
                </div>
                <div>
                  <b>Signatur:</b> {signatur || "(tom)"}
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
    </div>
  );
}


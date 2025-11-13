"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Base = "Bergen" | "Tromsø" | "Hammerfest";



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
  const [metarLines, setMetarLines] = useState<string[]>([]);
  const [selectedMetarLines, setSelectedMetarLines] = useState<string[]>([]);
  const [metarLoading, setMetarLoading] = useState(false);
  const [metarError, setMetarError] = useState<string | null>(null);
  const [useMetar, setUseMetar] = useState<"ja" | "nei">("nei");

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
    setMetarLines([]);
    setSelectedMetarLines([]);
    setMetarLoading(false);
    setMetarError(null);
    setUseMetar("nei");
  }

  async function fetchMetarTaf() {
    setMetarLoading(true);
    setMetarError(null);

    try {
      const res = await fetch(`/api/weather?base=${encodeURIComponent(base)}`);
      if (!res.ok) {
        setMetarError("Klarte ikke å hente METAR/TAF.");
        return;
      }
      const data = await res.json();
      const lines = Array.isArray(data.lines) ? data.lines : [];
      setMetarLines(lines);
    } catch (err) {
      setMetarError("Klarte ikke å hente METAR/TAF.");
    } finally {
      setMetarLoading(false);
    }
  }

  function toggleMetarLine(line: string) {
    setSelectedMetarLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
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
    ];

    if (selectedMetarLines.length > 0) {
      linjer.push("METAR/TAF:");
      linjer.push(...selectedMetarLines);
    }

    linjer.push(`Signatur: ${signatur || "(tom)"}`);

    const plainText =
      linjer
        .filter(Boolean)
        .join("\n") + "\n\nVedlagt driftsrapport som PDF.";

    const subject = `LOS-helikopter ${base} – driftsrapport ${dato}`;
    const fileName = `Driftsrapport_${base}_${dato}.pdf`;
    const title = `Driftsrapport ${base} ${dato}`;
    const fromName = `LOS Helikopter ${base}`;

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
      }),
    });

    if (!response.ok) {
      alert("Klarte ikke å sende driftsrapport. Prøv igjen senere.");
      return;
    }

    alert("Driftsrapport sendt til faste mottakere.");
    reset();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b text-gray-900">
        <div className="mx-auto max-w-md p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-900"
              >
                Til forsiden
              </Link>
              <h1 className="text-xl font-semibold">Driftsrapport</h1>
            </div>
            <Image
              src="/Airlift-logo.png"
              alt="Airlift-logo"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          </div>
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
            <Section title="Vil du legge til METAR/TAF?">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseMetar("nei");
                      setSelectedMetarLines([]);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-left ${
                      useMetar === "nei"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    }`}
                  >
                    Nei, gå videre uten METAR/TAF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseMetar("ja");
                      if (metarLines.length === 0) {
                        fetchMetarTaf();
                      }
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-left ${
                      useMetar === "ja"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    }`}
                  >
                    Ja, hent METAR/TAF for {base}
                  </button>
                </div>

                {useMetar === "ja" && (
                  <div className="space-y-2">
                    {metarLoading && (
                      <div className="text-sm text-gray-600">
                        Henter METAR/TAF...
                      </div>
                    )}
                    {metarError && (
                      <div className="text-sm text-red-600">{metarError}</div>
                    )}
                    {!metarLoading && !metarError && metarLines.length > 0 && (
                      <>
                        <div className="text-sm text-gray-700">
                          Velg en eller flere linjer (maks 5) du vil legge ved:
                        </div>
                        <div className="space-y-2">
                          {metarLines.map((line, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMetarLines.includes(line)}
                                onChange={() => toggleMetarLine(line)}
                                className="mt-1"
                              />
                              <span className="text-xs whitespace-pre-wrap">
                                {line}
                              </span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Section>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell onPrev={() => setStep(2)} onNext={() => setStep(4)}>
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

        {step === 4 && (
          <StepShell onPrev={() => setStep(3)} onNext={() => setStep(5)}>
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

        {step === 5 && (
          <StepShell onPrev={() => setStep(4)} onNext={() => setStep(6)}>
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

        {step === 6 && (
          <StepShell onPrev={() => setStep(5)} onNext={() => setStep(7)}>
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

        {step === 7 && (
          <StepShell onPrev={() => setStep(6)} onNext={() => setStep(8)}>
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

        {step === 8 && (
          <StepShell onPrev={() => setStep(7)} onNext={() => setStep(9)}>
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

        {step === 9 && (
          <StepShell onPrev={() => setStep(8)} onNext={() => setStep(10)}>
            <Section title="Signatur">
              <input
                value={signatur}
                onChange={(e) => setSignatur(e.target.value)}
                className="w-full border rounded-xl p-3 text-base text-gray-900"
              />
            </Section>
          </StepShell>
        )}

        {step === 10 && (
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


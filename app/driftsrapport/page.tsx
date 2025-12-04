"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Base = "Bergen" | "Tromsø" | "Hammerfest";

interface DriftsReport {
	id: string;
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
	metarLines: string[];
	htiImageUrls?: string[];
	/** Når rapporten ble lagret lokalt */
	createdAt: number;
	/** Faktisk tidspunkt (klokkeslett) for gjenopptatt drift, hvis sendt */
	gjenopptattKl?: number;
	/** Kommentar som ble sendt ved gjenopptatt drift */
	gjenopptattKommentar?: string;
	/** Når e-posten om gjenopptatt drift ble sendt (ms since epoch) */
	gjenopptattSendtAt?: number;
}

type DraftDriftsReport = Omit<DriftsReport, "createdAt">;

type SendReportResponseBody = {
	ok?: boolean;
	error?: string;
	details?: string;
	sharepoint?: {
		ok?: boolean;
		error?: string;
	} | null;
};

function getDefaultDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const STORAGE_KEY = "driftsrapport_reports_v1";

function loadReports(): DriftsReport[] {
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

function saveReports(reports: DriftsReport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
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
  const [metarTafPairs, setMetarTafPairs] = useState<
    { metar?: string; taf?: string }[]
  >([]);
  const [selectedMetarLines, setSelectedMetarLines] = useState<string[]>([]);
  const [metarLoading, setMetarLoading] = useState(false);
  const [metarError, setMetarError] = useState<string | null>(null);
  const [useMetar, setUseMetar] = useState<"ja" | "nei">("nei");
  const [htiItems, setHtiItems] = useState<{ time: string; uri: string }[]>([]);
  const [selectedHtiUrls, setSelectedHtiUrls] = useState<string[]>([]);
  const [htiLoading, setHtiLoading] = useState(false);
  const [htiError, setHtiError] = useState<string | null>(null);
  const [useHti, setUseHti] = useState<"ja" | "nei">("nei");

	  const [reports, setReports] = useState<DriftsReport[]>(() => loadReports());
	  const [showArchive, setShowArchive] = useState(false);
	  const [showStats, setShowStats] = useState(false);
	  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	  const [resumeReport, setResumeReport] = useState<DriftsReport | null>(null);
	  const [resumeStep, setResumeStep] = useState(0);
	  const [resumeHour, setResumeHour] = useState(12);
	  const [resumeComment, setResumeComment] = useState("");
	  const [resumeSending, setResumeSending] = useState(false);

  const report: DraftDriftsReport = useMemo(
    () => ({
      id: crypto.randomUUID(),
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
      metarLines: selectedMetarLines,
      htiImageUrls: useHti === "ja" ? selectedHtiUrls : [],
    }),
    [
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
      selectedMetarLines,
      useHti,
      selectedHtiUrls,
    ]
  );

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
    setMetarTafPairs([]);
    setSelectedMetarLines([]);
    setMetarLoading(false);
    setMetarError(null);
    setUseMetar("nei");
    setHtiItems([]);
    setSelectedHtiUrls([]);
    setHtiLoading(false);
    setHtiError(null);
    setUseHti("nei");
  }

  function resetFrom(r: DriftsReport) {
    setBase(r.base);
    setDato(r.dato);
    setTid(r.tid);
    setArsaker(r.arsaker);
    setTeknisk(r.teknisk);
    setAnnen(r.annen);
    setVarighetTimer(r.varighetTimer);
    setVarighetTekst(r.varighetTekst);
    setGjenopptakTimer(r.gjenopptakTimer);
    setGjenopptakTekst(r.gjenopptakTekst);
    setOppfolgingTimer(r.oppfolgingTimer);
    setOppfolgingTekst(r.oppfolgingTekst);
    setAlternativ(r.alternativ);
    setSignatur(r.signatur);
    setSelectedMetarLines(r.metarLines || []);
    setUseMetar(r.metarLines && r.metarLines.length > 0 ? "ja" : "nei");
    setSelectedHtiUrls(r.htiImageUrls || []);
    setUseHti(r.htiImageUrls && r.htiImageUrls.length > 0 ? "ja" : "nei");
  }

  async function saveCurrent() {
    const newReport: DriftsReport = {
      ...report,
      createdAt: Date.now(),
    };
    const next = [newReport, ...reports].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    setReports(next);
    saveReports(next);
  }

	  function openExisting(r: DriftsReport) {
	    resetFrom(r);
	    setStep(10);
	    setShowArchive(false);
	  }

	  function deleteReport(id: string) {
	    if (!window.confirm("Vil du slette denne driftsrapporten fra denne enheten?")) {
	      return;
	    }
	    const next = reports.filter((r) => r.id !== id);
	    setReports(next);
	    saveReports(next);
	  }

	  function startResumeFlow(r: DriftsReport) {
	    if (r.gjenopptattSendtAt) {
	      return;
	    }
	    setResumeReport(r);
	    setResumeStep(0);
	    const now = new Date();
	    setResumeHour(now.getHours());
	    setResumeComment("");
	    setShowArchive(false);
	    setShowStats(false);
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
      const tafLines: string[] = Array.isArray(data.taf) ? data.taf : [];
      const metarLines: string[] = Array.isArray(data.metar) ? data.metar : [];

      const pairs: { metar?: string; taf?: string }[] = [];
      const maxPairs = 5;

      for (let i = 0; i < maxPairs; i++) {
        const taf = tafLines[tafLines.length - 1 - i];
        const metar = metarLines[metarLines.length - 1 - i];
        if (!taf && !metar) {
          break;
        }
        pairs.push({ metar, taf });
      }

      setMetarTafPairs(pairs);
	    } catch {
	      setMetarError("Klarte ikke å hente METAR/TAF.");
	    } finally {
      setMetarLoading(false);
    }
  }

  async function fetchHti() {
    setHtiLoading(true);
    setHtiError(null);

    try {
      const res = await fetch(`/api/hti?base=${encodeURIComponent(base)}`);
      if (!res.ok) {
        setHtiError("Klarte ikke å hente HTI-kart.");
        return;
      }
      const data = await res.json();
      const items: { time: string; uri: string }[] = Array.isArray(data.items)
        ? data.items
        : [];
      setHtiItems(items);
	    } catch {
	      setHtiError("Klarte ikke å hente HTI-kart.");
	    } finally {
      setHtiLoading(false);
    }
  }

  function toggleHtiUrl(url: string) {
    setSelectedHtiUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  function toggleMetarLine(line: string) {
    setSelectedMetarLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  }

  async function handleSend() {
    await saveCurrent();

    const [year, month, day] = dato.split("-");
    const datoTekst = `${day}-${month}-${year}`;

    const linjer = [
      `Base: ${base}`,
      `Dato: ${datoTekst}`,
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
      linjer.push("");
      linjer.push("METAR/TAF:");
      linjer.push(...selectedMetarLines);
    }

    if (useHti === "ja" && selectedHtiUrls.length > 0) {
      linjer.push("");
      linjer.push(
        `HTI-kart: ${selectedHtiUrls.length} bilde(r) lagt ved nederst i PDF.`
      );
    }

    linjer.push(`Signatur: ${signatur || "(tom)"}`);

    const plainText =
      linjer.filter(Boolean).join("\n") +
      "\n\nVedlagt driftsrapport som PDF.";

    const subject = `LOS-helikopter ${base} – driftsrapport ${dato}`;
    const fileName = `Driftsforstyrrelse_${base}_${day}-${month}-${year}.pdf`;
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
					base,
		        htiImageUrls: useHti === "ja" ? selectedHtiUrls : [],
					reportType: "driftsrapport",
		      }),
		    });

		    let data: SendReportResponseBody | null = null;
		    try {
		      data = await response.json();
		    } catch {
		      // Ignorer JSON-feil – vi håndterer bare statuskode
		    }

		    if (!response.ok) {
		      const msg =
		        (data && (data.error || data.details)) ||
		        "Klarte ikke å sende driftsrapport. Prøv igjen senere.";
		      alert(msg);
		      return;
		    }

		    if (data && data.sharepoint && data.sharepoint.ok === false) {
		      const spMsg = data.sharepoint.error || "Ukjent feil mot SharePoint.";
		      alert(
		        "Driftsrapport sendt på e-post, men det var en feil mot SharePoint:\n" +
		          spMsg
		      );
		    } else {
		      alert("Driftsrapport sendt til faste mottakere.");
		    }
		    reset();
  }

	  async function resendReport(r: DriftsReport) {
	    const [year, month, day] = r.dato.split("-");
	    const datoTekst = `${day}-${month}-${year}`;
	
	    const linjer = [
	      `Base: ${r.base}`,
	      `Dato: ${datoTekst}`,
	      `Årsak: ${r.arsaker.join(", ") || "ikke valgt"}`,
	      "Teknisk (årsak):",
	      r.teknisk || "(tom)",
	      "Annen årsak:",
	      r.annen || "(tom)",
	      `Antatt varighet: ${r.varighetTimer} timer`,
	      r.varighetTekst && `Merknad varighet: ${r.varighetTekst}`,
	      `Estimert gjenopptakelse: kl ${r.gjenopptakTimer}:00`,
	      r.gjenopptakTekst && `Merknad gjenopptakelse: ${r.gjenopptakTekst}`,
	      `Neste oppfølging: kl ${r.oppfolgingTimer}:00`,
	      r.oppfolgingTekst && `Merknad oppfølging: ${r.oppfolgingTekst}`,
	      "Vurdering alternativ løsning:",
	      r.alternativ || "(tom)",
	    ];
	
	    if (r.metarLines && r.metarLines.length > 0) {
	      linjer.push("");
	      linjer.push("METAR/TAF:");
	      linjer.push(...r.metarLines);
	    }
	
	    if (r.htiImageUrls && r.htiImageUrls.length > 0) {
	      linjer.push("");
	      linjer.push(
	        `HTI-kart: ${r.htiImageUrls.length} bilde(r) lagt ved nederst i PDF.`
	      );
	    }
	
	    linjer.push(`Signatur: ${r.signatur || "(tom)"}`);
	
	    const plainText =
	      linjer.filter(Boolean).join("\n") +
	      "\n\nVedlagt driftsrapport som PDF.";
	
	    const subject = `LOS-helikopter ${r.base} – driftsrapport ${r.dato}`;
	    const fileName = `Driftsforstyrrelse_${r.base}_${day}-${month}-${year}.pdf`;
	    const title = `Driftsrapport ${r.base} ${r.dato}`;
	    const fromName = `LOS Helikopter ${r.base}`;
	
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
	        base: r.base,
	        reportType: "driftsrapport",
	        htiImageUrls: r.htiImageUrls || [],
	      }),
	    });
	
	    let data: SendReportResponseBody | null = null;
	    try {
	      data = await response.json();
	    } catch {
	      // Ignorer JSON-feil – vi håndterer bare statuskode
	    }
	
	    if (!response.ok) {
	      const msg =
	        (data && (data.error || data.details)) ||
	        "Klarte ikke å sende driftsrapport. Prøv igjen senere.";
	      alert(msg);
	      return;
	    }
	
	    if (data && data.sharepoint && data.sharepoint.ok === false) {
	      const spMsg = data.sharepoint.error || "Ukjent feil mot SharePoint.";
	      alert(
	        "Driftsrapport sendt på e-post, men det var en feil mot SharePoint:\n" +
	          spMsg
	      );
	    } else {
	      alert("Driftsrapport sendt til faste mottakere.");
	    }
	  }

	  async function sendResume() {
	    if (!resumeReport) return;
	    setResumeSending(true);
	    try {
	      const now = new Date();
	      const year = now.getFullYear();
	      const month = String(now.getMonth() + 1).padStart(2, "0");
	      const day = String(now.getDate()).padStart(2, "0");
	      const datoTekst = `${day}-${month}-${year}`;
	      const hourLabel = String(resumeHour).padStart(2, "0");
	
	      const linjer = [
	        `Base: ${resumeReport.base}`,
	        `Gjelder driftsrapport sendt ${resumeReport.dato} kl ${resumeReport.tid}.`,
	        "",
	        `Driften er gjenopptatt kl ${hourLabel}:00.`,
	        "",
	        "Kommentar:",
	        resumeComment || "(ingen kommentar)",
	      ];
	
	      const plainText = linjer.join("\n");
	      const subject = `LOS-helikopter ${resumeReport.base} – drift gjenopptatt ${datoTekst}`;
	      const fromName = `LOS Helikopter ${resumeReport.base}`;
	
	      const response = await fetch("/api/resume-drift", {
	        method: "POST",
	        headers: {
	          "Content-Type": "application/json",
	        },
	        body: JSON.stringify({
	          base: resumeReport.base,
	          subject,
	          body: plainText,
	          fromName,
	        }),
	      });
	
	      let data: SendReportResponseBody | null = null;
	      try {
	        data = await response.json();
	      } catch {
	        // Ignorer JSON-feil
	      }
	
	      if (!response.ok || (data && data.ok === false)) {
	        const msg =
	          (data && (data.error || data.details)) ||
	          "Klarte ikke å sende melding om gjenopptatt drift. Prøv igjen senere.";
	        alert(msg);
	        return;
	      }
	
	      const sentAt = Date.now();
	      const next = reports.map((r) =>
	        r.id === resumeReport.id
	          ? {
	              ...r,
	              gjenopptattKl: resumeHour,
	              gjenopptattKommentar: resumeComment,
	              gjenopptattSendtAt: sentAt,
	            }
	          : r
	      );
	      setReports(next);
	      saveReports(next);
	      alert("Melding om gjenopptatt drift er sendt.");
	      setResumeReport(null);
	      setResumeStep(0);
	      setResumeComment("");
	    } finally {
	      setResumeSending(false);
	    }
	  }

  const MONTH_LABELS = [
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

  const CAUSES = [
    "Tåke",
    "Lyn",
    "Sikt/Skydekke",
    "Vind/Bølgehøyde",
    "Teknisk",
    "Annet",
  ] as const;

  const availableYears = (() => {
    const nowYear = new Date().getFullYear();
    const set = new Set<number>();
    for (const r of reports) {
      const parts = r.dato.split("-");
      const yearNum = Number(parts[0]);
      if (!Number.isNaN(yearNum)) {
        set.add(yearNum);
      }
    }
    if (set.size === 0) {
      set.add(nowYear);
    }
    return Array.from(set).sort();
  })();

  function buildStatsForYear(year: number) {
    const perMonthCounts = MONTH_LABELS.map(() => {
      const perCause: Record<string, number> = {};
      for (const cause of CAUSES) {
        perCause[cause] = 0;
      }
      return { perCause, totalReports: 0 };
    });

    const perMonthHours = MONTH_LABELS.map(() => {
      const perCause: Record<string, number> = {};
      for (const cause of CAUSES) {
        perCause[cause] = 0;
      }
      return { perCause, totalHours: 0 };
    });

    for (const r of reports) {
      const [yearStr, monthStr] = r.dato.split("-");
      const y = Number(yearStr);
      const m = Number(monthStr) - 1;
      if (y !== year || m < 0 || m >= MONTH_LABELS.length) continue;

      const duration = r.varighetTimer || 0;

      perMonthCounts[m].totalReports += 1;
      perMonthHours[m].totalHours += duration;

      for (const cause of CAUSES) {
        if (r.arsaker.includes(cause)) {
          perMonthCounts[m].perCause[cause] += 1;
          perMonthHours[m].perCause[cause] += duration;
        }
      }
    }

    const totalHoursByCause: Record<string, number> = {};
    let totalHoursYear = 0;

    for (let i = 0; i < MONTH_LABELS.length; i++) {
      totalHoursYear += perMonthHours[i].totalHours;
      for (const cause of CAUSES) {
        totalHoursByCause[cause] =
          (totalHoursByCause[cause] || 0) + perMonthHours[i].perCause[cause];
      }
    }

    return { perMonthCounts, perMonthHours, totalHoursByCause, totalHoursYear };
  }

  const { perMonthCounts, perMonthHours, totalHoursByCause, totalHoursYear } =
    buildStatsForYear(selectedYear);

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
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowStats(false);
                setShowArchive((v) => !v);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                showArchive
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
            >
              {showArchive ? "Skjul arkiv" : "Arkiv"}
            </button>
            {showArchive && (
              <button
                onClick={() => setShowStats(true)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  showStats
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
              >
                Statestikk
              </button>
            )}
          </div>
        </div>
      </header>

      {!showArchive && !showStats && (
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
                {CAUSES.map((a) => (
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
                      if (metarTafPairs.length === 0) {
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
                    {!metarLoading && !metarError && metarTafPairs.length > 0 && (
                      <>
                        <div className="text-sm text-gray-700">
                          Velg de linjene du vil legge ved:
                        </div>
                        <div className="space-y-2">
                          {metarTafPairs.map((pair, idx) => {
                            const parts: string[] = [];
                            if (pair.metar) {
                              parts.push(`METAR: ${pair.metar}`);
                            }
                            if (pair.taf) {
                              parts.push(`TAF: ${pair.taf}`);
                            }
                            const blockText = parts.join("\n");

                            return (
                              <label
                                key={idx}
                                className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMetarLines.includes(blockText)}
                                  onChange={() => toggleMetarLine(blockText)}
                                  className="mt-1"
                                />
                                <span className="text-xs whitespace-pre-wrap">
                                  {pair.metar && (
                                    <div>
                                      <b>METAR:</b> {pair.metar}
                                    </div>
                                  )}
                                  {pair.taf && (
                                    <div>
                                      <b>TAF:</b> {pair.taf}
                                    </div>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {arsaker.includes("Lyn") && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <div className="text-sm font-medium text-gray-900">
                      Vil du legge til HTI-kart (kun relevant ved lyn)?
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUseHti("nei");
                          setSelectedHtiUrls([]);
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-sm text-left ${
                          useHti === "nei"
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-900"
                        }`}
                      >
                        Nei, gå videre uten HTI
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseHti("ja");
                          if (htiItems.length === 0) {
                            fetchHti();
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-sm text-left ${
                          useHti === "ja"
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-900"
                        }`}
                      >
                        Ja, vis HTI-kart for {base}
                      </button>
                    </div>

                    {useHti === "ja" && (
                      <div className="space-y-2">
                        {htiLoading && (
                          <div className="text-sm text-gray-600">
                            Henter HTI-kart...
                          </div>
                        )}
                        {htiError && (
                          <div className="text-sm text-red-600">{htiError}</div>
                        )}
                        {!htiLoading && !htiError && htiItems.length > 0 && (
                          <>
                            <div className="text-sm text-gray-700">
                              Velg de kartene du vil legge ved:
                            </div>
                            <div className="space-y-2">
                              {htiItems.map((item, idx) => (
                                <label
                                  key={item.uri || idx}
                                  className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedHtiUrls.includes(item.uri)}
                                    onChange={() => toggleHtiUrl(item.uri)}
                                    className="mt-1"
                                  />
                                  <span className="text-xs whitespace-pre-wrap">
                                    <div>
                                      <b>Gyldig tid:</b> {item.time}
                                    </div>
                                    <div className="mt-1">
                                      <a
                                        href={item.uri}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline text-gray-900"
                                      >
                                        Åpne kart i ny fane
                                      </a>
                                    </div>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
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
	            <div className="mt-2 flex justify-end">
	              <button
	                type="button"
	                onClick={() => setTeknisk("N/A")}
	                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 bg-gray-100 text-gray-900"
	              >
	                N/A
	              </button>
	            </div>
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
	            <div className="mt-2 flex justify-end">
	              <button
	                type="button"
	                onClick={() => setAnnen("N/A")}
	                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 bg-gray-100 text-gray-900"
	              >
	                N/A
	              </button>
	            </div>
	          </Section>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell onPrev={() => setStep(4)} onNext={() => setStep(6)}>
            <Section title="Antatt varighet">
              <div className="space-y-3">
                <div className="px-4">
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
                <div className="px-4">
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
                <div className="px-4">
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
	            <div className="mt-2 flex justify-end">
	              <button
	                type="button"
	                onClick={() => setAlternativ("N/A")}
	                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 bg-gray-100 text-gray-900"
	              >
	                N/A
	              </button>
	            </div>
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
                {selectedMetarLines.length > 0 && (
                  <div>
                    <b>METAR/TAF:</b>
                    <div className="whitespace-pre-wrap border rounded-lg p-2 mt-1">
                      {selectedMetarLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedHtiUrls.length > 0 && (
                  <div>
                    <b>HTI-kart:</b>
                    <div className="border rounded-lg p-2 mt-1 space-y-2">
                      {selectedHtiUrls.map((url, idx) => (
                        <div key={url || idx} className="text-xs text-gray-700">
                          HTI-kart {idx + 1}:{" "}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-gray-900"
                          >
                            Se kart
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
      )}
      {showArchive && !showStats && (
        <main className="mx-auto max-w-md p-4">
          <div className="bg-white rounded-2xl shadow divide-y">
            <div className="p-4 font-semibold">Arkiv (nyeste øverst)</div>

            {reports.length === 0 && (
              <div className="p-4 text-sm text-gray-800">
                Ingen rapporter enda.
              </div>
            )}

	            {reports.map((r) => {
	              const alreadyResumed = Boolean(r.gjenopptattSendtAt);
	              const resumedLabelTime =
	                typeof r.gjenopptattKl === "number"
	                  ? String(r.gjenopptattKl).padStart(2, "0") + ":00"
	                  : null;
	              return (
	                <div key={r.id} className="p-4">
	                  <div className="text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	                    <div>
	                      <div className="font-medium">
	                        {r.base} – {r.dato} {r.tid}
	                      </div>
	                      <div className="text-gray-900 text-sm">
	                        {r.arsaker.join(", ") || "Ingen årsak valgt"} •{" "}
	                        {new Date(r.createdAt).toLocaleString()}
	                      </div>
	                      {alreadyResumed && (
	                        <div className="mt-1 text-xs text-gray-700">
	                          Drift gjenopptatt
	                          {resumedLabelTime ? ` kl ${resumedLabelTime}` : ""}
	                          {r.gjenopptattSendtAt
	                            ? ` (melding sendt ${new Date(
	                                r.gjenopptattSendtAt
	                              ).toLocaleString()})`
	                            : ""}
	                        </div>
	                      )}
	                    </div>
	
	                    <div className="flex-1 flex flex-col gap-2 sm:items-end">
	                      <div className="flex gap-2 justify-end">
	                        <button
	                          onClick={() => openExisting(r)}
	                          className="text-blue-600 underline"
	                        >
	                          Åpne
	                        </button>
	                        <button
	                          className="text-gray-900 underline"
	                          onClick={() => resendReport(r)}
	                        >
	                          Send på nytt
	                        </button>
	                        <button
	                          className="text-red-600 underline"
	                          onClick={() => deleteReport(r.id)}
	                        >
	                          Slett
	                        </button>
	                      </div>
	                      <button
	                        type="button"
	                        onClick={() => startResumeFlow(r)}
	                        disabled={alreadyResumed}
	                        className={`mt-1 w-full sm:w-auto px-3 py-2 rounded-xl text-sm font-semibold border transition ${
	                          alreadyResumed
	                            ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
	                            : "bg-blue-600 text-white border-blue-700"
	                        }`}
	                      >
	                        {alreadyResumed ? "Drift er gjenopptatt" : "Gjenoppta drift"}
	                      </button>
	                    </div>
	                  </div>
	                </div>
	              );
	            })}
          </div>

          <div className="mt-4">
            <button
              onClick={() => {
                reset();
                setShowArchive(false);
              }}
              className="w-full py-3 rounded-xl bg-black text-white"
            >
              Ny driftsrapport
            </button>
          </div>
        </main>
      )}

      {showStats && (
        <main className="mx-auto max-w-3xl p-4">
          <div className="bg-white rounded-2xl shadow p-4 text-gray-900">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold">Statestikk driftsrapporter</h2>
              <button
                onClick={() => setShowStats(false)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-900"
              >
                Tilbake
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    selectedYear === year
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm">
                  Antall driftsrapporter per måned og årsak – {selectedYear}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-2 py-1 text-left">Måned</th>
                        {CAUSES.map((cause) => (
                          <th key={cause} className="border px-2 py-1 text-left">
                            {cause}
                          </th>
                        ))}
                        <th className="border px-2 py-1 text-left">Totalt rapporter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTH_LABELS.map((label, index) => {
                        const countsRow = perMonthCounts[index];
                        const monthTotal = countsRow.totalReports;
                        return (
                          <tr key={label}>
                            <td className="border px-2 py-1 font-medium">{label}</td>
                            {CAUSES.map((cause) => (
                              <td key={cause} className="border px-2 py-1 text-right">
                                {countsRow.perCause[cause] || 0}
                              </td>
                            ))}
                            <td className="border px-2 py-1 text-right font-semibold">
                              {monthTotal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm">
                  Antall timer stopp per måned og årsak – {selectedYear}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-2 py-1 text-left">Måned</th>
                        {CAUSES.map((cause) => (
                          <th key={cause} className="border px-2 py-1 text-left">
                            {cause}
                          </th>
                        ))}
                        <th className="border px-2 py-1 text-left">Totalt timer (måned)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTH_LABELS.map((label, index) => {
                        const hoursRow = perMonthHours[index];
                        return (
                          <tr key={label}>
                            <td className="border px-2 py-1 font-medium">{label}</td>
                            {CAUSES.map((cause) => (
                              <td key={cause} className="border px-2 py-1 text-right">
                                {hoursRow.perCause[cause] || 0}
                              </td>
                            ))}
                            <td className="border px-2 py-1 text-right font-semibold">
                              {hoursRow.totalHours || 0}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50">
                        <td className="border px-2 py-1 font-semibold">Sum år</td>
                        {CAUSES.map((cause) => (
                          <td
                            key={cause}
                            className="border px-2 py-1 text-right font-semibold"
                          >
                            {totalHoursByCause[cause] || 0}
                          </td>
                        ))}
                        <td className="border px-2 py-1 text-right font-bold">
                          {totalHoursYear || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
	        </main>
	      )}

	      {resumeReport && (
	        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
	          <div className="mx-auto w-full max-w-md p-4">
	            <div className="bg-white rounded-2xl shadow p-4">
	              <h2 className="text-lg font-semibold mb-1">Gjenoppta drift</h2>
	              <p className="text-sm text-gray-700 mb-4">
	                Dette gjelder driftsrapporten for {resumeReport.base} {" "}
	                {resumeReport.dato} kl {resumeReport.tid}.
	              </p>

	              {resumeStep === 0 && (
	                <div className="space-y-3">
	                  <div className="text-sm font-medium text-gray-900">
	                    Velg tidspunkt for når driften skal vre oppe og g igjen
	                    (klokkeslett).
	                  </div>
	                  <div className="px-2">
	                    <input
	                      type="range"
	                      min={0}
	                      max={23}
	                      value={resumeHour}
	                      onChange={(e) => setResumeHour(Number(e.target.value))}
	                      className="w-full"
	                    />
	                    <div className="mt-1 text-sm text-gray-800">
	                      Kl {String(resumeHour).padStart(2, "0")}:00
	                    </div>
	                  </div>
	                </div>
	              )}

	              {resumeStep === 1 && (
	                <div className="space-y-3">
	                  <div className="text-sm font-medium text-gray-900">
	                    Eventuell kommentar til gjenopptatt drift
	                  </div>
	                  <textarea
	                    value={resumeComment}
	                    onChange={(e) => setResumeComment(e.target.value)}
	                    rows={4}
	                    className="w-full border rounded-xl p-3 text-base text-gray-900"
	                    placeholder="Skriv en kort kommentar (valgfritt)"
	                  />
	                </div>
	              )}

	              {resumeStep === 2 && (
	                <div className="space-y-3 text-sm text-gray-900">
	                  <div>
	                    <b>Base:</b> {resumeReport.base}
	                  </div>
	                  <div>
	                    <b>Gjelder driftsrapport:</b> {resumeReport.dato} kl{" "}
	                    {resumeReport.tid}
	                  </div>
	                  <div>
	                    <b>Drift gjenopptas:</b> kl{" "}
	                    {String(resumeHour).padStart(2, "0")}:00
	                  </div>
	                  <div>
	                    <b>Kommentar:</b>
	                    <div className="mt-1 border rounded-lg p-2 whitespace-pre-wrap">
	                      {resumeComment || "(ingen kommentar)"}
	                    </div>
	                  </div>
	                  <p className="text-xs text-gray-600 mt-1">
	                    Meldingen sendes til de samme mottakerne som den opprinnelige
	                    driftsrapporten, men uten PDF-vedlegg.
	                  </p>
	                </div>
	              )}

	              <div className="mt-4 flex flex-wrap gap-2 justify-end">
	                <button
	                  type="button"
	                  onClick={() => {
	                    if (resumeSending) return;
	                    setResumeReport(null);
	                    setResumeStep(0);
	                    setResumeComment("");
	                  }}
	                  className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white"
	                >
	                  Avbryt
	                </button>
	                {resumeStep > 0 && (
	                  <button
	                    type="button"
	                    onClick={() => setResumeStep((s) => Math.max(0, s - 1))}
	                    disabled={resumeSending}
	                    className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white"
	                  >
	                    Tilbake
	                  </button>
	                )}
	                {resumeStep < 2 && (
	                  <button
	                    type="button"
	                    onClick={() => setResumeStep((s) => Math.min(2, s + 1))}
	                    disabled={resumeSending}
	                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white border border-blue-700"
	                  >
	                    Neste
	                  </button>
	                )}
	                {resumeStep === 2 && (
	                  <button
	                    type="button"
	                    onClick={sendResume}
	                    disabled={resumeSending}
	                    className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white border border-blue-700"
	                  >
	                    {resumeSending ? "Sender..." : "Send"}
	                  </button>
	                )}
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

	    </div>
	  );
	}

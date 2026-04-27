export type PoliceTab = "crew" | "utmelding" | "rapport";
export type PoliceReportType = "training" | "mission";

export type PolicePin = {
	lat: number;
	lng: number;
};

export type SubmitStatus = {
	type: "idle" | "sending" | "success" | "error";
	message?: string;
};

export type ApiSubmitResponse = {
	ok?: boolean;
	error?: string;
	id?: string;
	delivery?: {
		database?: { ok: boolean; error?: string };
		email?: { ok: boolean; skipped?: boolean; error?: string };
		sharepoint?: { ok: boolean; skipped?: boolean; error?: string };
	};
};
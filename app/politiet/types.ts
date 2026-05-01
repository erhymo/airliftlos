export type PoliceTab = "crew" | "utmelding" | "rapport";
export type PoliceReportType = "training" | "mission";
export type PolicePinType = "trainingArea" | "landingPoint" | "other";

export type PolicePin = {
	lat: number;
	lng: number;
	type?: PolicePinType;
	label?: string;
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
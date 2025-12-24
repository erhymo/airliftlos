"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TonnageBuckets = {
  under30000: number;
  between30000And60000: number;
  between60000And90000: number;
  between90000And120000: number;
  over120000: number;
};

type StatsResponse = {
  ok: boolean;
  totalClosed: number;
  totalWithGt: number;
  buckets: TonnageBuckets;
  month: number;
  year: number;
  bucketsByBase?: {
    all: TonnageBuckets;
    bergen: TonnageBuckets;
    hammerfest: TonnageBuckets;
  };
  error?: string;
};

type ManualMonthlyStats = {
  year: number;
  month: number; // 1 = januar
  label: string; // "Januar 2024" / "Januar 2025" etc.
  totalBoats: number;
  totalRigs: number;
  boatToBoatOps: number;
  locations: {
    mongstad: number;
    melkoya: number;
    sture: number;
    karsto: number;
    nyhamna: number;
    losOvrigBoats: number;
    losOvrigRigs: number;
  };
};

	const SHORT_MONTH_LABELS = [
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

	const MANUAL_2017_MONTHLY_STATS: ManualMonthlyStats[] = [
		{
			year: 2017,
			month: 1,
			label: "Januar 2017",
			totalBoats: 0,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 0,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 2,
			label: "Februar 2017",
			totalBoats: 0,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 0,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 3,
			label: "Mars 2017",
			totalBoats: 0,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 0,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 4,
			label: "April 2017",
			totalBoats: 0,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 0,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 5,
			label: "Mai 2017",
			totalBoats: 0,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 0,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 6,
			label: "Juni 2017",
			totalBoats: 1,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 0,
				melkoya: 1,
				sture: 0,
				karsto: 0,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 7,
			label: "Juli 2017",
			totalBoats: 105,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 35,
				melkoya: 21,
				sture: 35,
				karsto: 14,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 8,
			label: "August 2017",
			totalBoats: 115,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 51,
				melkoya: 15,
				sture: 32,
				karsto: 13,
				nyhamna: 4,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 9,
			label: "September 2017",
			totalBoats: 94,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 42,
				melkoya: 17,
				sture: 27,
				karsto: 8,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 10,
			label: "Oktober 2017",
			totalBoats: 98,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 37,
				melkoya: 16,
				sture: 33,
				karsto: 11,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 11,
			label: "November 2017",
			totalBoats: 94,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 34,
				melkoya: 16,
				sture: 28,
				karsto: 14,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2017,
			month: 12,
			label: "Desember 2017",
			totalBoats: 111,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 42,
				melkoya: 21,
				sture: 35,
				karsto: 13,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
	];

	const MANUAL_2018_MONTHLY_STATS: ManualMonthlyStats[] = [
		{
			year: 2018,
			month: 1,
			label: "Januar 2018",
			totalBoats: 92,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 35,
				melkoya: 14,
				sture: 28,
				karsto: 13,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 2,
			label: "Februar 2018",
			totalBoats: 87,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 30,
				melkoya: 15,
				sture: 33,
				karsto: 9,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 3,
			label: "Mars 2018",
			totalBoats: 93,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 31,
				melkoya: 18,
				sture: 30,
				karsto: 13,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 4,
			label: "April 2018",
			totalBoats: 86,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 31,
				melkoya: 20,
				sture: 26,
				karsto: 6,
				nyhamna: 3,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 5,
			label: "Mai 2018",
			totalBoats: 100,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 47,
				melkoya: 15,
				sture: 22,
				karsto: 16,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 6,
			label: "Juni 2018",
			totalBoats: 104,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 44,
				melkoya: 18,
				sture: 32,
				karsto: 8,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 7,
			label: "Juli 2018",
			totalBoats: 89,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 26,
				melkoya: 17,
				sture: 31,
				karsto: 14,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 8,
			label: "August 2018",
			totalBoats: 97,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 25,
				melkoya: 22,
				sture: 34,
				karsto: 15,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 9,
			label: "September 2018",
			totalBoats: 84,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 23,
				melkoya: 16,
				sture: 33,
				karsto: 10,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 10,
			label: "Oktober 2018",
			totalBoats: 83,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 25,
				melkoya: 16,
				sture: 30,
				karsto: 10,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 11,
			label: "November 2018",
			totalBoats: 90,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 31,
				melkoya: 19,
				sture: 30,
				karsto: 9,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2018,
			month: 12,
			label: "Desember 2018",
			totalBoats: 90,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 31,
				melkoya: 18,
				sture: 29,
				karsto: 12,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
	];

	const MANUAL_2019_MONTHLY_STATS: ManualMonthlyStats[] = [
		{
			year: 2019,
			month: 1,
			label: "Januar 2019",
			totalBoats: 77,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 15,
				melkoya: 16,
				sture: 34,
				karsto: 11,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 2,
			label: "Februar 2019",
			totalBoats: 89,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 29,
				melkoya: 17,
				sture: 29,
				karsto: 13,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 3,
			label: "Mars 2019",
			totalBoats: 96,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 30,
				melkoya: 19,
				sture: 34,
				karsto: 12,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 4,
			label: "April 2019",
			totalBoats: 87,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 26,
				melkoya: 16,
				sture: 31,
				karsto: 12,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 5,
			label: "Mai 2019",
			totalBoats: 83,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 22,
				melkoya: 18,
				sture: 32,
				karsto: 9,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 6,
			label: "Juni 2019",
			totalBoats: 70,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 18,
				melkoya: 16,
				sture: 25,
				karsto: 9,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 7,
			label: "Juli 2019",
			totalBoats: 83,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 14,
				melkoya: 20,
				sture: 31,
				karsto: 14,
				nyhamna: 4,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 8,
			label: "August 2019",
			totalBoats: 91,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 22,
				melkoya: 19,
				sture: 35,
				karsto: 13,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 9,
			label: "September 2019",
			totalBoats: 75,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 24,
				melkoya: 15,
				sture: 31,
				karsto: 5,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 10,
			label: "Oktober 2019",
			totalBoats: 102,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 37,
				melkoya: 19,
				sture: 28,
				karsto: 15,
				nyhamna: 3,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 11,
			label: "November 2019",
			totalBoats: 108,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 45,
				melkoya: 14,
				sture: 36,
				karsto: 13,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2019,
			month: 12,
			label: "Desember 2019",
			totalBoats: 111,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 46,
				melkoya: 21,
				sture: 31,
				karsto: 12,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
	];

	const MANUAL_2020_MONTHLY_STATS: ManualMonthlyStats[] = [
		{
			year: 2020,
			month: 1,
			label: "Januar 2020",
			totalBoats: 103,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 55,
				melkoya: 15,
				sture: 24,
				karsto: 8,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 2,
			label: "Februar 2020",
			totalBoats: 95,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 39,
				melkoya: 16,
				sture: 33,
				karsto: 5,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 3,
			label: "Mars 2020",
			totalBoats: 107,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 43,
				melkoya: 24,
				sture: 33,
				karsto: 5,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 4,
			label: "April 2020",
			totalBoats: 80,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 33,
				melkoya: 15,
				sture: 23,
				karsto: 8,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 5,
			label: "Mai 2020",
			totalBoats: 79,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 36,
				melkoya: 7,
				sture: 23,
				karsto: 13,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 6,
			label: "Juni 2020",
			totalBoats: 76,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 41,
				melkoya: 8,
				sture: 18,
				karsto: 9,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 7,
			label: "Juli 2020",
			totalBoats: 96,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 47,
				melkoya: 16,
				sture: 25,
				karsto: 6,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 8,
			label: "August 2020",
			totalBoats: 101,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 51,
				melkoya: 20,
				sture: 24,
				karsto: 6,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 9,
			label: "September 2020",
			totalBoats: 80,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 40,
				melkoya: 7,
				sture: 29,
				karsto: 2,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 10,
			label: "Oktober 2020",
			totalBoats: 82,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 43,
				melkoya: 3,
				sture: 33,
				karsto: 3,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 11,
			label: "November 2020",
			totalBoats: 80,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 45,
				melkoya: 1,
				sture: 29,
				karsto: 4,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2020,
			month: 12,
			label: "Desember 2020",
			totalBoats: 70,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 32,
				melkoya: 2,
				sture: 28,
				karsto: 4,
				nyhamna: 4,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
	];

	const MANUAL_2021_MONTHLY_STATS: ManualMonthlyStats[] = [
		{
			year: 2021,
			month: 1,
			label: "Januar 2021",
			totalBoats: 86,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 56,
				melkoya: 0,
				sture: 26,
				karsto: 3,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 2,
			label: "Februar 2021",
			totalBoats: 74,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 36,
				melkoya: 0,
				sture: 29,
				karsto: 7,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 3,
			label: "Mars 2021",
			totalBoats: 99,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 62,
				melkoya: 2,
				sture: 32,
				karsto: 3,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 4,
			label: "April 2021",
			totalBoats: 81,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 37,
				melkoya: 2,
				sture: 30,
				karsto: 8,
				nyhamna: 4,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 5,
			label: "Mai 2021",
			totalBoats: 84,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 50,
				melkoya: 0,
				sture: 29,
				karsto: 3,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 6,
			label: "Juni 2021",
			totalBoats: 86,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 52,
				melkoya: 0,
				sture: 30,
				karsto: 3,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 7,
			label: "Juli 2021",
			totalBoats: 90,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 52,
				melkoya: 0,
				sture: 31,
				karsto: 6,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 8,
			label: "August 2021",
			totalBoats: 94,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 62,
				melkoya: 2,
				sture: 27,
				karsto: 3,
				nyhamna: 0,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 9,
			label: "September 2021",
			totalBoats: 90,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 60,
				melkoya: 0,
				sture: 25,
				karsto: 3,
				nyhamna: 2,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 10,
			label: "Oktober 2021",
			totalBoats: 88,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 58,
				melkoya: 0,
				sture: 26,
				karsto: 3,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 11,
			label: "November 2021",
			totalBoats: 76,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 46,
				melkoya: 0,
				sture: 28,
				karsto: 1,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
		{
			year: 2021,
			month: 12,
			label: "Desember 2021",
			totalBoats: 82,
			totalRigs: 0,
			boatToBoatOps: 0,
			locations: {
				mongstad: 45,
				melkoya: 0,
				sture: 32,
				karsto: 4,
				nyhamna: 1,
				losOvrigBoats: 0,
				losOvrigRigs: 0,
			},
		},
	];

	const MANUAL_2022_MONTHLY_STATS: ManualMonthlyStats[] = [
	{
		year: 2022,
		month: 1,
		label: "Januar 2022",
		totalBoats: 94,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 54,
			melkoya: 0,
			sture: 28,
			karsto: 8,
			nyhamna: 0,
			losOvrigBoats: 4,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 2,
		label: "Februar 2022",
		totalBoats: 76,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 41,
			melkoya: 0,
			sture: 19,
			karsto: 5,
			nyhamna: 0,
			losOvrigBoats: 11,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 3,
		label: "Mars 2022",
		totalBoats: 112,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 65,
			melkoya: 0,
			sture: 28,
			karsto: 3,
			nyhamna: 1,
			losOvrigBoats: 15,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 4,
		label: "April 2022",
		totalBoats: 74,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 50,
			melkoya: 0,
			sture: 13,
			karsto: 5,
			nyhamna: 1,
			losOvrigBoats: 5,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 5,
		label: "Mai 2022",
		totalBoats: 94,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 56,
			melkoya: 3,
			sture: 21,
			karsto: 2,
			nyhamna: 2,
			losOvrigBoats: 10,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 6,
		label: "Juni 2022",
		totalBoats: 95,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 43,
			melkoya: 15,
			sture: 23,
			karsto: 3,
			nyhamna: 0,
			losOvrigBoats: 11,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 7,
		label: "Juli 2022",
		totalBoats: 105,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 46,
			melkoya: 20,
			sture: 28,
			karsto: 3,
			nyhamna: 1,
			losOvrigBoats: 7,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 8,
		label: "August 2022",
		totalBoats: 101,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 52,
			melkoya: 17,
			sture: 24,
			karsto: 4,
			nyhamna: 1,
			losOvrigBoats: 3,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 9,
		label: "September 2022",
		totalBoats: 104,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 56,
			melkoya: 15,
			sture: 22,
			karsto: 4,
			nyhamna: 3,
			losOvrigBoats: 4,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 10,
		label: "Oktober 2022",
		totalBoats: 104,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 59,
			melkoya: 18,
			sture: 21,
			karsto: 3,
			nyhamna: 0,
			losOvrigBoats: 3,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 11,
		label: "November 2022",
		totalBoats: 113,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 62,
			melkoya: 16,
			sture: 23,
			karsto: 6,
			nyhamna: 0,
			losOvrigBoats: 6,
			losOvrigRigs: 0,
		},
	},
	{
		year: 2022,
		month: 12,
		label: "Desember 2022",
		totalBoats: 110,
		totalRigs: 0,
		boatToBoatOps: 0,
		locations: {
			mongstad: 59,
			melkoya: 16,
			sture: 25,
			karsto: 4,
			nyhamna: 1,
			losOvrigBoats: 5,
			losOvrigRigs: 0,
		},
	},
];

	const MANUAL_2023_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2023,
    month: 1,
    label: "Januar 2023",
    totalBoats: 106,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 56,
      melkoya: 16,
      sture: 22,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 2,
    label: "Februar 2023",
    totalBoats: 110,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 68,
      melkoya: 14,
      sture: 20,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 3,
    label: "Mars 2023",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 71,
      melkoya: 16,
      sture: 17,
      karsto: 2,
      nyhamna: 2,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 4,
    label: "April 2023",
    totalBoats: 123,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 18,
      sture: 19,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 5,
    label: "Mai 2023",
    totalBoats: 112,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 67,
      melkoya: 10,
      sture: 23,
      karsto: 4,
      nyhamna: 1,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 6,
    label: "Juni 2023",
    totalBoats: 110,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 77,
      melkoya: 9,
      sture: 15,
      karsto: 1,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 7,
    label: "Juli 2023",
    totalBoats: 125,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 19,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 8,
    label: "August 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 84,
      melkoya: 13,
      sture: 18,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 9,
    label: "September 2023",
    totalBoats: 124,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 78,
      melkoya: 17,
      sture: 19,
      karsto: 1,
      nyhamna: 2,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 10,
    label: "Oktober 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 16,
      sture: 20,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 11,
    label: "November 2023",
    totalBoats: 112,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 14,
      sture: 18,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 2,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 12,
    label: "Desember 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 16,
      sture: 20,
      karsto: 5,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
];

const MANUAL_2024_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2024,
    month: 1,
    label: "Januar 2024",
    totalBoats: 118,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 76,
      melkoya: 14,
      sture: 21,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 2,
    label: "Februar 2024",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 68,
      melkoya: 16,
      sture: 20,
      karsto: 4,
      nyhamna: 2,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 3,
    label: "Mars 2024",
    totalBoats: 115,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 67,
      melkoya: 17,
      sture: 20,
      karsto: 5,
      nyhamna: 1,
      losOvrigBoats: 5,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 4,
    label: "April 2024",
    totalBoats: 121,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 19,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 5,
    label: "Mai 2024",
    totalBoats: 119,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 17,
      sture: 24,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 6,
    label: "Juni 2024",
    totalBoats: 114,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 65,
      melkoya: 18,
      sture: 17,
      karsto: 3,
      nyhamna: 2,
      losOvrigBoats: 9,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 7,
    label: "Juli 2024",
    totalBoats: 129,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 16,
      sture: 20,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 12,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 8,
    label: "August 2024",
    totalBoats: 124,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 82,
      melkoya: 15,
      sture: 18,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 9,
    label: "September 2024",
    totalBoats: 121,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 74,
      melkoya: 18,
      sture: 20,
      karsto: 1,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 10,
    label: "Oktober 2024",
    totalBoats: 123,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 78,
      melkoya: 16,
      sture: 18,
      karsto: 6,
      nyhamna: 2,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 11,
    label: "November 2024",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 16,
      sture: 20,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 5,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 12,
    label: "Desember 2024",
    totalBoats: 129,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 86,
      melkoya: 17,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 2,
      losOvrigRigs: 0,
    },
  },
];

	const MANUAL_2025_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2025,
    month: 1,
    label: "Januar 2025",
    totalBoats: 111,
    totalRigs: 2,
    boatToBoatOps: 22,
    locations: {
      mongstad: 83,
      melkoya: 9,
      sture: 16,
      karsto: 2,
      nyhamna: 1,
      losOvrigBoats: 0,
      losOvrigRigs: 2,
    },
  },
  {
    year: 2025,
    month: 2,
    label: "Februar 2025",
    totalBoats: 94,
    totalRigs: 4,
    boatToBoatOps: 9,
    locations: {
      mongstad: 53,
      melkoya: 12,
      sture: 26,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 4,
    },
  },
  {
    year: 2025,
    month: 3,
    label: "Mars 2025",
    totalBoats: 103,
    totalRigs: 6,
    boatToBoatOps: 15,
    locations: {
      mongstad: 62,
      melkoya: 19,
      sture: 17,
      karsto: 2,
      nyhamna: 1,
      losOvrigBoats: 2,
      losOvrigRigs: 6,
    },
  },
  {
    year: 2025,
    month: 4,
    label: "April 2025",
    totalBoats: 107,
    totalRigs: 8,
    boatToBoatOps: 16,
    locations: {
      mongstad: 73,
      melkoya: 8,
      sture: 20,
      karsto: 3,
      nyhamna: 2,
      losOvrigBoats: 1,
      losOvrigRigs: 8,
    },
  },
  {
    year: 2025,
    month: 5,
    label: "Mai 2025",
    totalBoats: 102,
    totalRigs: 8,
    boatToBoatOps: 6,
    locations: {
      mongstad: 76,
      melkoya: 0,
      sture: 20,
      karsto: 5,
      nyhamna: 0,
      losOvrigBoats: 1,
      losOvrigRigs: 8,
    },
  },
		];

	const MANUAL_2017_TOTALS = MANUAL_2017_MONTHLY_STATS.reduce(
			(acc, m) => {
				acc.totalBoats += m.totalBoats;
				acc.totalRigs += m.totalRigs;
				acc.boatToBoatOps += m.boatToBoatOps;
				acc.locations.mongstad += m.locations.mongstad;
				acc.locations.melkoya += m.locations.melkoya;
				acc.locations.sture += m.locations.sture;
				acc.locations.karsto += m.locations.karsto;
				acc.locations.nyhamna += m.locations.nyhamna;
				acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
				acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
				return acc;
			},
			{
				totalBoats: 0,
				totalRigs: 0,
				boatToBoatOps: 0,
				locations: {
					mongstad: 0,
					melkoya: 0,
					sture: 0,
					karsto: 0,
					nyhamna: 0,
					losOvrigBoats: 0,
					losOvrigRigs: 0,
				},
			},
		);

	const MANUAL_2018_TOTALS = MANUAL_2018_MONTHLY_STATS.reduce(
			(acc, m) => {
				acc.totalBoats += m.totalBoats;
				acc.totalRigs += m.totalRigs;
				acc.boatToBoatOps += m.boatToBoatOps;
				acc.locations.mongstad += m.locations.mongstad;
				acc.locations.melkoya += m.locations.melkoya;
				acc.locations.sture += m.locations.sture;
				acc.locations.karsto += m.locations.karsto;
				acc.locations.nyhamna += m.locations.nyhamna;
				acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
				acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
				return acc;
			},
			{
				totalBoats: 0,
				totalRigs: 0,
				boatToBoatOps: 0,
				locations: {
					mongstad: 0,
					melkoya: 0,
					sture: 0,
					karsto: 0,
					nyhamna: 0,
					losOvrigBoats: 0,
					losOvrigRigs: 0,
				},
			},
		);

	const MANUAL_2019_TOTALS = MANUAL_2019_MONTHLY_STATS.reduce(
			(acc, m) => {
				acc.totalBoats += m.totalBoats;
				acc.totalRigs += m.totalRigs;
				acc.boatToBoatOps += m.boatToBoatOps;
				acc.locations.mongstad += m.locations.mongstad;
				acc.locations.melkoya += m.locations.melkoya;
				acc.locations.sture += m.locations.sture;
				acc.locations.karsto += m.locations.karsto;
				acc.locations.nyhamna += m.locations.nyhamna;
				acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
				acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
				return acc;
			},
			{
				totalBoats: 0,
				totalRigs: 0,
				boatToBoatOps: 0,
				locations: {
					mongstad: 0,
					melkoya: 0,
					sture: 0,
					karsto: 0,
					nyhamna: 0,
					losOvrigBoats: 0,
					losOvrigRigs: 0,
				},
			},
		);

	const MANUAL_2020_TOTALS = MANUAL_2020_MONTHLY_STATS.reduce(
			(acc, m) => {
				acc.totalBoats += m.totalBoats;
				acc.totalRigs += m.totalRigs;
				acc.boatToBoatOps += m.boatToBoatOps;
				acc.locations.mongstad += m.locations.mongstad;
				acc.locations.melkoya += m.locations.melkoya;
				acc.locations.sture += m.locations.sture;
				acc.locations.karsto += m.locations.karsto;
				acc.locations.nyhamna += m.locations.nyhamna;
				acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
				acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
				return acc;
			},
			{
				totalBoats: 0,
				totalRigs: 0,
				boatToBoatOps: 0,
				locations: {
					mongstad: 0,
					melkoya: 0,
					sture: 0,
					karsto: 0,
					nyhamna: 0,
					losOvrigBoats: 0,
					losOvrigRigs: 0,
				},
			},
		);

	const MANUAL_2021_TOTALS = MANUAL_2021_MONTHLY_STATS.reduce(
			(acc, m) => {
				acc.totalBoats += m.totalBoats;
				acc.totalRigs += m.totalRigs;
				acc.boatToBoatOps += m.boatToBoatOps;
				acc.locations.mongstad += m.locations.mongstad;
				acc.locations.melkoya += m.locations.melkoya;
				acc.locations.sture += m.locations.sture;
				acc.locations.karsto += m.locations.karsto;
				acc.locations.nyhamna += m.locations.nyhamna;
				acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
				acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
				return acc;
			},
			{
				totalBoats: 0,
				totalRigs: 0,
				boatToBoatOps: 0,
				locations: {
					mongstad: 0,
					melkoya: 0,
					sture: 0,
					karsto: 0,
					nyhamna: 0,
					losOvrigBoats: 0,
					losOvrigRigs: 0,
				},
			},
		);

	const MANUAL_2022_TOTALS = MANUAL_2022_MONTHLY_STATS.reduce(
	  (acc, m) => {
	    acc.totalBoats += m.totalBoats;
	    acc.totalRigs += m.totalRigs;
	    acc.boatToBoatOps += m.boatToBoatOps;
	    acc.locations.mongstad += m.locations.mongstad;
	    acc.locations.melkoya += m.locations.melkoya;
	    acc.locations.sture += m.locations.sture;
	    acc.locations.karsto += m.locations.karsto;
	    acc.locations.nyhamna += m.locations.nyhamna;
	    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
	    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
	    return acc;
	  },
	  {
	    totalBoats: 0,
	    totalRigs: 0,
	    boatToBoatOps: 0,
	    locations: {
	      mongstad: 0,
	      melkoya: 0,
	      sture: 0,
	      karsto: 0,
	      nyhamna: 0,
	      losOvrigBoats: 0,
	      losOvrigRigs: 0,
	    },
	  },
	);

	const MANUAL_2023_TOTALS = MANUAL_2023_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

const MANUAL_2024_TOTALS = MANUAL_2024_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

const MANUAL_2025_TOTALS = MANUAL_2025_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

	const ALL_MANUAL_STATS: ManualMonthlyStats[] = [
		...MANUAL_2017_MONTHLY_STATS,
		...MANUAL_2018_MONTHLY_STATS,
		...MANUAL_2019_MONTHLY_STATS,
		...MANUAL_2020_MONTHLY_STATS,
		...MANUAL_2021_MONTHLY_STATS,
		...MANUAL_2022_MONTHLY_STATS,
		...MANUAL_2023_MONTHLY_STATS,
		...MANUAL_2024_MONTHLY_STATS,
		...MANUAL_2025_MONTHLY_STATS,
	];

const AVAILABLE_MANUAL_YEARS = Array.from(
	new Set(ALL_MANUAL_STATS.map((m) => m.year)),
).sort((a, b) => a - b);

export default function StatistikkPage() {
	  const [loading, setLoading] = useState(true);
	  const [error, setError] = useState<string | null>(null);
	  const [stats, setStats] = useState<StatsResponse | null>(null);

	  const [showGenerator, setShowGenerator] = useState(false);
	  const [viewType, setViewType] = useState<"table" | "chart">("table");
	  const [fromYear, setFromYear] = useState(
	    AVAILABLE_MANUAL_YEARS[0] ?? new Date().getFullYear(),
	  );
	  const [fromMonth, setFromMonth] = useState(1);
	  const [toYear, setToYear] = useState(
	    AVAILABLE_MANUAL_YEARS[AVAILABLE_MANUAL_YEARS.length - 1] ??
	      new Date().getFullYear(),
	  );
	  const [toMonth, setToMonth] = useState(12);

	  // statisk trendgraf 20222024
	  const monthlyTotals2022 = MANUAL_2022_MONTHLY_STATS.map((m) => m.totalBoats);
	  const monthlyTotals2023 = MANUAL_2023_MONTHLY_STATS.map((m) => m.totalBoats);
	  const monthlyTotals2024 = MANUAL_2024_MONTHLY_STATS.map((m) => m.totalBoats);
	  const chartMaxY = Math.max(
	    ...monthlyTotals2022,
	    ...monthlyTotals2023,
	    ...monthlyTotals2024,
	    0,
	  );
	  const safeChartMaxY = chartMaxY > 0 ? chartMaxY : 1;
	  const chartWidth = 320;
	  const chartHeight = 140;
	  const xStep =
	    SHORT_MONTH_LABELS.length > 1
	      ? chartWidth / (SHORT_MONTH_LABELS.length - 1)
	      : 0;

	  const buildPoints = (values: number[]) =>
	    values
	      .map((value, index) => {
	        const x = index * xStep;
	        const y = chartHeight - (value / safeChartMaxY) * chartHeight;
	        return `${x},${y}`;
	      })
	      .join(" ");

	  const points2022 = buildPoints(monthlyTotals2022);
	  const points2023 = buildPoints(monthlyTotals2023);
	  const points2024 = buildPoints(monthlyTotals2024);

	  // fleksibel generator (periode)
	  const normalizeKey = (year: number, month: number) => year * 12 + (month - 1);
	  const fromKey = normalizeKey(fromYear, fromMonth);
	  const toKey = normalizeKey(toYear, toMonth);
	  const startKey = Math.min(fromKey, toKey);
	  const endKey = Math.max(fromKey, toKey);

	  const generatorStats = ALL_MANUAL_STATS.filter((m) => {
	    const key = normalizeKey(m.year, m.month);
	    return key >= startKey && key <= endKey;
	  }).sort((a, b) =>
	    a.year === b.year ? a.month - b.month : a.year - b.year,
	  );

	  const generatorValues = generatorStats.map((m) => m.totalBoats);
	  const generatorMaxY = Math.max(...generatorValues, 0);
	  const generatorSafeMaxY = generatorMaxY > 0 ? generatorMaxY : 1;
	  const generatorChartWidth = 320;
	  const generatorChartHeight = 140;
	  const generatorXStep =
	    generatorStats.length > 1
	      ? generatorChartWidth / (generatorStats.length - 1)
	      : 0;

	  const generatorPoints = generatorStats
	    .map((m, index) => {
	      const x = index * generatorXStep;
	      const y =
	        generatorChartHeight -
	        (m.totalBoats / generatorSafeMaxY) * generatorChartHeight;
	      return `${x},${y}`;
	    })
	    .join(" ");

	  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = 12; // desember
        const url = `/api/statistics?year=${year}&month=${month}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Klarte ikke å hente statistikk.");
        }

        const data = (await res.json()) as StatsResponse;
        if (!data.ok) {
          throw new Error(data.error || "Klarte ikke å hente statistikk.");
        }

        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Klarte ikke å hente statistikk.");
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

	  return (
	    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
		      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
	        <header className="space-y-1">
		          <h1 className="text-lg font-semibold">Statistikk for LOS-oppdrag</h1>
		          <p className="text-sm text-gray-600">
		            Øverst vises desember-statistikk (GT per base) hentet fra
		            fagsystemet. Deretter kan du lage egen statistikk basert på
		            manuelle månedsdata (2017–2025 så langt).
		          </p>
	        </header>

        {loading && (
          <p className="text-sm text-gray-500">Henter statistikk …</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

	        {!loading && !error && stats && (
	          <section className="space-y-4 text-sm text-gray-800">
	            <p>
	              Antall lukkede LOS-oppdrag i desember {stats.year} med registrert
	              GT: {stats.totalWithGt} (av totalt {stats.totalClosed} lukkede
	              oppdrag i desember).
	            </p>

	            {stats.bucketsByBase && (
	              <div className="overflow-x-auto">
	                <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	                  <thead className="bg-gray-50">
	                    <tr>
	                      <th className="border px-1 py-0.5 text-left">Størrelse (GT)</th>
	                      <th className="border px-1 py-0.5 text-right">Bergen</th>
	                      <th className="border px-1 py-0.5 text-right">Hammerfest</th>
	                      <th className="border px-1 py-0.5 text-right">Begge baser</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {(
	                      [
	                        { key: "under30000" as const, label: "< 30 000 tonn" },
	                        {
	                          key: "between30000And60000" as const,
	                          label: "30 000 – 60 000 tonn",
	                        },
	                        {
	                          key: "between60000And90000" as const,
	                          label: "60 000 – 90 000 tonn",
	                        },
	                        {
	                          key: "between90000And120000" as const,
	                          label: "90 000 – 120 000 tonn",
	                        },
	                        {
	                          key: "over120000" as const,
	                          label: ">= 120 000 tonn",
	                        },
	                      ] satisfies { key: keyof TonnageBuckets; label: string }[]
	                    ).map((row) => (
	                      <tr key={row.key}>
	                        <td className="border px-1 py-0.5 whitespace-nowrap">
	                          {row.label}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right">
	                          {stats.bucketsByBase?.bergen[row.key] ?? 0}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right">
	                          {stats.bucketsByBase?.hammerfest[row.key] ?? 0}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right font-semibold">
	                          {stats.bucketsByBase?.all[row.key] ?? 0}
	                        </td>
	                      </tr>
	                    ))}
	                  </tbody>
	                </table>
	              </div>
	            )}
	          </section>
	        )}

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <div className="flex items-center justify-between gap-2">
		            <h2 className="text-sm font-semibold">Statistikk-generator</h2>
		            <button
		              type="button"
		              onClick={() => setShowGenerator((prev) => !prev)}
		              className="text-xs px-2 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
		            >
		              {showGenerator ? "Skjul" : "Lag statistikk"}
		            </button>
		          </div>

		          <p className="text-xs text-gray-600">
		            Velg periode og om du vil se tallene som tabell eller graf. Y-aksen
		            viser alltid totalt antall LOS-oppdrag (bter) i valgt periode.
		          </p>

		          {showGenerator && (
		            <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50">
		              <div className="flex flex-col gap-2 text-xs">
		                <div className="flex flex-wrap gap-2 items-center">
		                  <span className="font-medium">Visning:</span>
		                  <div className="flex gap-2">
		                    <button
		                      type="button"
		                      onClick={() => setViewType("table")}
		                      className={`px-2 py-1 rounded border text-xs ${
		                        viewType === "table"
		                          ? "bg-blue-50 border-blue-400 text-blue-700"
		                          : "bg-white border-gray-300 text-gray-700"
		                      }`}
		                    >
		                      Tabell
		                    </button>
		                    <button
		                      type="button"
		                      onClick={() => setViewType("chart")}
		                      className={`px-2 py-1 rounded border text-xs ${
		                        viewType === "chart"
		                          ? "bg-blue-50 border-blue-400 text-blue-700"
		                          : "bg-white border-gray-300 text-gray-700"
		                      }`}
		                    >
		                      Graf
		                    </button>
		                  </div>
		                </div>

		                <div className="flex flex-col gap-1">
		                  <span className="font-medium">Periode (m aned og  e5r):</span>
		                  <div className="flex flex-wrap items-center gap-2">
		                    <span className="text-[11px]">Fra:</span>
		                    <select
		                      className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-white"
		                      value={fromYear}
		                      onChange={(e) => setFromYear(Number(e.target.value))}
		                    >
		                      {AVAILABLE_MANUAL_YEARS.map((year) => (
		                        <option key={year} value={year}>
		                          {year}
		                        </option>
		                      ))}
		                    </select>
		                    <select
		                      className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-white"
		                      value={fromMonth}
		                      onChange={(e) => setFromMonth(Number(e.target.value))}
		                    >
		                      {SHORT_MONTH_LABELS.map((label, index) => (
		                        <option key={label} value={index + 1}>
		                          {label}
		                        </option>
		                      ))}
		                    </select>
		                    <span className="text-[11px]">Til:</span>
		                    <select
		                      className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-white"
		                      value={toYear}
		                      onChange={(e) => setToYear(Number(e.target.value))}
		                    >
		                      {AVAILABLE_MANUAL_YEARS.map((year) => (
		                        <option key={year} value={year}>
		                          {year}
		                        </option>
		                      ))}
		                    </select>
		                    <select
		                      className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-white"
		                      value={toMonth}
		                      onChange={(e) => setToMonth(Number(e.target.value))}
		                    >
		                      {SHORT_MONTH_LABELS.map((label, index) => (
		                        <option key={label} value={index + 1}>
		                          {label}
		                        </option>
		                      ))}
		                    </select>
		                  </div>
		                </div>
		              </div>

		              <div className="pt-2 border-t border-gray-200 space-y-2">
		                {generatorStats.length === 0 ? (
		                  <p className="text-xs text-gray-500">
		                    Ingen data i valgt periode enn e5. Pr f8v en annen
		                    kombinasjon av m aned og  e5r.
		                  </p>
		                ) : viewType === "table" ? (
		                  <div className="overflow-x-auto">
		                    <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs bg-white">
		                      <thead className="bg-gray-50">
		                        <tr>
		                          <th className="border px-1 py-0.5 text-left">M aned</th>
		                          <th className="border px-1 py-0.5 text-right">
		                            Totalt LOS-oppdrag (b ater)
		                          </th>
		                        </tr>
		                      </thead>
		                      <tbody>
		                        {generatorStats.map((m) => (
		                          <tr key={`${m.year}-${m.month}`}>
		                            <td className="border px-1 py-0.5 whitespace-nowrap">
		                              {m.label}
		                            </td>
		                            <td className="border px-1 py-0.5 text-right">
		                              {m.totalBoats}
		                            </td>
		                          </tr>
		                        ))}
		                      </tbody>
		                      <tfoot>
		                        <tr className="bg-gray-50 font-semibold">
		                          <td className="border px-1 py-0.5 text-left">
		                            Sum valgt periode
		                          </td>
		                          <td className="border px-1 py-0.5 text-right">
		                            {generatorStats.reduce(
		                              (sum, m) => sum + m.totalBoats,
		                              0,
		                            )}
		                          </td>
		                        </tr>
		                      </tfoot>
		                    </table>
		                  </div>
		                ) : (
		                  <div className="overflow-x-auto">
		                    <svg
		                      viewBox={`0 0 ${generatorChartWidth} ${
		                        generatorChartHeight + 20
		                      }`}
		                      className="w-full max-w-full border border-gray-200 bg-white"
		                    >
		                      {Array.from({ length: 5 }).map((_, i) => {
		                        const ratio = i / 4;
		                        const y = generatorChartHeight * ratio;
		                        const value = Math.round(
		                          generatorSafeMaxY * (1 - ratio),
		                        );
		                        return (
		                          <g key={i}>
		                            <line
		                              x1={0}
		                              y1={y}
		                              x2={generatorChartWidth}
		                              y2={y}
		                              stroke="#e5e7eb"
		                              strokeWidth={0.5}
		                            />
		                            <text
		                              x={2}
		                              y={y + 4}
		                              fontSize={6}
		                              fill="#6b7280"
		                            >
		                              {value}
		                            </text>
		                          </g>
		                        );
		                      })}

		                      <polyline
		                        fill="none"
		                        stroke="#2563eb"
		                        strokeWidth={1.5}
		                        points={generatorPoints}
		                      />

		                      {generatorStats.map((m, index) => {
		                        const x =
		                          index *
		                          (generatorStats.length > 1
		                            ? generatorChartWidth /
		                              (generatorStats.length - 1)
		                            : 0);
		                        return (
		                          <text
		                            key={`${m.year}-${m.month}`}
		                            x={x}
		                            y={generatorChartHeight + 10}
		                            fontSize={6}
		                            textAnchor="middle"
		                            fill="#374151"
		                          >
		                            {m.label}
		                          </text>
		                        );
		                      })}
		                    </svg>
		                  </div>
		                )}
		              </div>
		            </div>
		          )}
		        </section>

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Visuell trend 2022–2024 (totalt LOS-oppdrag per måned)
	          </h2>
	          <p className="text-xs text-gray-600">
	            En enkel linjegraf som viser antall båter per måned i 2022, 2023 og 2024.
	          </p>

	          <div className="overflow-x-auto">
	            <svg
	              viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}
	              className="w-full max-w-full border border-gray-200 bg-white"
	            >
	              {/* horisontale hjelpelinjer og y-verdier */}
	              {Array.from({ length: 5 }).map((_, i) => {
	                const ratio = i / 4;
	                const y = chartHeight * ratio;
	                const value = Math.round(safeChartMaxY * (1 - ratio));
	                return (
	                  <g key={i}>
	                    <line
	                      x1={0}
	                      y1={y}
	                      x2={chartWidth}
	                      y2={y}
	                      stroke="#e5e7eb"
	                      strokeWidth={0.5}
	                    />
	                    <text
	                      x={2}
	                      y={y + 4}
	                      fontSize={6}
	                      fill="#6b7280"
	                    >
	                      {value}
	                    </text>
	                  </g>
	                );
	              })}

	              {/* linje for 2022 */}
	              <polyline
	                fill="none"
	                stroke="#dc2626"
	                strokeWidth={1.5}
	                points={points2022}
	              />

	              {/* linje for 2023 */}
	              <polyline
	                fill="none"
	                stroke="#2563eb"
	                strokeWidth={1.5}
	                points={points2023}
	              />

	              {/* linje for 2024 */}
	              <polyline
	                fill="none"
	                stroke="#16a34a"
	                strokeWidth={1.5}
	                points={points2024}
	              />

	              {/* månedsetiketter langs x-aksen */}
	              {SHORT_MONTH_LABELS.map((label, index) => {
	                const x = index * xStep;
	                return (
	                  <text
	                    key={label}
	                    x={x}
	                    y={chartHeight + 10}
	                    fontSize={6}
	                    textAnchor="middle"
	                    fill="#374151"
	                  >
	                    {label}
	                  </text>
	                );
	              })}
	            </svg>
	
	            <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-700">
	              <div className="flex items-center gap-1">
	                <span className="inline-block w-3 h-0.5 bg-red-600" />
	                <span>2022</span>
	              </div>
	              <div className="flex items-center gap-1">
	                <span className="inline-block w-3 h-0.5 bg-blue-600" />
	                <span>2023</span>
	              </div>
	              <div className="flex items-center gap-1">
	                <span className="inline-block w-3 h-0.5 bg-green-600" />
	                <span>2024</span>
	              </div>
	            </div>
	          </div>
	        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2017 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2017_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2017_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2017</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2017_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2018 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2018_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2018_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2018</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2018_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2019 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2019_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2019_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2019</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2019_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2020 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2020_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2020_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2020</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2020_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2021 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2021_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2021_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2021</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2021_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2022 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2022_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2022_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2022</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2022_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

		        <section className="space-y-3 text-sm text-gray-800 mt-6">
		          <h2 className="text-sm font-semibold">
		            Manuell statistikk 2023 (totalt LOS-oppdrag per sted)
		          </h2>
		          <p className="text-xs text-gray-600">
		            Basert på summerte tall fra "Logg_2023_samlet.csv" i prosjektet.
		          </p>

		          <div className="overflow-x-auto">
		            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
		              <thead className="bg-gray-50">
		                <tr>
		                  <th className="border px-1 py-0.5 text-left">Måned</th>
		                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
		                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
		                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
		                  <th className="border px-1 py-0.5 text-right">Sture</th>
		                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
		                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
		                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
		                </tr>
		              </thead>
		              <tbody>
		                {MANUAL_2023_MONTHLY_STATS.map((m) => (
		                  <tr key={`${m.year}-${m.month}`}>
		                    <td className="border px-1 py-0.5 whitespace-nowrap">
		                      {m.label}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.totalBoats}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.mongstad}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.melkoya}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.sture}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.karsto}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.nyhamna}
		                    </td>
		                    <td className="border px-1 py-0.5 text-right">
		                      {m.locations.losOvrigBoats}
		                    </td>
		                  </tr>
		                ))}
		              </tbody>
		              <tfoot>
		                <tr className="font-semibold bg-gray-50">
		                  <td className="border px-1 py-0.5 text-left">Sum 2023</td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.totalBoats}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.mongstad}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.melkoya}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.sture}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.karsto}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.nyhamna}
		                  </td>
		                  <td className="border px-1 py-0.5 text-right">
		                    {MANUAL_2023_TOTALS.locations.losOvrigBoats}
		                  </td>
		                </tr>
		              </tfoot>
		            </table>
		          </div>
		        </section>

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Manuell statistikk 2025 (båt/rigg per sted)
	          </h2>
	          <p className="text-xs text-gray-600">
	            Basert på manuell eksport av LOS-logg 2025 (januar–mai).
	          </p>

	          <div className="overflow-x-auto">
	            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	              <thead className="bg-gray-50">
	                <tr>
	                  <th className="border px-1 py-0.5 text-left">Måned</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt båter</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt rigg</th>
	                  <th className="border px-1 py-0.5 text-right">Båt til båt</th>
	                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
	                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
	                  <th className="border px-1 py-0.5 text-right">Sture</th>
	                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
	                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig (båt)</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig (rigg)</th>
	                </tr>
	              </thead>
	              <tbody>
	                {MANUAL_2025_MONTHLY_STATS.map((m) => (
	                  <tr key={`${m.year}-${m.month}`}>
	                    <td className="border px-1 py-0.5 whitespace-nowrap">
	                      {m.label}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalRigs}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.boatToBoatOps}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.mongstad}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.melkoya}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.sture}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.karsto}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.nyhamna}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigRigs}
	                    </td>
	                  </tr>
	                ))}
	              </tbody>
	              <tfoot>
	                <tr className="font-semibold bg-gray-50">
	                  <td className="border px-1 py-0.5 text-left">Sum 2025</td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.totalBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.totalRigs}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.boatToBoatOps}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.mongstad}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.melkoya}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.sture}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.karsto}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.nyhamna}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.losOvrigBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.losOvrigRigs}
	                  </td>
	                </tr>
	              </tfoot>
	            </table>
	          </div>
	        </section>

        <p className="text-xs text-gray-500">
          <Link href="/" className="underline">
            Tilbake til forsiden
          </Link>
        </p>
      </main>
    </div>
  );
}

// utils/opensky.ts
import dotenv from "dotenv";
dotenv.config();

let cachedToken: string | null = null;
const REQUEST_TIMEOUT_MS = 10000;

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

type TokenResponse = {
	access_token: string;
	expires_in: number;
};

type FlightsResponse = {
	states: any[] | null;
};


async function getAccessToken(): Promise<string> {
	// reuse token if not expired
	if (cachedToken) {
		return cachedToken;
	}

	let res: globalThis.Response;
	try {
		res = await fetch(
			"https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "client_credentials",
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
				}),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			},
		);
	} catch (error) {
		throw new Error("Token request failed", { cause: error });
	}

	if (!res.ok) {
		throw new Error(`Token fetch failed: ${res.status}`);
	}

	const data = (await res.json()) as TokenResponse;

	cachedToken = data.access_token;

	return cachedToken!;
}

export async function fetchFlights() {
	const token = await getAccessToken();

	let res: globalThis.Response;
	try {
		res = await fetch(
			"https://opensky-network.org/api/states/all?lamin=8.0&lomin=68.0&lamax=37.0&lomax=97.0",
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			},
		);
	} catch (error) {
		throw new Error("Flights request failed", { cause: error });
	}

	if (!res.ok) {
		throw new Error(`Flights API failed: ${res.status}`);
	}

	const data = (await res.json()) as FlightsResponse;

	return data.states ?? [];
}

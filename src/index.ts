import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import WebSocket, { WebSocketServer } from "ws";
import { fetchFlights } from "./flightUtils.js";
import http from "http";

dotenv.config();
const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.use(express.json());

// creating websocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/", (req, res) => {
	console.log("Hello from backend!");
	res.status(200).json({ body: "Hello from backend!" });
});

let flightData: any[] = [];
function filterAirborne(states: any[][]): any[][] {
	return states.filter((flight) => {
		// your conditions here
		// remember: flight[5], flight[6], flight[7], flight[8], flight[9]
		return flight[8] === false && // on_ground
			flight[6] && // latitude
			flight[7] > 3000 && // baro_altitude
			flight[5] && // longitude
			flight[9] > 50 // velocity
			? true
			: false;
	});
}

async function pollAndBroadcastFlights() {
	try {
		const raw = await fetchFlights();
		const filtered = filterAirborne(raw);

		if (filtered.length === 0) {
			console.warn("No airborne flights found, skipping broadcast");
			return;
		}

		flightData = filtered.slice(0, 2);
		console.log(flightData);

		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(flightData));
			}
		});
	} catch (error) {
		console.error("Flight polling failed:", error);
	}
}

setInterval(pollAndBroadcastFlights, 10000);

// Connection handler — just sends current data immediately
wss.on("connection", (ws) => {
	ws.send(JSON.stringify(flightData)); // 6. send current flightData on connect
});

// port listening to websocket
server.listen(PORT, () => {
	console.log(`Running on PORT: ${PORT}`);
});

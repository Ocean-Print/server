import {
	RawPrinterState,
	PrinterState,
	PrintStage,
	convertState,
	printStageValues,
} from "bambu-js";
import crypto from "crypto";
import tls from "tls";

const MQTT_QOS = 0; // QoS 0, no acknowledgement
const MQTT_KEEPALIVE = 60; // 60 seconds keep-alive
const MQTT_PORT = 8883;

/**
 * Payload to request a push of all data
 */
const PUSH_ALL_PAYLOAD = JSON.stringify({
	pushing: {
		sequence_id: "0",
		command: "pushall",
	},
});

enum MQTTMessageType {
	CONNECT = 1,
	CONNACK = 2,
	PUBLISH = 3,
	PUBACK = 4,
	PUBREC = 5,
	PUBREL = 6,
	PUBCOMP = 7,
	SUBSCRIBE = 8,
	SUBACK = 9,
	UNSUBSCRIBE = 10,
	UNSUBACK = 11,
	PINGREQ = 12,
	PINGRESP = 13,
	DISCONNECT = 14,
}

export class MqttError extends Error {
	constructor(
		name: string = "MqttError",
		message: string = "An MQTT error occurred",
	) {
		super(message);
		this.name = name;
	}
}

export class MqttConnectionError extends MqttError {
	constructor(message: string = "Could not connect to the MQTT broker") {
		super("MqttConnectionError", message);
	}
}

export class MqttClientError extends MqttError {
	constructor(message: string = "Could not communicate with the MQTT broker") {
		super("MqttClientError", message);
	}
}

/**
 * Create a CONNECT packet
 * @param clientIdStr - The client ID
 * @param usernameStr - The username
 * @param passwordStr - The password
 * @returns The CONNECT packet buffer
 */
function createConnectPacket(
	clientIdStr: string,
	usernameStr: string,
	passwordStr: string,
) {
	const clientId = Buffer.from(clientIdStr);
	const username = Buffer.from(usernameStr);
	const password = Buffer.from(passwordStr);

	const variableHeader = Buffer.concat([
		Buffer.from([0x00, 0x04]), // Length of "MQTT" (Protocol Name)
		Buffer.from("MQTT"), // Protocol Name
		Buffer.from([0x04]), // Protocol Level (MQTT 3.1.1)
		Buffer.from([0xc2]), // Connect Flags (Username + Password + Clean Session)
		Buffer.from([0x00, MQTT_KEEPALIVE]), // Keep-alive
	]);

	const payload = Buffer.concat([
		Buffer.from([clientId.length >> 8, clientId.length & 0xff]), // Client ID Length
		clientId,
		Buffer.from([username.length >> 8, username.length & 0xff]), // Username Length
		username,
		Buffer.from([password.length >> 8, password.length & 0xff]), // Password Length
		password,
	]);

	const remainingLength = variableHeader.length + payload.length;
	const fixedHeader = Buffer.from([0x10, remainingLength]);

	return Buffer.concat([fixedHeader, variableHeader, payload]);
}

/**
 * Create a SUBSCRIBE packet
 * @param topic - The topic to subscribe to
 * @returns The SUBSCRIBE packet buffer
 */
function createSubscribePacket(topic: string) {
	const topicBuffer = Buffer.from(topic);

	const packetId = crypto.randomBytes(2); // Packet ID
	const variableHeader = Buffer.concat([
		packetId, // Packet ID
	]);

	const payload = Buffer.concat([
		Buffer.from([topicBuffer.length >> 8, topicBuffer.length & 0xff]), // Topic Length
		topicBuffer,
		Buffer.from([MQTT_QOS]), // QoS level for the topic
	]);

	const remainingLength = variableHeader.length + payload.length;
	const fixedHeader = Buffer.from([0x82, remainingLength]);

	return Buffer.concat([fixedHeader, variableHeader, payload]);
}

function encodeString(str: string): Buffer {
	const strBuffer = Buffer.from(str, "utf-8");
	const lengthBuffer = Buffer.alloc(2);
	lengthBuffer.writeUInt16BE(strBuffer.length, 0);
	return Buffer.concat([lengthBuffer, strBuffer]);
}

function encodeRemainingLength(length: number): Buffer {
	let encodedBytes = [];
	do {
		let byte = length % 128;
		length = Math.floor(length / 128);
		// If there are more bytes to encode, set the continuation bit (0x80).
		if (length > 0) {
			byte = byte | 0x80;
		}
		encodedBytes.push(byte);
	} while (length > 0);

	return Buffer.from(encodedBytes);
}

export function createPublishPacket(topic: string, message: string): Buffer {
	// MQTT Publish packet type and flags (0b0011 0000 for QoS 0, no DUP, no retain)
	const fixedHeaderFirstByte = 0x30;

	// Encode topic
	const topicBuffer = encodeString(topic);

	// Encode message (payload)
	const messageBuffer = Buffer.from(message, "utf-8");

	// Calculate remaining length (variable header + payload length)
	const remainingLength = topicBuffer.length + messageBuffer.length;

	// Encode remaining length (it is a variable length field)
	const remainingLengthBuffer = encodeRemainingLength(remainingLength);

	// Build the packet
	return Buffer.concat([
		Buffer.from([fixedHeaderFirstByte]), // Fixed header
		remainingLengthBuffer, // Remaining length
		topicBuffer, // Topic name
		messageBuffer, // Payload
	]);
}

/**
 * Create a DISCONNECT packet
 */
function createDisconnectPacket() {
	return Buffer.from([0xe0, 0x00]); // DISCONNECT packet
}

/**
 * Parse the payload of incoming publish messages
 * @param buffer - Incoming message buffer
 * @returns The parsed topic and message
 */
function parsePublishMessage(packet: Buffer) {
	let offset = 0;

	// 1. Parse Fixed Header
	const fixedHeader = packet[offset++];
	const messageType = fixedHeader >> 4; // Upper nibble for message type (PUBLISH should be 3)
	if (messageType !== 3 && messageType !== 7) {
		throw new Error("Invalid MQTT PUBLISH packet");
	}

	// 2. Parse Remaining Length
	let remainingLength = 0;
	let multiplier = 1;
	let byte = 0;
	do {
		byte = packet[offset++];
		remainingLength += (byte & 127) * multiplier;
		multiplier *= 128;
		if (multiplier > 128 * 128 * 128) {
			throw new Error("Malformed Remaining Length");
		}
	} while ((byte & 128) !== 0);

	// 3. Parse Topic Name Length
	const topicLength = (packet[offset] << 8) + packet[offset + 1]; // 2 bytes for topic length
	offset += 2;

	// 4. Parse Topic Name
	const topic = packet.subarray(offset, offset + topicLength).toString("utf8");
	offset += topicLength;

	// 5. Parse Packet Identifier (only for QoS 1 or 2)
	const qosLevel = (fixedHeader >> 1) & 0x03; // Bits 1 and 2 in the fixed header for QoS
	let packetIdentifier = null;
	if (qosLevel > 0) {
		packetIdentifier = (packet[offset] << 8) + packet[offset + 1]; // 2 bytes for packet identifier
		offset += 2;
	}

	// 6. Parse Payload
	const payload = packet
		.subarray(
			offset,
			offset + remainingLength - topicLength - 2 - (qosLevel > 0 ? 2 : 0),
		)
		.toString("utf8");

	return {
		topic,
		payload,
		qosLevel,
		packetIdentifier: qosLevel > 0 ? packetIdentifier : undefined,
	};
}

/**
 * Get the printer state
 * @param host - The host to connect to
 * @param serial - The printer serial number
 * @param accessCode - The printer access code
 * @returns The printer state
 */
export function getPrinterState(
	host: string,
	serial: string,
	accessCode: string,
) {
	return new Promise<PrinterState>((resolve, reject) => {
		let lastPacket: MQTTMessageType | null = null;

		const client = tls.connect(MQTT_PORT, host, {
			rejectUnauthorized: false,
		});

		function timeoutCallback(state: string) {
			client.write(createDisconnectPacket());
			client.end();
			if (state === "connecting") {
				reject(new MqttConnectionError("connection timeout"));
			} else {
				reject(new MqttClientError("timeout"));
			}
		}

		// Set a connection timeout of 10 seconds
		let connectionTimeout = setTimeout(
			() => timeoutCallback("connecting"),
			10000,
		);

		client.on("secureConnect", () => {
			clearTimeout(connectionTimeout); // Clear the timeout on successful connection
			connectionTimeout = setTimeout(() => timeoutCallback("connected"), 10000); // Set a 10 second timeout for messages
			client.write(createConnectPacket("bblp", "bblp", accessCode));
		});

		let expectingPayload = false;
		let payload = "";

		client.on("data", (data) => {
			const messageType = data[0] >> 4;

			if (messageType === MQTTMessageType.CONNACK && !expectingPayload) {
				// After connecting, subscribe to the report
				client.write(createSubscribePacket(`device/${serial}/report`));
			} else if (messageType === MQTTMessageType.SUBACK && !expectingPayload) {
				// After the sub acknowledgement, request a status push
				client.write(
					createPublishPacket(`device/${serial}/request`, PUSH_ALL_PAYLOAD),
				);
			} else if (messageType === MQTTMessageType.PUBLISH || expectingPayload) {
				// Parse the incoming message
				try {
					const message = expectingPayload
						? { payload: data.toString() }
						: parsePublishMessage(data);
					payload += message.payload;

					const json = JSON.parse(payload) as {
						print: RawPrinterState;
					};
					const state = convertState(json.print);
					client.write(createDisconnectPacket());
					resolve(state);
				} catch {
					// If we have an error parsing the JSON of the first payload,
					// we should expect more payloads that will be concatenated
					expectingPayload = true;
				}
			}
		});

		client.on("end", () => {
			// Destroying helps clean things faster
			clearTimeout(connectionTimeout);
			client.destroy();

			if (lastPacket === MQTTMessageType.CONNACK) {
				reject(new MqttConnectionError("connection closed"));
			}
		});

		client.on("error", (err) => {
			// Clear the timeout on error
			clearTimeout(connectionTimeout);
			// Connection errors
			if (err.message.includes("ECONNREFUSED")) {
				reject(new MqttConnectionError("connection refused"));
			} else if (err.message.includes("ETIMEDOUT")) {
				reject(new MqttConnectionError("connection timed out"));
			} else if (err.message.includes("EHOSTUNREACH")) {
				reject(new MqttConnectionError("host unreachable"));
			} else if (err.message.includes("ECONNRESET")) {
				reject(new MqttConnectionError("connection reset"));
			} else if (err.message.includes("ECONNABORTED")) {
				reject(new MqttConnectionError("connection aborted"));
			} else if (err.message.includes("ENETUNREACH")) {
				reject(new MqttConnectionError("network unreachable"));
			}
			reject(new MqttClientError(err.message));
			client.end();
		});
	});
}

/**
 * Await the printer to be in a specified state
 * @param host - The host to connect to
 * @param serial - The serial number of the printer
 * @param accessCode - The access code for the printer
 * @param state - The state to await
 * @param timeout - The timeout in milliseconds
 * @returns
 */
export function awaitPrinterState(
	host: string,
	serial: string,
	accessCode: string,
	targetState: PrintStage,
	timeout: number = 30000,
) {
	return new Promise<void>((resolve, reject) => {
		const client = tls.connect(MQTT_PORT, host, {
			rejectUnauthorized: false,
		});

		function timeoutCallback(state: string) {
			client.write(createDisconnectPacket());
			client.end();
			if (state === "connecting") {
				reject(new MqttConnectionError("connection timeout"));
			} else {
				reject(new MqttClientError("timeout"));
			}
		}

		// Set a connection timeout of 10 seconds
		let timeoutId = setTimeout(() => timeoutCallback("connecting"), 10000);

		client.on("secureConnect", () => {
			clearTimeout(timeoutId); // Clear the timeout on successful connection
			timeoutId = setTimeout(() => timeoutCallback("connected"), timeout); // Set a 10 second timeout for messages
			// Send the connect packet
			client.write(createConnectPacket("bblp", "bblp", accessCode));
		});

		client.on("data", (data) => {
			const messageType = data[0] >> 4;

			if (messageType === MQTTMessageType.CONNACK) {
				// After connecting, subscribe to the report
				client.write(createSubscribePacket(`device/${serial}/report`));
			} else if (messageType === MQTTMessageType.SUBACK) {
				// After the sub ackowledgement, request a status push
				client.write(
					createPublishPacket(`device/${serial}/request`, PUSH_ALL_PAYLOAD),
				);
			} else if (messageType === MQTTMessageType.PUBLISH) {
				// Parse the incomming message
				try {
					const message = parsePublishMessage(data);
					const paylaod = JSON.parse(message.payload) as {
						print: RawPrinterState;
					};

					// Resolve if the state matches the awaited state
					const stage = parseInt(paylaod.print.mc_print_stage as string);
					if (printStageValues[stage] === targetState) {
						client.write(createDisconnectPacket());
						resolve();
					}
				} catch {}
			}
		});

		client.on("end", () => {
			// Destroying helps clean things faster
			clearTimeout(timeoutId);
			client.destroy();
		});

		client.on("error", (err) => {
			// Clear the timeout on error
			clearTimeout(timeoutId);
			// Connection errors
			if (err.message.includes("ECONNREFUSED")) {
				reject(new MqttConnectionError("connection refused"));
			} else if (err.message.includes("EHISTDOWN")) {
				reject(new MqttConnectionError("host down"));
			} else if (err.message.includes("ETIMEDOUT")) {
				reject(new MqttConnectionError("connection timed out"));
			} else if (err.message.includes("EHOSTUNREACH")) {
				reject(new MqttConnectionError("host unreachable"));
			} else if (err.message.includes("ECONNRESET")) {
				reject(new MqttConnectionError("connection reset"));
			} else if (err.message.includes("ECONNABORTED")) {
				reject(new MqttConnectionError("connection aborted"));
			} else if (err.message.includes("ENETUNREACH")) {
				reject(new MqttConnectionError("network unreachable"));
			}
			reject(new MqttClientError(err.message));
		});
	});
}

/**
 * Send a command payload to the printer
 * @param host - The host to connect to
 * @param serial - The serial number of the printer
 * @param accessCode - The access code for the printer
 * @param payload - The payload to send
 * @returns
 */
export function sendPrinterCommend(
	host: string,
	serial: string,
	accessCode: string,
	command: any,
) {
	return new Promise<void>((resolve, reject) => {
		const client = tls.connect(MQTT_PORT, host, {
			rejectUnauthorized: false,
		});

		function timeoutCallback(state: string) {
			client.write(createDisconnectPacket());
			client.end();
			if (state === "connecting") {
				reject(new MqttConnectionError("connection timeout"));
			} else {
				reject(new MqttClientError("timeout"));
			}
		}

		// Set a connection timeout of 10 seconds
		let timeoutId = setTimeout(() => {
			timeoutCallback("connecting");
		}, 10000);

		client.on("secureConnect", () => {
			clearTimeout(timeoutId); // Clear the timeout on successful connection
			timeoutId = setTimeout(() => {
				timeoutCallback("connected");
			}, 10000); // Set a 10 second timeout for messages
			// Send the connect packet
			client.write(createConnectPacket("bblp", "bblp", accessCode));
		});

		client.on("data", (data) => {
			const messageType = data[0] >> 4;

			if (messageType === MQTTMessageType.CONNACK) {
				client.write(createSubscribePacket(`device/${serial}/report`));
			} else if (messageType === MQTTMessageType.SUBACK) {
				client.write(
					createPublishPacket(
						`device/${serial}/request`,
						JSON.stringify(command),
					),
				);
			} else if (messageType === MQTTMessageType.PUBLISH) {
				// Parse the incomming message
				try {
					const message = parsePublishMessage(data);
					const payload = JSON.parse(message.payload);

					// Only resolve if the message is the result of our push request
					if (payload.print.command === command.print.command) {
						client.write(createDisconnectPacket());
						resolve();
					}
				} catch {}
			}
		});

		client.on("end", () => {
			// Destroying helps clean things faster
			clearTimeout(timeoutId);
			client.destroy();
		});

		client.on("error", (err) => {
			// Clear the timeout on error
			clearTimeout(timeoutId);
			// Connection errors
			if (err.message.includes("ECONNREFUSED")) {
				reject(new MqttConnectionError("connection refused"));
			} else if (err.message.includes("ETIMEDOUT")) {
				reject(new MqttConnectionError("connection timed out"));
			} else if (err.message.includes("EHOSTUNREACH")) {
				reject(new MqttConnectionError("host unreachable"));
			} else if (err.message.includes("ECONNRESET")) {
				reject(new MqttConnectionError("connection reset"));
			} else if (err.message.includes("ECONNABORTED")) {
				reject(new MqttConnectionError("connection aborted"));
			} else if (err.message.includes("ENETUNREACH")) {
				reject(new MqttConnectionError("network unreachable"));
			}
			reject(new MqttClientError(err.message));
		});

		client.on("close", () => {
			clearTimeout(timeoutId);
		});
	});
}

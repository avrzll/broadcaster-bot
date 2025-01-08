const baileys = await import("@whiskeysockets/baileys");
const { default: makeWASocket } = baileys.default;
import {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
} from "@whiskeysockets/baileys";

import readline from "readline";
import { handlerMessages } from "./controllers/messages.js";
import Pino from "pino";

const P = Pino({ level: "silent" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("src/sessions");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P),
    },
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const phoneNumber = await question("Enter Active WA Number: ");
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`PAIRING CODE: ${code}`);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      console.log("Connecting to WhatsApp...");
    } else if (connection === "open") {
      console.log("Connected to WhatsApp ✓");
    } else if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("Logged out. Exiting...");
        process.exit(0);
      }
      console.log("Connection closed");
      // startBot().catch(console.error);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    handlerMessages(sock, m);
  });
}

startBot().catch(console.error);

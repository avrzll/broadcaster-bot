import chalk from "chalk";
import { dateTime } from "../utils/dateUtils.js";
import { config } from "../config/config.js";

export const handlerMessages = async (sock, m) => {
  // console.log(m);
  const { date, time } = dateTime();

  const reply = async (text) => {
    await sock.sendMessage(m.key.remoteJid, { text: text }, { quoted: m });
  };

  try {
    if (!m.message) return;

    const msgType = Object.keys(m.message)[0];

    const textMsg =
      msgType === "conversation"
        ? m.message.conversation
        : msgType === "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : msgType === "imageMessage"
        ? m.message.imageMessage.caption
        : "";

    const remoteJid = m.key.remoteJid;
    const sender = remoteJid.endsWith("@g.us")
      ? m.key.participant
      : m.key.remoteJid;

    console.log(
      `
${chalk.black.bgWhite("[ CMD ]")} ${chalk.black.bgYellow(
        `${date} | ${time} WIB`
      )} ${chalk.black.bgBlue(textMsg)}
${chalk.magenta("=> From")} ${chalk.green(m.pushName)} ${chalk.yellow(sender)}
${chalk.blue("=> In")} ${chalk.green(remoteJid)}
`
    );

    let command;
    for (const p of config.prefix) {
      if (textMsg.startsWith(p)) {
        command = textMsg.slice(p.length).split(" ")[0].toLowerCase();
        break;
      }
    }

    switch (command) {
      case "ping":
        reply("pong");
        break;

      case "listgc":
        const groups = await sock.groupFetchAllParticipating();
        const groupDetails = Object.values(groups).map((group) => ({
          id: group.id,
          name: group.subject,
        }));
        let gc;
        groupDetails.forEach((group) => {
          gc += `Group Name: ${group.name}\nGroup ID: ${group.id}\n\n`;
        });
        reply(gc);
        break;

      case "bc":
        const target = textMsg.split(" ")[1];
        const text = textMsg.split(" ")[2];
        let delay = parseInt(textMsg.split(" ")[3]);
        const gm = await sock.groupMetadata(target);
        const jidList = gm.participants.map((participant) => participant.id);

        console.log(jidList);

        function sendText(nomer, message, minDelay, maxDelay, onComplete) {
          let index = 0; // Mulai dari nomor pertama

          const sendMessage = () => {
            if (index < nomer.length) {
              sock.sendMessage(nomer[index], { text: message });
              console.log(`Kirim pesan berhasil ke: ${nomer[index]}`);
              index++;

              // Jika masih ada nomor yang harus dikirim, buat delay
              if (index < nomer.length) {
                const randomDelay =
                  Math.random() * (maxDelay - minDelay) + minDelay;
                console.log(
                  `Menunggu selama ${(randomDelay / 60000).toFixed(
                    1
                  )} menit sebelum pesan berikutnya...`
                );
                setTimeout(sendMessage, randomDelay); // Lanjutkan pengiriman dengan delay
              } else {
                // Jika ini adalah nomor terakhir, langsung panggil onComplete
                onComplete();
              }
            }
          };

          sendMessage(); // Panggil fungsi pertama kali
        }

        // Panggil fungsi sendText
        sendText(jidList, text, delay, delay + 60000, () => {
          console.log(
            "Semua pesan telah dikirim. Menutup koneksi dalam 3 detik..."
          );
          setTimeout(function () {
            sock.end();
          }, 3000);
        });

        break;
      case "end":
        sock.end();
        break;

      default:
        break;
    }
  } catch (e) {
    console.log(`Handler Message Error: ${e.message}`);
    reply(`Handler Message Error: ${e.message}`);
  }
};

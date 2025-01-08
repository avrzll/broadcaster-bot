import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import "dayjs/locale/id.js"; // Locale Indonesia

// Aktifkan plugin dan atur locale
dayjs.extend(customParseFormat);
dayjs.locale("id");

// Fungsi untuk mendapatkan tanggal dan waktu terbaru
export const dateTime = () => {
  const date = dayjs().format("dddd, DD MMMM YYYY");
  const time = dayjs().format("HH.mm.ss");

  return { date, time };
};

const WHATSAPP_WEB_ORIGIN = "https://web.whatsapp.com";

export function isAllowedWhatsAppUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === WHATSAPP_WEB_ORIGIN;
  } catch {
    return false;
  }
}

export function toWhatsAppWebUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "wa.me") return `${WHATSAPP_WEB_ORIGIN}/`;
    const phone = url.pathname.replace(/\D/g, "");
    if (!phone) return `${WHATSAPP_WEB_ORIGIN}/`;
    const target = new URL("/send/", WHATSAPP_WEB_ORIGIN);
    target.searchParams.set("phone", phone);
    const message = url.searchParams.get("text");
    if (message) target.searchParams.set("text", message);
    target.searchParams.set("type", "phone_number");
    target.searchParams.set("app_absent", "0");
    return target.toString();
  } catch {
    return `${WHATSAPP_WEB_ORIGIN}/`;
  }
}

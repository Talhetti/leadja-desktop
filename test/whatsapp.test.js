import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedWhatsAppUrl, toWhatsAppWebUrl } from "../electron/whatsapp.js";

test("wa.me links open the same lead in WhatsApp Web", () => {
  assert.equal(
    toWhatsAppWebUrl("https://wa.me/5541987654321?text=Ol%C3%A1%2C%20Empresa"),
    "https://web.whatsapp.com/send?phone=5541987654321&text=Ol%C3%A1%2C+Empresa",
  );
});

test("invalid chat links fall back to WhatsApp Web home", () => {
  assert.equal(toWhatsAppWebUrl("javascript:alert(1)"), "https://web.whatsapp.com/");
  assert.equal(toWhatsAppWebUrl("https://example.com/5541987654321"), "https://web.whatsapp.com/");
});

test("embedded navigation stays on the official WhatsApp Web origin", () => {
  assert.equal(isAllowedWhatsAppUrl("https://web.whatsapp.com/"), true);
  assert.equal(isAllowedWhatsAppUrl("https://web.whatsapp.com/send?phone=55"), true);
  assert.equal(isAllowedWhatsAppUrl("https://web.whatsapp.com.example.org/"), false);
  assert.equal(isAllowedWhatsAppUrl("https://example.org/"), false);
});

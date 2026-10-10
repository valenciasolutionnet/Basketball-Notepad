import { useState } from "react";
import { X } from "lucide-react";
import { C } from "./theme.jsx";

const EFFECTIVE_DATE = "September 23, 2026";
const CONTACT_EMAIL = "privacy@valenciasolution.net";

// Placeholder legal copy. This is generic boilerplate describing what the
// app actually does (local-storage practice data, temporary Redis sync for
// Live Game) — not a substitute for review by a lawyer before publishing.
const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["What we collect", "Basketball Notepad stores your practice plans, player notes, and session history directly in your browser's local storage. This data never leaves your device unless you use the Live Game tab."],
      ["Live Game sync", "When you start or join a live game, the score, stats, and coach messages for that game code are temporarily stored on our server (via Upstash Redis) so other devices using the same code can sync. This data is not tied to any personal account and is not sold or shared with third parties."],
      ["Player and youth data", "If you use this app to track youth players, you are responsible for complying with any applicable laws governing minors' data (such as COPPA) in your context. We recommend using initials or jersey numbers instead of full names where possible."],
      ["Cookies and tracking", "We do not use advertising cookies or third-party analytics trackers."],
      ["Your choices", `You can clear all locally stored data at any time by clearing your browser's site data for this app. For questions, contact ${CONTACT_EMAIL}.`],
    ],
  },
  terms: {
    title: "Terms of Use",
    sections: [
      ["Acceptance", "By using Basketball Notepad, you agree to these terms. If you don't agree, please don't use the app."],
      ["The service", "Basketball Notepad is provided as a practice-planning and game-tracking tool for coaches, as-is and without warranty of any kind, express or implied."],
      ["Your responsibility", "You are responsible for the accuracy of data you enter and for how you use it, including compliance with any league, school, or organizational policies regarding player information."],
      ["Limitation of liability", "We are not liable for any loss of data, missed practice plans, or scoring discrepancies arising from use of this app, to the fullest extent permitted by law."],
      ["Changes", "We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms."],
    ],
  },
  data: {
    title: "Data & Compliance",
    sections: [
      ["Storage location", "Practice-planning data is stored locally on your device and is never transmitted to our servers. Live Game data is held temporarily in Redis and expires automatically."],
      ["Data retention", "Live Game data associated with a game code is not retained indefinitely and is intended for the duration of a single game session."],
      ["No sale of data", "We do not sell personal data or player information to third parties."],
      ["Security", "We use industry-standard hosting (Vercel) and a managed Redis provider for the Live Game sync feature. No system is 100% secure, and data is transmitted at your own risk."],
      ["Compliance contact", `For data requests or compliance questions, contact ${CONTACT_EMAIL}.`],
    ],
  },
  ip: {
    title: "IP Infringement",
    sections: [
      ["Respecting intellectual property", "Valencia Solution respects the intellectual property rights of others and expects users of this site to do the same."],
      ["Filing a notice", `If you believe content on this site or app infringes your copyright or other intellectual property rights, send a written notice to ${CONTACT_EMAIL} including: (1) identification of the work claimed to be infringed, (2) identification of the allegedly infringing material and its location, (3) your contact information, (4) a statement of good-faith belief that the use is unauthorized, and (5) a statement that the notice is accurate and, under penalty of perjury, that you are authorized to act on behalf of the rights holder.`],
      ["Our response", "Upon receiving a valid notice, we will investigate and take appropriate action, which may include removing or disabling access to the material in question."],
    ],
  },
};

function LegalModal({ contentKey, onClose }) {
  const content = LEGAL_CONTENT[contentKey];
  if (!content) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12,
          maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto",
          padding: "20px 22px 24px", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: "0.02em", color: C.chalk, margin: 0, textTransform: "uppercase" }}>
            {content.title}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: C.chalkDim, cursor: "pointer", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.chalkFaint, margin: "0 0 16px" }}>
          Effective {EFFECTIVE_DATE}
        </p>
        {content.sections.map(([heading, text]) => (
          <div key={heading} style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.sage, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 5px" }}>
              {heading}
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkDim, margin: 0, lineHeight: 1.5 }}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnsubscribeModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12,
          maxWidth: 460, width: "100%", padding: "20px 22px 24px", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: "0.02em", color: C.chalk, margin: 0, textTransform: "uppercase" }}>
            Unsubscribe
          </h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: C.chalkDim, cursor: "pointer", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkDim, margin: "0 0 12px", lineHeight: 1.5 }}>
          Basketball Notepad doesn't send marketing emails or newsletters — your practice data
          stays in your browser, and Live Game sync uses a game code, not an email address.
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkDim, margin: 0, lineHeight: 1.5 }}>
          If you received an email from Valencia Solution and want to be removed from any list,
          email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.amber }}>{CONTACT_EMAIL}</a>
          {" "}and we'll take care of it.
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const [open, setOpen] = useState(null); // "privacy" | "terms" | "data" | "ip" | "unsubscribe" | null

  const links = [
    ["privacy", "Privacy Policy"],
    ["terms", "Terms of Use"],
    ["data", "Data & Compliance"],
    ["ip", "IP Infringement"],
    ["unsubscribe", "Unsubscribe"],
  ];

  return (
    <>
      <footer
        style={{
          borderTop: `1px solid ${C.line}`, background: C.bg2,
          padding: "14px 16px", display: "flex", flexWrap: "wrap",
          justifyContent: "center", gap: "6px 18px",
        }}
      >
        {links.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setOpen(key)}
            style={{
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.chalkFaint,
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            {label}
          </button>
        ))}
      </footer>
      {open && open !== "unsubscribe" && <LegalModal contentKey={open} onClose={() => setOpen(null)} />}
      {open === "unsubscribe" && <UnsubscribeModal onClose={() => setOpen(null)} />}
    </>
  );
}

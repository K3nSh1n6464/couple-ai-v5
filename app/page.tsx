"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { analyzeConversation } from "./lib/analyzer";

type Message = {
  date: string;
  sender: string;
  text: string;
  isForwarded?: boolean;
  isQuoted?: boolean;
  originalSender?: string;
};

type RelationshipType = "amour" | "famille" | "amis" | "travail";

const RELATIONSHIPS: {
  id: RelationshipType;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    id: "amour",
    icon: "❤️",
    label: "Amour",
    description: "Couple, relation amoureuse, complicité",
  },
  {
    id: "famille",
    icon: "🏠",
    label: "Famille",
    description: "Parents, frères, sœurs, proches",
  },
  {
    id: "amis",
    icon: "🫂",
    label: "Amis",
    description: "Amitié, potes, complicité",
  },
  {
    id: "travail",
    icon: "💼",
    label: "Travail",
    description: "Collègues, équipe, relation professionnelle",
  },
];

const RELATION_LABELS = {
  amour: {
    connection: "Ce qui vous lie",
    balance: "L'équilibre du couple",
    codes: "Vos codes",
    conflicts: "Vos conflits",
    distance: "Les moments de distance",
    connectionIcon: "❤️",
    balanceIcon: "⚖️",
    codesIcon: "😂",
    conflictsIcon: "🔥",
    distanceIcon: "🧊",
  },
  famille: {
    connection: "Ce qui vous rattache",
    balance: "L'équilibre familial",
    codes: "Vos habitudes",
    conflicts: "Les tensions familiales",
    distance: "Les moments de distance",
    connectionIcon: "🏠",
    balanceIcon: "⚖️",
    codesIcon: "😂",
    conflictsIcon: "🔥",
    distanceIcon: "🧊",
  },
  amis: {
    connection: "Pourquoi vous vous parlez encore",
    balance: "La réciprocité",
    codes: "Vos délires",
    conflicts: "Vos embrouilles",
    distance: "Les périodes de silence",
    connectionIcon: "🫂",
    balanceIcon: "⚖️",
    codesIcon: "😂",
    conflictsIcon: "🔥",
    distanceIcon: "🧊",
  },
  travail: {
    connection: "Ce qui fait fonctionner l'équipe",
    balance: "L'équilibre professionnel",
    codes: "Vos habitudes de communication",
    conflicts: "Les désaccords",
    distance: "Les périodes de déconnexion",
    connectionIcon: "🤝",
    balanceIcon: "⚖️",
    codesIcon: "💬",
    conflictsIcon: "🔥",
    distanceIcon: "🧊",
  },
} satisfies Record<
  RelationshipType,
  {
    connection: string;
    balance: string;
    codes: string;
    conflicts: string;
    distance: string;
    connectionIcon: string;
    balanceIcon: string;
    codesIcon: string;
    conflictsIcon: string;
    distanceIcon: string;
  }
>;

function parseWhatsApp(text: string): Message[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: Message[] = [];
  let cur: Message | null = null;

  const regs = [
    /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+-\s+([^:]+):\s?(.*)$/,
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s?(.*)$/,
  ];

  for (const line of lines) {
    const m = regs.map((r) => line.match(r)).find(Boolean);

    if (m) {
      if (cur) out.push(cur);

      cur = {
        date: `${m[1]} ${m[2]}`,
        sender: m[3].trim(),
        text: m[4] || "",
      };
    } else if (cur && line.trim()) {
      cur.text += "\n" + line;
    }
  }

  if (cur) out.push(cur);

  return out.filter(
    (x) =>
      x.text.trim() &&
      !x.text.includes("Messages and calls are end-to-end encrypted")
  );
}

function detectForwarded(text: string): boolean {
  const t = text.toLowerCase().trim();

  return (
    t.includes("message transféré") ||
    t.includes("message transfere") ||
    t.includes("transféré") ||
    t.includes("transfere") ||
    t.includes("forwarded") ||
    t.startsWith("fwd:") ||
    t.startsWith("fw:")
  );
}

function detectQuoted(
  text: string,
  knownSenders: string[]
): {
  isQuoted: boolean;
  originalSender?: string;
} {
  const trimmed = text.trim();

  if (!trimmed) return { isQuoted: false };

  const hasQuote =
    /^["«“][\s\S]*["»”]$/.test(trimmed) ||
    /["«“][\s\S]+["»”]/.test(trimmed);

  const speakerMatch = trimmed.match(
    /^([^:\n]{1,60})\s*(?::|-)\s+[\s\S]+$/
  );

  let originalSender: string | undefined;

  if (speakerMatch) {
    const candidate = speakerMatch[1].trim();
    const normalizedCandidate = candidate.toLowerCase();

    const isKnownSender = knownSenders.some(
      (sender) => sender.toLowerCase() === normalizedCandidate
    );

    if (!isKnownSender) {
      originalSender = candidate;
    }
  }

  const reportedSpeech =
    /\b(m['’]a dit|m['’]a écrit|m['’]a envoy[ée]|a dit|a écrit|elle a dit|il a dit|voici ce qu['’]il|voici ce qu['’]elle)\b/i.test(
      trimmed
    );

  return {
    isQuoted: hasQuote || !!originalSender || reportedSpeech,
    originalSender,
  };
}

function enrichMessages(messages: Message[]): Message[] {
  const senders = [...new Set(messages.map((m) => m.sender))];

  return messages.map((message) => {
    const quoted = detectQuoted(message.text, senders);

    return {
      ...message,
      isForwarded: detectForwarded(message.text),
      isQuoted: quoted.isQuoted,
      originalSender: quoted.originalSender,
    };
  });
}

function md(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<p></p>")
    .replace(/\n/g, "<br/>");
}

function fmt(n: number | null | undefined) {
  return n == null ? "—" : n.toLocaleString("fr-FR");
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [report, setReport] = useState("");
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("amour");

  const senders = useMemo(
    () => [...new Set(messages.map((m) => m.sender))].slice(0, 2),
    [messages]
  );

  const labels = RELATION_LABELS[relationshipType];

  const forwardedCount = useMemo(
    () => messages.filter((m) => m.isForwarded).length,
    [messages]
  );

  const quotedCount = useMemo(
    () => messages.filter((m) => m.isQuoted).length,
    [messages]
  );

  async function load(f: File) {
    setFile(f);
    setError("");
    setReport("");
    setData(null);
    setProgress(0);

    try {
      let text = "";

      if (f.name.toLowerCase().endsWith(".zip")) {
        const z = await JSZip.loadAsync(f);

        for (const n of Object.keys(z.files)) {
          if (!z.files[n].dir && n.toLowerCase().endsWith(".txt")) {
            const t = await z.files[n].async("text");
            if (t.length > text.length) text = t;
          }
        }
      } else {
        text = await f.text();
      }

      const parsed = parseWhatsApp(text);

      if (parsed.length < 20) {
        throw new Error("Format WhatsApp non reconnu.");
      }

      const enriched = enrichMessages(parsed);
      setMessages(enriched);
      setProgress(18);
    } catch (e: any) {
      setFile(null);
      setMessages([]);
      setError(e?.message || "Impossible de lire le fichier.");
      setProgress(0);
    }
  }

  async function analyze() {
    if (!messages.length) {
      setError("Aucun message à analyser.");
      return;
    }

    setBusy(true);
    setError("");
    setProgress(30);

    try {
      /*
       * Les statistiques et les preuves sont calculées localement.
       * L'API Gemini reçoit uniquement ce dossier compact.
       */
      const localAnalysis = analyzeConversation(messages);

      setProgress(50);

      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          relationshipType,
          stats: localAnalysis,
          evidence: localAnalysis.evidence,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(
          d?.error || "Erreur pendant l'analyse."
        );
      }

      setData(d);
      setReport(d.report || "");
      setProgress(100);
    } catch (e: any) {
      setError(e?.message || "Erreur pendant l'analyse.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = new Blob([report], {
      type: "text/markdown",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "conversation-autopsy.md";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function share() {
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report,
          analysis: data?.analysis,
          stats: data?.stats,
          relationshipType,
        }),
      });

      const d = await r.json();

      if (r.ok && d.id) {
        const u = location.origin + "/r/" + d.id;
        await navigator.clipboard.writeText(u);
        alert("Lien public copié.");
      } else {
        alert(
          "Le partage public sera activé après configuration Supabase."
        );
      }
    } catch {
      alert("Partage indisponible.");
    }
  }

  const months = useMemo(() => {
    const m = data?.stats?.monthly || {};

    return Object.entries(m)
      .filter(([k]) => k !== "unknown")
      .slice(-18) as [string, Record<string, number>][];
  }, [data]);

  const maxMonth = Math.max(
    1,
    ...months.map(([, v]) =>
      Math.max(0, ...Object.values(v))
    )
  );

  const st = data?.stats?.stats || {};

  const relation = RELATIONSHIPS.find(
    (r) => r.id === relationshipType
  );

  return (
    <main className="site">
      <nav className="nav">
        <div className="brand">
          <span className="mark">✦</span>
          Conversation <span>Autopsy</span>
        </div>

        <div className="navRight">
          ● Données privées par défaut
        </div>
      </nav>

      {!report ? (
        <section className="landing">
          <div className="eyebrow">
            ✦ Jean-Michel ouvre le dossier
          </div>

          <h1>
            Votre conversation mérite
            <br />
            <i>une autopsie.</i>
          </h1>

          <p className="lead">
            Amour, famille, amis ou travail : donnez vos messages à
            Jean-Michel. Il va chercher les habitudes, les contradictions,
            les silences et les petits détails que vous n'aviez probablement
            pas envie de remarquer.
          </p>

          <div className="relationshipPicker">
            <div className="sectionKicker">
              QUEL TYPE DE RELATION ?
            </div>

            <div className="relationshipGrid">
              {RELATIONSHIPS.map((item) => {
                const active = relationshipType === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`relationshipCard ${
                      active ? "active" : ""
                    }`}
                    onClick={() => setRelationshipType(item.id)}
                  >
                    <span className="relationshipIcon">
                      {item.icon}
                    </span>

                    <strong>{item.label}</strong>

                    <small>{item.description}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="uploadCard">
            <label className="drop" htmlFor="f">
              <div className="uploadIcon">↑</div>

              <b>Déposez votre export WhatsApp</b>

              <span>
                ZIP ou TXT · glissez-déposez ou{" "}
                <u>choisissez un fichier</u>
              </span>

              <small>
                ⌁ Analyse locale avant envoi des éléments nécessaires à l'IA
              </small>

              <input
                id="f"
                hidden
                type="file"
                accept=".zip,.txt"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) load(selected);
                }}
              />
            </label>

            {file && (
              <div className="loaded">
                <div>
                  <b>{file.name}</b>

                  <small>
                    {fmt(messages.length)} messages ·{" "}
                    {senders.join(" × ")}
                  </small>

                  {(forwardedCount > 0 || quotedCount > 0) && (
                    <small>
                      {forwardedCount > 0 &&
                        `${forwardedCount} potentiellement transférés`}
                      {forwardedCount > 0 &&
                        quotedCount > 0 &&
                        " · "}
                      {quotedCount > 0 &&
                        `${quotedCount} potentiellement cités`}
                    </small>
                  )}
                </div>

                <button onClick={analyze} disabled={busy}>
                  {busy ? "Analyse…" : "Analyser →"}
                </button>
              </div>
            )}

            {progress > 0 && (
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {error && <div className="error">⚠ {error}</div>}

          <div className="features">
            <div>
              <b>01</b>
              <strong>Des preuves, pas des clichés.</strong>
              <span>Les observations partent de messages réels.</span>
            </div>

            <div>
              <b>02</b>
              <strong>Votre histoire dans le temps.</strong>
              <span>Les évolutions et silences comptent.</span>
            </div>

            <div>
              <b>03</b>
              <strong>Une vraie voix.</strong>
              <span>Jean-Michel n'est pas un horoscope.</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="resultPage">
          <div className="resultTop">
            <div>
              <div className="eyebrow">✦ Rapport terminé</div>

              <div className="meta">
                {fmt(data?.stats?.meta?.totalMessages)} messages ·{" "}
                {relation?.icon} {relation?.label}
              </div>
            </div>

            <div className="actions">
              <button onClick={share}>Partager ↗</button>
              <button onClick={download}>Exporter ↓</button>
            </div>
          </div>

          <div className="scoreGrid">
            {senders.map((s, i) => {
              const x = st[s] || {};

              return (
                <div className="personCard" key={s}>
                  <div className="avatar">{i ? "♡" : "✦"}</div>

                  <div>
                    <small>PERSONNE {i + 1}</small>
                    <h3>{s}</h3>
                    <p>
                      {fmt(x.messages)} messages ·{" "}
                      {fmt(x.averageWords)} mots/msg
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="statsStrip">
            <div>
              <span>Messages</span>
              <b>{fmt(data?.stats?.meta?.totalMessages)}</b>
            </div>

            <div>
              <span>Durée</span>
              <b>
                {data?.stats?.meta?.durationDays
                  ? `${fmt(data.stats.meta.durationDays)} j`
                  : "—"}
              </b>
            </div>

            {senders.map((s) => (
              <div key={s}>
                <span>❤️ {s}</span>
                <b>{fmt(st[s]?.affectionTotal)}</b>
              </div>
            ))}
          </div>

          <div className="timeline">
            <div className="sectionKicker">
              L'HISTOIRE DANS LE TEMPS
            </div>

            <h2>
              Votre conversation n'est pas une ligne droite.
            </h2>

            <p>
              Chaque barre représente le volume de messages du mois.
            </p>

            <div className="chart">
              {months.map(([m, v]) => (
                <div className="month" key={m}>
                  <div className="bars">
                    {senders.map((s) => (
                      <i
                        key={s}
                        style={{
                          height: `${Math.max(
                            4,
                            ((v[s] || 0) / maxMonth) * 120
                          )}px`,
                        }}
                        title={`${s}: ${v[s] || 0}`}
                      />
                    ))}
                  </div>

                  <small>{m.slice(5)}</small>
                </div>
              ))}
            </div>
          </div>

          <article
            className="report"
            dangerouslySetInnerHTML={{ __html: md(report) }}
          />

          {data?.analysis?.profiles && (
            <section className="proofs">
              <div className="sectionKicker">LES COULISSES</div>

              <h2>Pourquoi Jean-Michel pense ça.</h2>

              <p>
                Quelques preuves utilisées pour construire les portraits.
              </p>

              <div className="proofGrid">
                {data.analysis.profiles.map((p: any, i: number) => (
                  <div className="proofCard" key={i}>
                    <div className="proofPerson">
                      <span>{i ? "♡" : "✦"}</span>
                      {p.person}
                    </div>

                    <h3>{p.nickname || p.portrait}</h3>
                    <p>{p.portrait}</p>

                    {p.evidence?.slice(0, 3).map(
                      (e: any, j: number) => (
                        <blockquote key={j}>
                          <q>{e.quote}</q>
                          <span>{e.why}</span>
                        </blockquote>
                      )
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="privacyBox">
            <b>
              🔒 La conversation brute n'est pas stockée dans cette interface.
            </b>

            <span>
              Pour un lancement public, ajoute authentification, limitation
              de taille, suppression automatique et politique de confidentialité.
            </span>
          </div>

          <button
            className="back"
            onClick={() => {
              setReport("");
              setData(null);
              setFile(null);
              setMessages([]);
              setProgress(0);
              setError("");
            }}
          >
            ← Analyser une autre conversation
          </button>
        </section>
      )}

      <footer>
        <b>Conversation Autopsy</b>

        <span>Analyse conversationnelle · sans horoscope</span>

        <span>🩺 Jean-Michel enquête</span>
      </footer>
    </main>
  );
}

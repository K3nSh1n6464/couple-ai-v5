"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { analyzeConversation } from "./lib/analyzer";

type Message = {
  date: string;
  sender: string;
  text: string;
};

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
        date: `${m![1]} ${m![2]}`,
        sender: m![3].trim(),
        text: m![4] || "",
      };
    } else if (cur && line.trim()) {
      cur.text += "\n" + line;
    }
  }

  if (cur) out.push(cur);

  return out.filter(
    (x) =>
      x.text &&
      !x.text.includes(
        "Messages and calls are end-to-end encrypted"
      )
  );
}

function md(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
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

  const senders = useMemo(
    () =>
      [...new Set(messages.map((m) => m.sender))].slice(0, 2),
    [messages]
  );

  async function load(f: File) {
    setFile(f);
    setError("");
    setReport("");
    setData(null);

    try {
      let text = "";

      if (f.name.endsWith(".zip")) {
        const z = await JSZip.loadAsync(f);

        for (const n of Object.keys(z.files)) {
          if (!z.files[n].dir && n.endsWith(".txt")) {
            const t = await z.files[n].async("text");

            if (t.length > text.length) {
              text = t;
            }
          }
        }
      } else {
        text = await f.text();
      }

      const p = parseWhatsApp(text);

      if (p.length < 20) {
        throw new Error("Format WhatsApp non reconnu.");
      }

      setMessages(p);
      setProgress(18);
    } catch (e: any) {
      setFile(null);
      setError(e.message);
      setProgress(0);
    }
  }

  async function analyze() {
    setBusy(true);
    setError("");
    setProgress(25);

    try {
      if (!messages.length) {
        throw new Error("Aucun message à analyser.");
      }

      console.log(
        "Messages disponibles :",
        messages.length
      );

      // Analyse complète dans le navigateur.
      // Les gros exports WhatsApp restent donc locaux.
      const localAnalysis = analyzeConversation(messages);

      console.log(
        "Analyse locale :",
        localAnalysis.meta.totalMessages,
        "messages"
      );

      console.log(
        "Preuves sélectionnées :",
        localAnalysis.evidence.length
      );

      setProgress(55);

      // IMPORTANT :
      // On n'envoie PAS les 118 000 messages.
      // Seulement les statistiques + passages pertinents.
      const payload = {
        stats: {
          meta: localAnalysis.meta,
          stats: localAnalysis.stats,
          relationship: localAnalysis.relationship,
          monthly: localAnalysis.monthly,
        },

        evidence: localAnalysis.evidence
          .slice(0, 700)
          .map((m) => ({
            date: m.date,
            sender: m.sender,
            text: m.text,
          })),
      };

      const payloadSize = Math.round(
        JSON.stringify(payload).length / 1024
      );

      console.log(
        "Payload envoyé à /api/analyze :",
        payloadSize,
        "KB"
      );

      setProgress(65);

      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(
          d.error || "Erreur pendant l'analyse."
        );
      }

      setProgress(100);
      setData(d);
      setReport(d.report);
    } catch (e: any) {
      console.error("ANALYSE ERROR:", e);

      setError(
        e?.message || "Erreur pendant l'analyse."
      );
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const a = document.createElement("a");

    a.href = URL.createObjectURL(
      new Blob([report], {
        type: "text/markdown",
      })
    );

    a.download = "couple-ai.md";
    a.click();
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
      .slice(-18) as [
      string,
      Record<string, number>
    ][];
  }, [data]);

  const maxMonth = Math.max(
    1,
    ...months.map(([_, v]) =>
      Math.max(...Object.values(v))
    )
  );

  const st = data?.stats?.stats || {};

  return (
    <main className="site">
      <nav className="nav">
        <div className="brand">
          <span className="mark">♡</span>
          couple<span>ai</span>
        </div>

        <div className="navRight">
          ● Données privées par défaut
        </div>
      </nav>

      {!report ? (
        <section className="landing">
          <div className="eyebrow">
            ✦ L'autopsie amoureuse, sans filtre
          </div>

          <h1>
            Votre histoire mérite
            <br />
            <i>plus qu'un résumé.</i>
          </h1>

          <p className="lead">
            Déposez votre conversation WhatsApp. On
            cherche les habitudes, les contradictions,
            les codes et les petites preuves d'amour qui
            racontent vraiment votre couple.
          </p>

          <div className="uploadCard">
            <label className="drop" htmlFor="f">
              <div className="uploadIcon">↑</div>

              <b>
                Déposez votre export WhatsApp
              </b>

              <span>
                ZIP ou TXT · glissez-déposez ou{" "}
                <u>choisissez un fichier</u>
              </span>

              <small>
                ⌁ Analyse locale avant envoi des éléments
                nécessaires à l'IA
              </small>

              <input
                id="f"
                hidden
                type="file"
                accept=".zip,.txt"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  load(e.target.files[0])
                }
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
                </div>

                <button
                  onClick={analyze}
                  disabled={busy}
                >
                  {busy
                    ? "Analyse…"
                    : "Analyser mon couple →"}
                </button>
              </div>
            )}

            {progress > 0 && (
              <div className="progress">
                <i
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="error">
              ⚠ {error}
            </div>
          )}

          <div className="features">
            <div>
              <b>01</b>
              <strong>
                Des preuves, pas des clichés.
              </strong>
              <span>
                Les observations partent de messages
                réels.
              </span>
            </div>

            <div>
              <b>02</b>
              <strong>
                Votre histoire dans le temps.
              </strong>
              <span>
                Les évolutions et silences comptent.
              </span>
            </div>

            <div>
              <b>03</b>
              <strong>
                Une vraie voix.
              </strong>
              <span>
                Pas un horoscope à 87%.
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="resultPage">
          <div className="resultTop">
            <div>
              <div className="eyebrow">
                ✦ Rapport terminé
              </div>

              <div className="meta">
                {fmt(
                  data?.stats?.meta?.totalMessages
                )}{" "}
                messages ·{" "}
                {data?.stats?.meta?.senders?.length ||
                  2}{" "}
                personnes
              </div>
            </div>

            <div className="actions">
              <button onClick={share}>
                Partager ↗
              </button>

              <button onClick={download}>
                Exporter ↓
              </button>
            </div>
          </div>

          <div className="scoreGrid">
            {senders.map((s, i) => {
              const x = st[s] || {};

              return (
                <div
                  className="personCard"
                  key={s}
                >
                  <div className="avatar">
                    {i ? "♡" : "✦"}
                  </div>

                  <div>
                    <small>
                      PERSONNE {i + 1}
                    </small>

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
              <b>
                {fmt(
                  data?.stats?.meta?.totalMessages
                )}
              </b>
            </div>

            <div>
              <span>Durée</span>
              <b>
                {data?.stats?.meta?.durationDays
                  ? `${fmt(
                      data.stats.meta.durationDays
                    )} j`
                  : "—"}
              </b>
            </div>

            {senders.map((s) => (
              <div key={s}>
                <span>❤️ {s}</span>
                <b>
                  {fmt(
                    st[s]?.affectionTotal
                  )}
                </b>
              </div>
            ))}
          </div>

          <div className="timeline">
            <div className="sectionKicker">
              L'HISTOIRE DANS LE TEMPS
            </div>

            <h2>
              Votre conversation n'est pas une
              ligne droite.
            </h2>

            <p>
              Chaque barre représente le volume de
              messages du mois.
            </p>

            <div className="chart">
              {months.map(([m, v]) => (
                <div
                  className="month"
                  key={m}
                >
                  <div className="bars">
                    {senders.map((s) => (
                      <i
                        key={s}
                        style={{
                          height: `${Math.max(
                            4,
                            ((v[s] || 0) /
                              maxMonth) *
                              120
                          )}px`,
                        }}
                        title={`${s}: ${
                          v[s] || 0
                        }`}
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
            dangerouslySetInnerHTML={{
              __html: md(report),
            }}
          />

          {data?.analysis?.profiles && (
            <section className="proofs">
              <div className="sectionKicker">
                LES COULISSES
              </div>

              <h2>
                Pourquoi Brandon pense ça.
              </h2>

              <p>
                Quelques preuves utilisées pour
                construire les portraits.
              </p>

              <div className="proofGrid">
                {data.analysis.profiles.map(
                  (p: any, i: number) => (
                    <div
                      className="proofCard"
                      key={i}
                    >
                      <div className="proofPerson">
                        <span>
                          {i ? "♡" : "✦"}
                        </span>
                        {p.person}
                      </div>

                      <h3>
                        {p.nickname ||
                          p.portrait}
                      </h3>

                      <p>{p.portrait}</p>

                      {p.evidence
                        ?.slice(0, 3)
                        .map(
                          (
                            e: any,
                            j: number
                          ) => (
                            <blockquote
                              key={j}
                            >
                              <q>
                                {e.quote}
                              </q>

                              <span>
                                {e.why}
                              </span>
                            </blockquote>
                          )
                        )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          <div className="privacyBox">
            <b>
              🔒 La conversation brute n'est pas
              stockée dans cette interface.
            </b>

            <span>
              Pour un lancement public, ajoute
              authentification, limitation de taille,
              suppression automatique et politique de
              confidentialité.
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
            }}
          >
            ← Analyser une autre conversation
          </button>
        </section>
      )}

      <footer>
        <b>coupleai</b>
        <span>
          Analyse conversationnelle · prototype
        </span>
        <span>♡ sans horoscope</span>
      </footer>
    </main>
  );
}
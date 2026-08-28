import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function SharedReport({ params }: PageProps) {
  const { id } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return (
      <main className="site">
        <section className="resultPage">
          <div className="error">
            ⚠ Le partage public n'est pas configuré.
          </div>
        </section>
      </main>
    );
  }

  const db = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await db
    .from("reports")
    .select("id, report, analysis, stats, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const stats = data.stats?.stats || {};
  const totalMessages = data.stats?.meta?.totalMessages;
  const durationDays = data.stats?.meta?.durationDays;

  const profiles = data.analysis?.profiles || [];

  return (
    <main className="site">
      <nav className="nav">
        <div className="brand">
          <span className="mark">✦</span>
          Conversation <span>Autopsy</span>
        </div>

        <div className="navRight">
          ● Rapport partagé
        </div>
      </nav>

      <section className="resultPage">
        <div className="resultTop">
          <div>
            <div className="eyebrow">✦ Rapport partagé</div>

            <div className="meta">
              Analyse réalisée par Jean-Michel
            </div>
          </div>
        </div>

        <div className="statsStrip">
          <div>
            <span>Messages</span>
            <b>{fmt(totalMessages)}</b>
          </div>

          <div>
            <span>Durée</span>
            <b>
              {durationDays
                ? `${fmt(durationDays)} j`
                : "—"}
            </b>
          </div>

          {Object.entries(stats)
            .slice(0, 2)
            .map(([sender, value]: [string, any]) => (
              <div key={sender}>
                <span>❤️ {sender}</span>
                <b>{fmt(value?.affectionTotal)}</b>
              </div>
            ))}
        </div>

        <article
          className="report"
          dangerouslySetInnerHTML={{
            __html: md(data.report || ""),
          }}
        />

        {profiles.length > 0 && (
          <section className="proofs">
            <div className="sectionKicker">
              LES COULISSES
            </div>

            <h2>Pourquoi Jean-Michel pense ça.</h2>

            <p>
              Quelques preuves utilisées pour construire les
              portraits.
            </p>

            <div className="proofGrid">
              {profiles.map((profile: any, i: number) => (
                <div className="proofCard" key={i}>
                  <div className="proofPerson">
                    <span>{i ? "♡" : "✦"}</span>
                    {profile.person}
                  </div>

                  <h3>
                    {profile.nickname || profile.portrait}
                  </h3>

                  <p>{profile.portrait}</p>

                  {profile.evidence
                    ?.slice(0, 3)
                    .map((e: any, j: number) => (
                      <blockquote key={j}>
                        <q>{e.quote}</q>
                        <span>{e.why}</span>
                      </blockquote>
                    ))}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="privacyBox">
          <b>
            🔒 Conversation Autopsy
          </b>

          <span>
            Ce rapport a été partagé publiquement.
            La conversation brute n'est pas affichée ici.
          </span>
        </div>

        <a
          className="back"
          href="/"
        >
          ✦ Faire ma propre autopsie
        </a>
      </section>

      <footer>
        <b>Conversation Autopsy</b>

        <span>
          Analyse conversationnelle · sans horoscope
        </span>

        <span>
          🩺 Jean-Michel enquête
        </span>
      </footer>
    </main>
  );
}
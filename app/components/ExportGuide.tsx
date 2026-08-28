import { useState } from "react";

export default function ExportGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="exportGuide">
      <button
        type="button"
        className={`exportGuideToggle ${open ? "open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="exportGuideToggleIcon">?</span>

        <span>
          <strong>Comment récupérer mon export ?</strong>
          <small>Guide rapide pour WhatsApp</small>
        </span>

        <span className="exportGuideChevron">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="exportGuidePanel">
          <div className="exportGuideContent">
            <div className="exportGuideHeading">
              <span className="exportGuideBigIcon">💬</span>

              <div>
                <div className="sectionKicker">
                  ÉTAPE 1 · RÉCUPÉRER VOS DONNÉES
                </div>

                <h3>Exporter une conversation WhatsApp</h3>
              </div>
            </div>

            <ol>
              <li>
                <span>1</span>
                <p>
                  Ouvrez la conversation à analyser et appuyez sur les
                  3 points en haut à droite.
                </p>
              </li>

              <li>
                <span>2</span>
                <p>
                  Choisissez <b>Plus</b>, puis{" "}
                  <b>« Exporter discussion »</b>.
                </p>
              </li>

              <li>
                <span>3</span>
                <p>
                  Choisissez <b>« Sans médias »</b> : nous avons uniquement
                  besoin du texte de la conversation.
                </p>
              </li>

              <li>
                <span>4</span>
                <p>
                  Enregistrez ou envoyez le fichier{" "}
                  <b>.txt</b> ou <b>.zip</b> obtenu.
                </p>
              </li>

              <li>
                <span>5</span>
                <p>
                  Déposez ensuite le fichier dans la zone d’analyse
                  ci-dessus.
                </p>
              </li>
            </ol>

            <div className="exportGuideNote">
              <b>À savoir</b>
              <span>
                Pour une grosse conversation, choisissez toujours
                « Sans médias » : le fichier sera beaucoup plus léger.
              </span>
            </div>

            <a
              className="exportGuideLink"
              href="https://faq.whatsapp.com/"
              target="_blank"
              rel="noreferrer"
            >
              Aide WhatsApp ↗
            </a>
          </div>

          <div className="exportGuidePrivacy">
            🔒{" "}
            <span>
              Ne donnez jamais votre mot de passe à Conversation Autopsy.
              Utilisez uniquement l’export officiel de WhatsApp.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
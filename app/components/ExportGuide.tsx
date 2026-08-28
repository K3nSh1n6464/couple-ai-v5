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

                <h3>
                  Comment exporter une conversation WhatsApp ?
                </h3>
              </div>
            </div>

            <div className="exportGuideSection">
              <h4>🤖 Sur Android</h4>

              <ol>
                <li>
                  <span>1</span>
                  <p>
                    Ouvrez WhatsApp et entrez dans la conversation à
                    analyser.
                  </p>
                </li>

                <li>
                  <span>2</span>
                  <p>
                    Appuyez sur <b>⋮</b> en haut à droite.
                  </p>
                </li>

                <li>
                  <span>3</span>
                  <p>
                    Sélectionnez <b>Plus → Exporter discussion</b>.
                  </p>
                </li>

                <li>
                  <span>4</span>
                  <p>
                    Choisissez <b>Sans médias</b>.
                  </p>
                </li>

                <li>
                  <span>5</span>
                  <p>
                    WhatsApp va créer votre export. Enregistrez le fichier
                    ou envoyez-le sur votre téléphone ou ordinateur.
                  </p>
                </li>

                <li>
                  <span>6</span>
                  <p>
                    Revenez sur <b>Discu-AI</b> et importez le fichier.
                  </p>
                </li>
              </ol>
            </div>

            <div className="exportGuideSection">
              <h4>🍎 Sur iPhone</h4>

              <ol>
                <li>
                  <span>1</span>
                  <p>
                    Ouvrez WhatsApp et sélectionnez la conversation.
                  </p>
                </li>

                <li>
                  <span>2</span>
                  <p>
                    Appuyez sur le <b>nom du contact</b> en haut de
                    l'écran.
                  </p>
                </li>

                <li>
                  <span>3</span>
                  <p>
                    Sélectionnez <b>Exporter discussion</b>.
                  </p>
                </li>

                <li>
                  <span>4</span>
                  <p>
                    Choisissez <b>Sans médias</b>.
                  </p>
                </li>

                <li>
                  <span>5</span>
                  <p>
                    Enregistrez ou partagez le fichier généré.
                  </p>
                </li>

                <li>
                  <span>6</span>
                  <p>
                    Importez-le ensuite dans <b>Discu-AI</b>.
                  </p>
                </li>
              </ol>
            </div>

            <div className="exportGuideNote">
              <b>À savoir</b>
              <span>
                Choisissez toujours « Sans médias ». Discu-AI analyse
                uniquement le texte de la conversation : les photos,
                vidéos et autres fichiers ne sont pas nécessaires.
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
              Ne donnez jamais votre mot de passe à Discu-AI. Utilisez
              uniquement l’export officiel de WhatsApp.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
import { useState } from "react";

type GuideId = "whatsapp" | "snapchat" | "instagram" | "telegram";

const guides: Record<
  GuideId,
  {
    icon: string;
    name: string;
    format: string;
    title: string;
    steps: string[];
    note: string;
    linkLabel: string;
    link: string;
  }
> = {
  whatsapp: {
    icon: "💬",
    name: "WhatsApp",
    format: "TXT ou ZIP",
    title: "Exporter une conversation WhatsApp",
    steps: [
      "Ouvrez la conversation à analyser.",
      "Ouvrez le menu de la conversation puis choisissez « Exporter discussion ».",
      "Choisissez « Sans médias » : nous avons besoin du texte, pas des photos et vidéos.",
      "Enregistrez ou envoyez le fichier .txt ou .zip obtenu.",
      "Déposez ensuite ce fichier dans la zone d'analyse ci-dessus.",
    ],
    note: "Pour une grosse conversation, « Sans médias » est recommandé : le fichier sera beaucoup plus léger.",
    linkLabel: "Aide WhatsApp",
    link: "https://faq.whatsapp.com/",
  },
  snapchat: {
    icon: "👻",
    name: "Snapchat",
    format: "ZIP",
    title: "Télécharger vos données Snapchat",
    steps: [
      "Connectez-vous à votre compte sur accounts.snapchat.com.",
      "Ouvrez « My Data / Mes données ».",
      "Choisissez les données et la période à exporter. Pour maximiser les données disponibles, vous pouvez demander toute la période.",
      "Cliquez sur « Submit » et attendez que Snapchat prépare l'export.",
      "Quand il est prêt, ouvrez « See exports », puis « Download ».",
      "Déposez le fichier .zip obtenu ici, sans le modifier.",
    ],
    note: "Snapchat indique que l'export My Data arrive sous forme de ZIP et peut contenir notamment le Saved Chat History. Certaines anciennes données peuvent toutefois ne plus être disponibles.",
    linkLabel: "Ouvrir Snapchat My Data",
    link: "https://accounts.snapchat.com/",
  },
  instagram: {
    icon: "📸",
    name: "Instagram",
    format: "ZIP",
    title: "Télécharger vos données Instagram",
    steps: [
      "Ouvrez Instagram et allez dans votre profil.",
      "Ouvrez le menu ☰ puis le Centre de comptes.",
      "Allez dans « Vos informations et autorisations » puis « Télécharger vos informations ».",
      "Sélectionnez votre compte Instagram et choisissez les données à télécharger, notamment les messages si l'option est proposée.",
      "Choisissez le téléchargement sur votre appareil et demandez l'export.",
      "Quand Meta vous indique que le fichier est prêt, téléchargez l'archive ZIP.",
      "Déposez le ZIP ici sans le décompresser ni renommer ses fichiers.",
    ],
    note: "Meta centralise le téléchargement des informations Instagram dans le Centre de comptes. Les intitulés peuvent légèrement varier selon la version de l'application.",
    linkLabel: "Centre de comptes Meta",
    link: "https://accountscenter.instagram.com/",
  },
  telegram: {
    icon: "✈️",
    name: "Telegram",
    format: "JSON ou ZIP",
    title: "Exporter une conversation Telegram",
    steps: [
      "Installez et ouvrez Telegram Desktop sur ordinateur.",
      "Pour une conversation précise, ouvrez-la puis le menu « ⋮ » et choisissez « Exporter l'historique du chat ».",
      "Vous pouvez aussi exporter plusieurs chats via Paramètres → Avancé → Exporter les données Telegram.",
      "Choisissez le format JSON si l'option est disponible.",
      "Lancez l'export puis récupérez le fichier ou le dossier généré.",
      "Déposez le JSON ou le ZIP ici.",
    ],
    note: "L'export de conversations Telegram se fait avec Telegram Desktop. Le JSON est le format le plus pratique pour Conversation Autopsy.",
    linkLabel: "Télécharger Telegram Desktop",
    link: "https://telegram.org/desktop",
  },
};

export default function ExportGuide() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GuideId>("whatsapp");

  const guide = guides[selected];

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
          <small>Guide rapide pour WhatsApp, Snapchat, Instagram et Telegram</small>
        </span>
        <span className="exportGuideChevron">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="exportGuidePanel">
          <div className="exportGuideTabs" role="tablist" aria-label="Plateformes">
            {(Object.keys(guides) as GuideId[]).map((id) => {
              const item = guides[id];

              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected === id}
                  key={id}
                  className={`exportGuideTab ${selected === id ? "active" : ""}`}
                  onClick={() => setSelected(id)}
                >
                  <span>{item.icon}</span>
                  <strong>{item.name}</strong>
                  <small>{item.format}</small>
                </button>
              );
            })}
          </div>

          <div className="exportGuideContent">
            <div className="exportGuideHeading">
              <span className="exportGuideBigIcon">{guide.icon}</span>
              <div>
                <div className="sectionKicker">ÉTAPE 1 · RÉCUPÉRER VOS DONNÉES</div>
                <h3>{guide.title}</h3>
              </div>
            </div>

            <ol>
              {guide.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>

            <div className="exportGuideNote">
              <b>À savoir</b>
              <span>{guide.note}</span>
            </div>

            <a
              className="exportGuideLink"
              href={guide.link}
              target="_blank"
              rel="noreferrer"
            >
              {guide.linkLabel} ↗
            </a>
          </div>

          <div className="exportGuidePrivacy">
            🔒 <span>Ne donnez jamais votre mot de passe à Conversation Autopsy. Utilisez uniquement l'export officiel de la plateforme.</span>
          </div>
        </div>
      )}
    </section>
  );
}

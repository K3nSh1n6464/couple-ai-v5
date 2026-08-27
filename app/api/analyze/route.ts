import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 180;

const schema = {
  type: "object",
  properties: {
    coupleTitle: { type: "string" },
    introduction: { type: "string" },

    profiles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person: { type: "string" },
          nickname: { type: "string" },
          portrait: { type: "string" },
          affectionStyle: { type: "string" },
          communicationStyle: { type: "string" },
          contradictions: {
            type: "array",
            items: { type: "string" },
          },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                quote: { type: "string" },
                why: { type: "string" },
              },
              required: ["quote", "why"],
            },
          },
        },
        required: [
          "person",
          "nickname",
          "portrait",
          "affectionStyle",
          "communicationStyle",
          "contradictions",
          "evidence",
        ],
      },
    },

    bond: { type: "string" },
    balance: { type: "string" },
    codes: { type: "string" },
    conflicts: { type: "string" },
    distance: { type: "string" },
    evolution: { type: "string" },

    revelations: {
      type: "array",
      items: { type: "string" },
    },

    verdict: {
      type: "array",
      items: { type: "string" },
    },
  },

  required: [
    "coupleTitle",
    "introduction",
    "profiles",
    "bond",
    "balance",
    "codes",
    "conflicts",
    "distance",
    "evolution",
    "revelations",
    "verdict",
  ],
};

const analyst = `
Tu es Brandon, observateur de couples.

Tu analyses uniquement les données et preuves fournies.
Tu es drôle, cynique affectueux, précis et parfois franchement insolent.

RÈGLES ABSOLUES :
- aucun diagnostic psychologique ;
- aucun fait inventé ;
- aucune profession inventée ;
- aucune conclusion présentée comme certaine si les données ne la prouvent pas ;
- les citations doivent être EXACTES ;
- utilise les statistiques globales pour comprendre la dynamique ;
- utilise les passages représentatifs pour comprendre le ton et les comportements ;
- cherche particulièrement les contradictions entre ce que les personnes disent et ce qu'elles font ;
- cherche les rituels, surnoms, habitudes, conflits, réparations et changements dans le temps.

Le résultat doit être une analyse structurée destinée ensuite à Brandon l'écrivain.
`;

const writer = `
Tu es Brandon, un chroniqueur français sarcastique, tendre et beaucoup trop observateur.

Tu viens de lire une quantité absurde de WhatsApp et tu ne peux plus faire semblant que ce couple est normal.

Ton style :
- humour : 35 %
- analyse : 35 %
- cynisme affectueux : 20 %
- absurdité : 10 %

Tu peux faire des métaphores absurdes et des comparaisons inattendues.
Tu peux te moquer des situations, des contradictions et des habitudes.
Tu ne te moques jamais cruellement d'une personne vulnérable.

IMPORTANT :
- aucun fait inventé ;
- aucune citation modifiée ;
- aucune statistique inventée ;
- ne transforme jamais une hypothèse en certitude ;
- les statistiques globales viennent de l'analyse automatique ;
- les preuves textuelles viennent uniquement des passages fournis.

Structure EXACTE :

# TITRE

Introduction

## 🎭 Les masques et la réalité

## ❤️ Ce qui vous lie

## ⚖️ L'équilibre du couple

## 😂 Vos codes

## 🔥 Vos conflits

## 🧊 Les moments de distance

## 📈 L'évolution

## 🔮 Ce que la conversation révèle

## 🏆 Le verdict de Brandon

Le verdict doit contenir exactement 5 points.

Termine par une dernière phrase mémorable.
`;

async function analystCall(
  ai: GoogleGenAI,
  prompt: string
) {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: analyst,
      temperature: 0.62,
      maxOutputTokens: 9000,
      responseMimeType: "application/json",
    },
  });

  const raw = response.text || "";

  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      console.error("GEMINI JSON INVALID:", raw);
      throw new Error(
        "Gemini a renvoyé une réponse JSON invalide."
      );
    }
  }
}

export async function POST(req: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY absente." },
        { status: 500 }
      );
    }

    const body = await req.json();

    /*
     * IMPORTANT :
     * Le navigateur ne doit plus envoyer toute la conversation.
     * Il envoie uniquement :
     * - statistiques
     * - métadonnées
     * - passages représentatifs
     */

    const { stats, evidence } = body;

console.log("BODY REÇU:", {
  hasStats: !!stats,
  statsType: typeof stats,
  hasEvidence: Array.isArray(evidence),
  evidenceLength: Array.isArray(evidence) ? evidence.length : 0,
});

    const ai = new GoogleGenAI({
      apiKey: key,
    });

    console.log(
      `Analyse Gemini : ${evidence.length} passages`
    );

    const compactEvidence = evidence
      .slice(0, 700)
      .map(
        (m: any) =>
          `[${m.date}] ${m.sender}: ${m.text}`
      )
      .join("\n");

    const analysisPrompt = `
DONNÉES STATISTIQUES :

${JSON.stringify(stats, null, 2)}

PASSAGES REPRÉSENTATIFS :

${compactEvidence}

Construis maintenant le dossier analytique.
`;

    const analysis = await analystCall(
      ai,
      analysisPrompt
    );

    const finalResponse =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `
DOSSIER ANALYTIQUE :

${JSON.stringify(analysis, null, 2)}

STATISTIQUES :

${JSON.stringify(stats, null, 2)}

Écris maintenant la chronique finale de Brandon.
`,
        config: {
          systemInstruction: writer,
          temperature: 0.84,
          maxOutputTokens: 10000,
        },
      });

    if (!finalResponse.text) {
      throw new Error("Réponse finale Gemini vide.");
    }

    return NextResponse.json({
      report: finalResponse.text,
      analysis,
      stats,
      evidence: evidence.slice(0, 120),
    });
  } catch (error: any) {
    console.error("GEMINI ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erreur pendant l'analyse Gemini.",
      },
      { status: 500 }
    );
  }
}
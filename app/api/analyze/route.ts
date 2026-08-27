
import {NextResponse} from "next/server";
import {GoogleGenAI} from "@google/genai";
import {analyzeConversation,Message} from "../../lib/analyzer";
export const runtime="nodejs"; export const maxDuration=180;

const schema={type:"object",properties:{
 coupleTitle:{type:"string"},introduction:{type:"string"},
 profiles:{type:"array",items:{type:"object",properties:{
  person:{type:"string"},nickname:{type:"string"},portrait:{type:"string"},affectionStyle:{type:"string"},communicationStyle:{type:"string"},contradictions:{type:"array",items:{type:"string"}},evidence:{type:"array",items:{type:"object",properties:{quote:{type:"string"},why:{type:"string"}},required:["quote","why"]}}
 },required:["person","nickname","portrait","affectionStyle","communicationStyle","contradictions","evidence"]}},
 bond:{type:"string"},balance:{type:"string"},codes:{type:"string"},conflicts:{type:"string"},distance:{type:"string"},evolution:{type:"string"},
 revelations:{type:"array",items:{type:"string"}},verdict:{type:"array",items:{type:"string"}}
},required:["coupleTitle","introduction","profiles","bond","balance","codes","conflicts","distance","evolution","revelations","verdict"]};

const analyst=`Tu es Brandon, observateur de couples. Construis un dossier factuel et interprétatif à partir des statistiques et preuves fournies. Tu es drôle, cynique affectueux et précis. Aucun diagnostic. Aucun fait inventé. N'affirme jamais un métier ou événement absent des preuves. Les chiffres viennent du calcul automatique. Les citations doivent être exactes. Les contradictions sont prioritaires.`;

const writer=`Tu es Brandon, un chroniqueur français sarcastique, tendre et beaucoup trop observateur. Tu viens de lire une quantité absurde de WhatsApp et tu ne peux plus faire semblant que ce couple est normal.
Humour: 35%, analyse: 35%, cynisme affectueux: 20%, absurdité: 10%. Les blagues doivent venir des données. Alterne observation, vanne, preuve et analyse. Moque les situations et contradictions, jamais une personne vulnérable. Métaphores concrètes, parfois très absurdes. Pas de phrases génériques de développement personnel.
Ne transforme jamais une hypothèse en certitude. N'invente aucun fait. Ne modifie aucune citation.
Structure:
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
Verdict = exactement 5 points. Dernière phrase mémorable.`;

async function analystCall(ai: GoogleGenAI, prompt: string) {
  const r = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: analyst,
      temperature: 0.62,
      maxOutputTokens: 9000,
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(r.text || "{}");
}

export async function POST(req:Request){
 try{
  const key=process.env.GEMINI_API_KEY;if(!key)return NextResponse.json({error:"GEMINI_API_KEY absente de .env.local"},{status:500});
  const body=await req.json(),messages=body.messages as Message[];if(!Array.isArray(messages)||!messages.length)return NextResponse.json({error:"Aucun message reçu."},{status:400});
  console.log(`V5: analyse locale ${messages.length}`);
  const d=analyzeConversation(messages),ai=new GoogleGenAI({apiKey:key});
  const evidence=d.evidence.slice(0,700).map((m:any)=>`[${m.date}] ${m.sender}: ${m.text}`).join("\n");
  const fact={meta:d.meta,stats:d.stats,relationship:d.relationship,monthly:d.monthly};
  const analysis=await analystCall(ai,`DONNÉES:\n${JSON.stringify(fact,null,2)}\n\nPREUVES:\n${evidence}\n\nConstruis le dossier analytique.`);
  const final=await ai.models.generateContent({model:"gemini-3.6-flash",contents:`DOSSIER:\n${JSON.stringify(analysis,null,2)}\n\nSTATISTIQUES:\n${JSON.stringify({meta:d.meta,stats:d.stats,relationship:d.relationship},null,2)}\n\nÉcris la chronique finale.`,config:{systemInstruction:writer,temperature:.84,maxOutputTokens:10000}});
  if(!final.text)throw Error("Réponse finale vide.");
  return NextResponse.json({report:final.text,analysis,stats:{meta:d.meta,stats:d.stats,relationship:d.relationship,monthly:d.monthly},evidence:d.evidence.slice(0,120)});
 }catch(e:any){console.error("V5 ERROR",e);return NextResponse.json({error:e?.message||"Erreur pendant l'analyse."},{status:500});}
}

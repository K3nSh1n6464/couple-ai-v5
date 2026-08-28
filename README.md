
# Couple AI V4 — qualité Brandon

Cette version ajoute:
- analyse locale sur toute la conversation;
- passage IA 1: dossier structuré des deux personnes + dynamique;
- passage IA 2: écriture narrative finale;
- preuves affichées sous le rapport;
- timeline/statistiques disponibles côté données;
- export Markdown;
- partage public optionnel via Supabase;
- interface premium responsive.

## Installation

Dans ton projet existant:

```bash
npm install @google/genai jszip
npm run dev
```

`.env.local`:
```env
GEMINI_API_KEY=...
```

## Remplacement

Copie:
- `app/lib/analyzer.ts`
- `app/api/analyze/route.ts`
- `app/page.tsx`
- `app/globals.css`

Le modèle Gemini utilisé est `gemini-3.6-flash`.

## Partage public optionnel

Supabase est utilisé uniquement si tu veux des URLs `/r/<id>`.

1. Crée un projet Supabase.
2. Exécute `supabase/schema.sql` dans SQL Editor.
3. Ajoute:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
4. Pour créer réellement un lien depuis l'interface, branche `POST /api/share` au bouton Partager.

NE JAMAIS exposer `SUPABASE_SERVICE_ROLE_KEY` au navigateur.

Supabase recommande RLS pour sécuriser les données et de conserver les secrets dans les variables d'environnement. Voir la documentation officielle.

## Déploiement Vercel

Pousse le projet sur GitHub puis importe le repo dans Vercel.
Ajoute `GEMINI_API_KEY` dans les Environment Variables Vercel.
Pour Supabase, ajoute les trois variables correspondantes.
Ne commit jamais `.env.local`.

## Production avant lancement

- authentification si nécessaire;
- rate limiting;
- limite de taille du ZIP;
- suppression automatique des rapports;
- RLS stricte si les rapports deviennent privés;
- journalisation minimale;
- politique de confidentialité + consentement;
- gestion des erreurs de quota Gemini;
- file de jobs pour les très gros exports;
- tests des formats WhatsApp iOS/Android;
- système de paiement si commercialisation.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        {
          error: "Supabase non configuré.",
        },
        { status: 501 }
      );
    }

    const body = await req.json();

    if (!body?.report) {
      return NextResponse.json(
        {
          error: "Rapport manquant.",
        },
        { status: 400 }
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
      .insert({
        report: body.report,
        analysis: body.analysis ?? null,
        stats: body.stats ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("SUPABASE SHARE ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
    });
  } catch (error) {
    console.error("SHARE ERROR:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la création du partage.",
      },
      { status: 500 }
    );
  }
}
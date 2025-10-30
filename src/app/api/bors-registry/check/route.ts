import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * GET /api/bors-registry/check?id=<borsId>
 * Sjekker om en børs-ID er ledig
 * Returns: { available: boolean, borsId: string, suggestions?: string[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const borsId = searchParams.get('id');

    if (!borsId) {
      return NextResponse.json(
        { available: false, message: 'Børs-ID er påkrevd' },
        { status: 400 }
      );
    }

    // Normaliser børs-ID
    const normalizedId = borsId.trim().toLowerCase();

    // Valider format
    const validFormat = /^[a-z0-9-]{3,30}$/;
    if (!validFormat.test(normalizedId)) {
      return NextResponse.json({
        available: false,
        borsId: normalizedId,
        message: 'Ugyldig format',
      });
    }

    // Sjekk om børs-ID er tatt
    const key = `bors_registry:${normalizedId}`;
    const existing = await kv.get(key);

    if (existing) {
      // Generer forslag til alternative navn
      const suggestions = [
        `${normalizedId}-2`,
        `${normalizedId}-a`,
        `${normalizedId}-ny`,
      ];

      return NextResponse.json({
        available: false,
        borsId: normalizedId,
        suggestions,
      });
    }

    return NextResponse.json({
      available: true,
      borsId: normalizedId,
    });
  } catch (error) {
    console.error('Error checking bors ID:', error);
    return NextResponse.json(
      { available: false, message: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * POST /api/bors-registry/claim
 * Registrerer en børs-ID hvis den er ledig
 * Body: { borsId: string }
 * Returns: { success: boolean, message: string, borsId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { borsId } = body;

    // Validering
    if (!borsId || typeof borsId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Børs-ID er påkrevd' },
        { status: 400 }
      );
    }

    // Normaliser børs-ID (lowercase, trim)
    const normalizedId = borsId.trim().toLowerCase();

    // Valider format (3-30 tegn, kun bokstaver, tall og bindestrek)
    const validFormat = /^[a-z0-9-]{3,30}$/;
    if (!validFormat.test(normalizedId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Børs-ID må være 3-30 tegn og kun inneholde bokstaver, tall og bindestrek',
        },
        { status: 400 }
      );
    }

    // Sjekk om børs-ID allerede er tatt
    const key = `bors_registry:${normalizedId}`;
    const existing = await kv.get(key);

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Børs-ID er allerede i bruk' },
        { status: 409 }
      );
    }

    // Registrer børs-ID
    await kv.set(key, {
      createdAt: new Date().toISOString(),
      borsId: normalizedId,
    });

    return NextResponse.json({
      success: true,
      message: 'Børs-ID registrert!',
      borsId: normalizedId,
    });
  } catch (error) {
    console.error('Error claiming bors ID:', error);
    return NextResponse.json(
      { success: false, message: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

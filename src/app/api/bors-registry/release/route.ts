import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * DELETE /api/bors-registry/release
 * Fjerner en registrert børs-ID
 * Body: { borsId: string }
 * Returns: { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { borsId } = body;

    if (!borsId || typeof borsId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Børs-ID er påkrevd' },
        { status: 400 }
      );
    }

    // Normaliser børs-ID
    const normalizedId = borsId.trim().toLowerCase();

    // Slett børs-ID fra registry
    const key = `bors_registry:${normalizedId}`;
    const deleted = await kv.del(key);

    if (deleted === 0) {
      return NextResponse.json(
        { success: false, message: 'Børs-ID finnes ikke i registeret' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Børs-ID fjernet fra registeret',
    });
  } catch (error) {
    console.error('Error releasing bors ID:', error);
    return NextResponse.json(
      { success: false, message: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

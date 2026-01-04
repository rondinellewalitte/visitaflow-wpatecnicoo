/**
 * API Route: /api/push/vapid-key
 * 
 * Retorna a chave pública VAPID para o cliente usar na subscription
 * 
 * Método: GET
 */

import { NextResponse } from 'next/server';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

export async function GET() {
  if (!vapidPublicKey) {
    return NextResponse.json(
      { message: 'VAPID public key não configurada' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey: vapidPublicKey });
}


import { NextRequest, NextResponse } from 'next/server';
import { TelegramRequest } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  try {
    const body: TelegramRequest = await req.json();

    if (!body.botToken || !body.chatId || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const url = `https://api.telegram.org/bot${encodeURIComponent(body.botToken)}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: body.chatId,
        text: body.message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Telegram API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, messageId: data.result?.message_id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

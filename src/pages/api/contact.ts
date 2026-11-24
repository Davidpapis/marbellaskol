import type { APIRoute } from 'astro';

export const prerender = false;

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  propertyRef?: string;
  website?: string; // honeypot antispam
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as ContactPayload;

    // Honeypot silencioso contra bots
    if (body.website && body.website.trim().length > 0) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const message = (body.message ?? '').trim();

    if (name.length < 2 || !email.includes('@') || message.length < 10) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Please complete your name, a valid email address and a message.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // TODO: conectar con Resend / SMTP de skol@marbellaskol.com cuando se configuren credenciales de envío
    return new Response(
      JSON.stringify({
        ok: true,
        receivedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid request payload.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

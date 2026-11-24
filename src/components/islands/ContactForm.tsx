import { useState, type FormEvent } from 'react';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  propertyRef?: string;
}

export default function ContactForm({ lang, propertyRef = '' }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const t =
    lang === 'es'
      ? {
          name: 'Nombre completo',
          email: 'Correo electrónico',
          phone: 'Teléfono / WhatsApp (opcional)',
          message: '¿Qué fechas o apartamento buscas?',
          send: 'Enviar consulta directa',
          sending: 'Enviando...',
          successTitle: 'Consulta enviada',
          successDesc: 'Gracias. Nuestro equipo local en Marbella te responderá muy pronto.',
          genericErr: 'No se pudo enviar el mensaje. Por favor, revisa los datos o escríbenos por WhatsApp.',
        }
      : {
          name: 'Full name',
          email: 'Email address',
          phone: 'Phone / WhatsApp (optional)',
          message: 'Which dates or apartment are you looking for?',
          send: 'Send Direct Enquiry',
          sending: 'Sending...',
          successTitle: 'Enquiry sent',
          successDesc: 'Thank you. Our local team in Marbella will get back to you shortly.',
          genericErr: 'Unable to send your message. Please check your details or message us on WhatsApp.',
        };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorText('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message, propertyRef, website }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setErrorText(data.error || t.genericErr);
        return;
      }
      setStatus('success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setStatus('error');
      setErrorText(t.genericErr);
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-saving/30 bg-saving-tint p-6 text-saving"
      >
        <p className="font-serif text-xl font-semibold">{t.successTitle}</p>
        <p className="mt-2 text-sm">{t.successDesc}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-sand-200 bg-surface p-6">
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t.name}</span>
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-sand-200 bg-sand-50 px-3.5 text-sm text-ink focus:border-sea focus:outline-none"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t.email}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-sand-200 bg-sand-50 px-3.5 text-sm text-ink focus:border-sea focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t.phone}</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-sand-200 bg-sand-50 px-3.5 text-sm text-ink focus:border-sea focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t.message}</span>
        <textarea
          required
          minLength={10}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-sand-200 bg-sand-50 p-3.5 text-sm text-ink focus:border-sea focus:outline-none"
        />
      </label>

      {status === 'error' && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {errorText}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="btn-tactile h-12 w-full cursor-pointer rounded-full bg-sea px-6 text-sm font-semibold text-white hover:bg-sea-dark disabled:opacity-60"
      >
        {status === 'submitting' ? t.sending : t.send}
      </button>
    </form>
  );
}

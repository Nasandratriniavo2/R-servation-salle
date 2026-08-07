/**
 * Envoi d'emails via Gmail SMTP (mot de passe d'application).
 * Si SMTP_USER / SMTP_PASS absents → mode simulation (log console uniquement).
 */
import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST || 'smtp.gmail.com'
const port = Number(process.env.SMTP_PORT) || 587
const user = process.env.SMTP_USER || ''
const pass = process.env.SMTP_PASS || ''
const from = process.env.SMTP_FROM || (user ? `SalleLibre <${user}>` : 'SalleLibre <noreply@sallelibre.local>')

let transporter = null

function isConfigured() {
  return Boolean(user && pass)
}

function getTransporter() {
  if (!isConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

/**
 * Envoie un email.
 * @returns {{ ok: boolean, simulated?: boolean, error?: string, messageId?: string }}
 */
export async function sendMail({ to, subject, body }) {
  if (!to) {
    return { ok: false, error: 'Destinataire manquant' }
  }

  const transport = getTransporter()

  if (!transport) {
    console.log('[mailer] SMTP non configure — simulation')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${String(body).slice(0, 120)}...`)
    return { ok: true, simulated: true }
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text: body,
    })
    console.log(`[mailer] Email envoye a ${to} (${info.messageId})`)
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    console.error('[mailer] Echec envoi:', err.message)
    return { ok: false, error: err.message }
  }
}

export function mailerStatus() {
  return {
    configured: isConfigured(),
    host,
    port,
    user: user ? user.replace(/(.{2}).+(@.+)/, '$1***$2') : null,
  }
}

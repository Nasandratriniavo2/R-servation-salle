// Simulation d'un service d'envoi d'email (TECH-04).
// En demonstration, aucun email reel n'est envoye : chaque notification
// est journalisee en memoire et emise pour affichage (toast).
// Les insertions dans logs_emails sont gerees cote db.js apres chaque action.
//
// En production, remplacer sendMail() par un appel Nodemailer reel.

const mailListeners = new Set()
const memoryEmails = []

export function onMailSent(callback) {
  mailListeners.add(callback)
  return () => mailListeners.delete(callback)
}

export function sendMail({ to, subject, body }) {
  const email = {
    id: `mail_${Date.now().toString(36)}`,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  }
  memoryEmails.unshift(email)
  mailListeners.forEach((cb) => cb(email))
  return email
}

export function getEmails() {
  return memoryEmails
}

/**
 * SalleLibre — API Express + MySQL
 * Remplace le client Supabase : le frontend appelle ces routes REST.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json())

// ---------------------------------------------------------------------------
// Pool MySQL
// ---------------------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sallelibre',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z',
})

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeToHHMM(t) {
  if (!t) return ''
  if (typeof t === 'string') return t.slice(0, 5)
  // mysql2 peut renvoyer un Date pour TIME selon la config
  if (t instanceof Date) {
    return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
  }
  return String(t).slice(0, 5)
}

function dateToISO(d) {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA)
}

const ROLE_CODE_TO_UI = {
  enseignant: 'enseignant',
  etudiant_association: 'etudiant',
  admin_logistique: 'admin',
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.nom,
    email: row.email,
    role: ROLE_CODE_TO_UI[row.role_code] || row.role_code,
    roleCode: row.role_code,
    actif: Boolean(row.actif),
  }
}

function mapRoom(row, equipementCodes = []) {
  return {
    id: row.id,
    name: row.nom,
    batiment: row.batiment,
    etage: row.etage,
    capacite: row.capacite,
    localisation: row.localisation || '',
    notes: row.notes || '',
    actif: Boolean(row.actif),
    equipements: equipementCodes,
  }
}

function mapReservation(row) {
  return {
    id: row.id,
    roomId: row.salle_id,
    userId: row.user_id,
    userName: row.user_nom,
    userRole: ROLE_CODE_TO_UI[row.user_role] || row.user_role,
    titre: row.titre,
    date: dateToISO(row.date_reservation),
    heureDebut: timeToHHMM(row.heure_debut),
    heureFin: timeToHHMM(row.heure_fin),
    statut: row.statut,
    motifRefus: row.motif_refus || '',
    createdAt: row.created_at,
    salleNom: row.salle_nom,
    batiment: row.batiment,
    capacite: row.capacite,
  }
}

async function fetchEquipementsBySalle() {
  const rows = await query(`
    SELECT se.salle_id, e.code
    FROM salle_equipements se
    JOIN equipements e ON e.id = se.equipement_id
  `)
  const map = {}
  for (const row of rows) {
    if (!map[row.salle_id]) map[row.salle_id] = []
    map[row.salle_id].push(row.code)
  }
  return map
}

async function insertHistorique(reservationId, statut, effectuePar, commentaire = null) {
  await query(
    `INSERT INTO reservation_historique (id, reservation_id, statut, effectue_par, commentaire)
     VALUES (:id, :rid, :statut, :par, :commentaire)`,
    {
      id: uuidv4(),
      rid: reservationId,
      statut,
      par: effectuePar || null,
      commentaire,
    },
  )
}

async function logEmail(reservationId, destinataire, type, sujet, corps) {
  await query(
    `INSERT INTO logs_emails (id, reservation_id, destinataire_email, type_notification, sujet, corps, statut_envoi)
     VALUES (:id, :rid, :email, :type, :sujet, :corps, 'envoye')`,
    {
      id: uuidv4(),
      rid: reservationId,
      email: destinataire,
      type,
      sujet,
      corps,
    },
  )
}

async function getUserEmail(userId) {
  const rows = await query(`SELECT email FROM users WHERE id = :id`, { id: userId })
  return rows[0]?.email || 'inconnu@etablissement.fr'
}

function isConflictError(err) {
  return (
    err &&
    (err.message?.includes('CONFLIT_CRENEAU') ||
      err.sqlMessage?.includes('CONFLIT_CRENEAU') ||
      err.code === 'ER_SIGNAL_EXCEPTION')
  )
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true, db: 'mysql' })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
app.get('/api/users', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.nom, u.email, u.actif, r.code AS role_code
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.actif = 1
      ORDER BY u.nom
    `)
    res.json(rows.map(mapUser))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Equipements (liste complete pour les formulaires)
// ---------------------------------------------------------------------------
app.get('/api/equipements', async (_req, res) => {
  try {
    const rows = await query(`SELECT id, code, libelle FROM equipements ORDER BY id`)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Salles
// ---------------------------------------------------------------------------
app.get('/api/rooms', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true'
    const sql = includeInactive
      ? `SELECT * FROM salles ORDER BY nom`
      : `SELECT * FROM salles WHERE actif = 1 ORDER BY nom`
    const rows = await query(sql)
    const eqMap = await fetchEquipementsBySalle()
    res.json(rows.map((s) => mapRoom(s, eqMap[s.id] || [])))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM salles WHERE id = :id`, { id: req.params.id })
    if (!rows[0]) return res.status(404).json({ error: 'Salle introuvable' })
    const eqMap = await fetchEquipementsBySalle()
    res.json(mapRoom(rows[0], eqMap[rows[0].id] || []))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/rooms', async (req, res) => {
  try {
    const form = req.body
    const id = uuidv4()
    await query(
      `INSERT INTO salles (id, nom, batiment, etage, capacite, notes, actif)
       VALUES (:id, :nom, :batiment, :etage, :capacite, :notes, 1)`,
      {
        id,
        nom: form.name,
        batiment: form.batiment || null,
        etage: form.etage !== '' && form.etage != null ? Number(form.etage) : null,
        capacite: Number(form.capacite),
        notes: form.notes || null,
      },
    )

    if (form.equipements?.length) {
      const eqs = await query(
        `SELECT id, code FROM equipements WHERE code IN (${form.equipements.map((_, i) => `:c${i}`).join(',')})`,
        Object.fromEntries(form.equipements.map((c, i) => [`c${i}`, c])),
      )
      for (const e of eqs) {
        await query(
          `INSERT INTO salle_equipements (salle_id, equipement_id) VALUES (:sid, :eid)`,
          { sid: id, eid: e.id },
        )
      }
    }

    const room = await query(`SELECT * FROM salles WHERE id = :id`, { id })
    res.status(201).json(mapRoom(room[0], form.equipements || []))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const form = req.body
    const roomId = req.params.id
    await query(
      `UPDATE salles SET nom = :nom, batiment = :batiment, etage = :etage,
       capacite = :capacite, notes = :notes WHERE id = :id`,
      {
        id: roomId,
        nom: form.name,
        batiment: form.batiment || null,
        etage: form.etage !== '' && form.etage != null ? Number(form.etage) : null,
        capacite: Number(form.capacite),
        notes: form.notes || null,
      },
    )

    await query(`DELETE FROM salle_equipements WHERE salle_id = :id`, { id: roomId })
    if (form.equipements?.length) {
      const eqs = await query(
        `SELECT id, code FROM equipements WHERE code IN (${form.equipements.map((_, i) => `:c${i}`).join(',')})`,
        Object.fromEntries(form.equipements.map((c, i) => [`c${i}`, c])),
      )
      for (const e of eqs) {
        await query(
          `INSERT INTO salle_equipements (salle_id, equipement_id) VALUES (:sid, :eid)`,
          { sid: roomId, eid: e.id },
        )
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM reservations WHERE salle_id = :id`,
      { id: roomId },
    )
    const count = Number(rows[0]?.cnt || 0)
    if (count > 0) {
      await query(`UPDATE salles SET actif = 0 WHERE id = :id`, { id: roomId })
    } else {
      await query(`DELETE FROM salles WHERE id = :id`, { id: roomId })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Conflicts / disponibilite
// ---------------------------------------------------------------------------
app.get('/api/conflicts', async (req, res) => {
  try {
    const { roomId, date, heureDebut, heureFin, ignoreReservationId } = req.query
    let sql = `
      SELECT * FROM v_reservations_detail
      WHERE salle_id = :roomId
        AND date_reservation = :date
        AND statut IN ('confirmee', 'en_attente')
    `
    const params = { roomId, date }
    if (ignoreReservationId) {
      sql += ` AND id <> :ignoreId`
      params.ignoreId = ignoreReservationId
    }
    const rows = await query(sql, params)
    const mapped = rows
      .map(mapReservation)
      .filter((r) => overlaps(heureDebut, heureFin, r.heureDebut, r.heureFin))
    res.json(mapped)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
app.get('/api/reservations', async (req, res) => {
  try {
    const { userId, statut } = req.query
    let sql = `SELECT * FROM v_reservations_detail WHERE 1=1`
    const params = {}
    if (userId) {
      sql += ` AND user_id = :userId`
      params.userId = userId
    }
    if (statut) {
      sql += ` AND statut = :statut`
      params.statut = statut
    }
    sql += ` ORDER BY date_reservation DESC, heure_debut DESC`
    const rows = await query(sql, params)
    res.json(rows.map(mapReservation))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/reservations', async (req, res) => {
  try {
    const { roomId, user, titre, date, heureDebut, heureFin } = req.body

    if (toMinutes(heureFin) <= toMinutes(heureDebut)) {
      return res.status(400).json({
        ok: false,
        error: "L'heure de fin doit etre posterieure a l'heure de debut.",
      })
    }

    // Controle applicatif (message clair)
    const conflicts = await query(
      `SELECT * FROM v_reservations_detail
       WHERE salle_id = :roomId AND date_reservation = :date
         AND statut IN ('confirmee', 'en_attente')`,
      { roomId, date },
    )
    const mappedConflicts = conflicts
      .map(mapReservation)
      .filter((r) => overlaps(heureDebut, heureFin, r.heureDebut, r.heureFin))
    if (mappedConflicts.length > 0) {
      const c = mappedConflicts[0]
      return res.status(409).json({
        ok: false,
        error: `Creneau indisponible : la salle est deja reservee de ${c.heureDebut} a ${c.heureFin} le ${date} (${c.statut === 'confirmee' ? 'reservation confirmee' : 'demande en attente'}). Veuillez choisir un autre creneau.`,
      })
    }

    const isEnseignant = user.role === 'enseignant'
    const statut = isEnseignant ? 'confirmee' : 'en_attente'
    const id = uuidv4()

    try {
      await query(
        `INSERT INTO reservations
           (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
         VALUES
           (:id, :roomId, :userId, :titre, :date, :hd, :hf, :statut)`,
        {
          id,
          roomId,
          userId: user.id,
          titre: titre || 'Reservation de salle',
          date,
          hd: heureDebut.length === 5 ? `${heureDebut}:00` : heureDebut,
          hf: heureFin.length === 5 ? `${heureFin}:00` : heureFin,
          statut,
        },
      )
    } catch (err) {
      if (isConflictError(err)) {
        return res.status(409).json({
          ok: false,
          error: 'Creneau indisponible : ce creneau vient d etre reserve par un autre utilisateur. Veuillez choisir un autre horaire.',
        })
      }
      throw err
    }

    await insertHistorique(
      id,
      statut,
      user.id,
      isEnseignant ? 'Reservation directe Enseignant' : 'Demande soumise',
    )

    const roomRows = await query(`SELECT nom FROM salles WHERE id = :id`, { id: roomId })
    const roomName = roomRows[0]?.nom || 'salle'

    if (isEnseignant) {
      const sujet = `Reservation confirmee — ${roomName}`
      const corps = `Bonjour ${user.name},\n\nVotre reservation de la salle ${roomName} le ${date} de ${heureDebut} a ${heureFin} est confirmee.\n\nService Logistique`
      await logEmail(id, user.email, 'confirmation', sujet, corps)
    } else {
      const sujet = `Demande de reservation recue — ${roomName}`
      const corps = `Bonjour ${user.name},\n\nVotre demande de reservation de la salle ${roomName} le ${date} de ${heureDebut} a ${heureFin} a bien ete transmise au service Logistique. Vous recevrez un email des qu'elle sera traitee.\n\nService Logistique`
      await logEmail(id, user.email, 'confirmation', sujet, corps)
    }

    res.status(201).json({
      ok: true,
      reservation: {
        id,
        roomId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        titre: titre || 'Reservation de salle',
        date,
        heureDebut,
        heureFin,
        statut,
        motifRefus: '',
        salleNom: roomName,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/reservations/:id/validate', async (req, res) => {
  try {
    const reservationId = req.params.id
    const { adminUser } = req.body

    const rows = await query(`SELECT * FROM v_reservations_detail WHERE id = :id`, {
      id: reservationId,
    })
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'Reservation introuvable.' })
    const mapped = mapReservation(rows[0])

    const conflicts = await query(
      `SELECT * FROM v_reservations_detail
       WHERE salle_id = :roomId AND date_reservation = :date
         AND statut IN ('confirmee', 'en_attente') AND id <> :id`,
      { roomId: mapped.roomId, date: mapped.date, id: reservationId },
    )
    const mappedConflicts = conflicts
      .map(mapReservation)
      .filter((r) => overlaps(mapped.heureDebut, mapped.heureFin, r.heureDebut, r.heureFin))
    const conflitConfirme = mappedConflicts.find((c) => c.statut === 'confirmee')
    if (conflitConfirme) {
      return res.status(409).json({
        ok: false,
        error: 'Impossible de valider : ce creneau est en conflit avec une reservation deja confirmee.',
      })
    }

    try {
      await query(
        `UPDATE reservations SET statut = 'confirmee', motif_refus = NULL WHERE id = :id`,
        { id: reservationId },
      )
    } catch (err) {
      if (isConflictError(err)) {
        return res.status(409).json({
          ok: false,
          error: 'Impossible de valider : conflit de creneau detecte par la base.',
        })
      }
      throw err
    }

    await insertHistorique(reservationId, 'confirmee', adminUser.id, 'Validation Logistique')

    const email = await getUserEmail(mapped.userId)
    const sujet = `Reservation confirmee — ${mapped.salleNom}`
    const corps = `Bonjour ${mapped.userName},\n\nVotre reservation de la salle ${mapped.salleNom} le ${mapped.date} de ${mapped.heureDebut} a ${mapped.heureFin} a ete validee par le service Logistique.\n\nService Logistique`
    await logEmail(reservationId, email, 'validation', sujet, corps)

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/reservations/:id/reject', async (req, res) => {
  try {
    const reservationId = req.params.id
    const { adminUser, motif = '' } = req.body

    const rows = await query(`SELECT * FROM v_reservations_detail WHERE id = :id`, {
      id: reservationId,
    })
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'Reservation introuvable.' })
    const mapped = mapReservation(rows[0])

    await query(
      `UPDATE reservations SET statut = 'refusee', motif_refus = :motif WHERE id = :id`,
      { id: reservationId, motif: motif || null },
    )

    await insertHistorique(reservationId, 'refusee', adminUser.id, motif || 'Refus Logistique')

    const email = await getUserEmail(mapped.userId)
    const sujet = `Reservation refusee — ${mapped.salleNom}`
    const corps = `Bonjour ${mapped.userName},\n\nVotre demande de reservation de la salle ${mapped.salleNom} le ${mapped.date} de ${mapped.heureDebut} a ${mapped.heureFin} a ete refusee.${motif ? `\n\nMotif : ${motif}` : ''}\n\nService Logistique`
    await logEmail(reservationId, email, 'refus', sujet, corps)

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const reservationId = req.params.id
    const { byUser } = req.body

    const rows = await query(`SELECT * FROM v_reservations_detail WHERE id = :id`, {
      id: reservationId,
    })
    if (!rows[0]) return res.status(404).json({ ok: false, error: 'Reservation introuvable.' })
    const mapped = mapReservation(rows[0])

    await query(`UPDATE reservations SET statut = 'annulee' WHERE id = :id`, {
      id: reservationId,
    })

    await insertHistorique(reservationId, 'annulee', byUser.id, 'Annulation')

    const email = await getUserEmail(mapped.userId)
    const sujet = `Reservation annulee — ${mapped.salleNom}`
    const corps = `Bonjour ${mapped.userName},\n\nVotre reservation de la salle ${mapped.salleNom} le ${mapped.date} de ${mapped.heureDebut} a ${mapped.heureFin} a ete annulee. Le creneau est de nouveau disponible.\n\nService Logistique`
    await logEmail(reservationId, email, 'annulation', sujet, corps)

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Logs emails (journal admin)
// ---------------------------------------------------------------------------
app.get('/api/logs-emails', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT id, reservation_id, destinataire_email, type_notification,
             sujet, corps, statut_envoi, envoye_at
      FROM logs_emails
      ORDER BY envoye_at DESC
      LIMIT 200
    `)
    res.json(
      rows.map((r) => ({
        id: r.id,
        reservationId: r.reservation_id,
        destinataire: r.destinataire_email,
        type: r.type_notification,
        sujet: r.sujet,
        corps: r.corps,
        statut: r.statut_envoi,
        envoyeAt: r.envoye_at,
      })),
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// Demarrage
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[SalleLibre API] http://localhost:${PORT}`)
  console.log(`[SalleLibre API] MySQL ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'sallelibre'}`)
})

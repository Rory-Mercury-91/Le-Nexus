const { getUserIdByName, getUserUuidById, getUserUuidByName } = require('../common-helpers');

/**
 * Calcule la prochaine date de paiement basée sur la fréquence
 */
function calculateNextPaymentDate(startDate, frequency) {
  const start = new Date(startDate);
  const next = new Date(start);
  
  switch (frequency) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return next.toISOString().split('T')[0];
}

/**
 * Enregistre les handlers IPC pour les abonnements
 */
function registerSubscriptionHandlers(ipcMain, getDb, store) {
  // Récupérer tous les abonnements
  ipcMain.handle('subscriptions-get', async (event, filters = {}) => {
    try {
      const db = getDb();
      const { status, search } = filters;
      
      let query = `
        SELECT 
          s.*,
          GROUP_CONCAT(sp.user_id) as user_ids,
          GROUP_CONCAT(u.name) as user_names,
          GROUP_CONCAT(u.color) as user_colors,
          GROUP_CONCAT(u.emoji) as user_emojis
        FROM subscriptions s
        LEFT JOIN subscription_proprietaires sp ON s.id = sp.subscription_id
        LEFT JOIN users u ON sp.user_id = u.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (status) {
        conditions.push('s.status = ?');
        params.push(status);
      }
      
      if (search) {
        conditions.push('LOWER(s.name) LIKE ?');
        params.push(`%${search.toLowerCase()}%`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY s.id ORDER BY s.next_payment_date ASC, s.name ASC';
      
      const subscriptions = db.prepare(query).all(...params);
      
      // Parser les propriétaires
      return subscriptions.map(sub => ({
        ...sub,
        proprietaires: sub.user_ids ? sub.user_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: sub.user_names.split(',')[idx],
          color: sub.user_colors.split(',')[idx],
          emoji: sub.user_emojis.split(',')[idx]
        })) : []
      }));
    } catch (error) {
      console.error('[Subscriptions] Erreur récupération abonnements:', error);
      throw error;
    }
  });

  // Créer un abonnement
  ipcMain.handle('subscriptions-create', async (event, subscriptionData) => {
    try {
      const db = getDb();
      const { name, type, price, devise, frequency, start_date, notes, proprietaires } = subscriptionData;
      
      if (!name || !type || !price || !frequency || !start_date) {
        return { success: false, error: 'Champs requis manquants' };
      }
      
      // Calculer la prochaine date de paiement
      const nextPaymentDate = calculateNextPaymentDate(start_date, frequency);
      
      const result = db.prepare(`
        INSERT INTO subscriptions (name, type, price, devise, frequency, start_date, next_payment_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(name, type, price, devise || 'EUR', frequency, start_date, nextPaymentDate, notes || null);
      
      const subscriptionId = result.lastInsertRowid;
      
      // Ajouter les propriétaires
      const currentUser = store.get('currentUser', '');
      const currentUserId = getUserIdByName(db, currentUser);
      
      // Construire la liste des propriétaires
      let allProprietaires = [];
      if (proprietaires && proprietaires.length > 0) {
        // Si currentUserId n'est pas dans la liste, l'ajouter
        allProprietaires = currentUserId && !proprietaires.includes(currentUserId) 
          ? [currentUserId, ...proprietaires]
          : proprietaires;
      } else if (currentUserId) {
        // Si aucun propriétaire n'est fourni, utiliser au moins le currentUserId
        allProprietaires = [currentUserId];
      }
      
      // Enregistrer les propriétaires
      for (const userId of allProprietaires) {
        const userUuid = getUserUuidById(db, userId);
        if (!userUuid) {
          console.warn(`⚠️ Impossible de récupérer l'UUID pour l'utilisateur ${userId}`);
          continue;
        }
        db.prepare(`
          INSERT INTO subscription_proprietaires (subscription_id, user_id, user_uuid)
          VALUES (?, ?, ?)
        `).run(subscriptionId, userId, userUuid);
      }
      
      return { success: true, id: subscriptionId };
    } catch (error) {
      console.error('[Subscriptions] Erreur création abonnement:', error);
      return { success: false, error: error.message };
    }
  });

  // Mettre à jour un abonnement
  ipcMain.handle('subscriptions-update', async (event, id, subscriptionData) => {
    try {
      const db = getDb();
      const { name, type, price, devise, frequency, start_date, next_payment_date, status, notes, proprietaires } = subscriptionData;
      
      // Mettre à jour l'abonnement
      const updates = [];
      const params = [];
      
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (price !== undefined) {
        updates.push('price = ?');
        params.push(price);
      }
      if (devise !== undefined) {
        updates.push('devise = ?');
        params.push(devise);
      }
      if (frequency !== undefined) {
        updates.push('frequency = ?');
        params.push(frequency);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        params.push(start_date);
        // Recalculer next_payment_date si start_date change
        if (frequency) {
          const nextPaymentDate = calculateNextPaymentDate(start_date, frequency);
          updates.push('next_payment_date = ?');
          params.push(nextPaymentDate);
        }
      }
      if (next_payment_date !== undefined) {
        updates.push('next_payment_date = ?');
        params.push(next_payment_date);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }
      
      if (updates.length > 0) {
        params.push(id);
        db.prepare(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
      
      // Mettre à jour les propriétaires si fournis
      if (proprietaires !== undefined) {
        // Supprimer les anciens propriétaires
        db.prepare('DELETE FROM subscription_proprietaires WHERE subscription_id = ?').run(id);
        
        // Construire la liste des propriétaires
        const currentUser = store.get('currentUser', '');
        const currentUserId = getUserIdByName(db, currentUser);
        
        let allProprietaires = [];
        if (proprietaires && proprietaires.length > 0) {
          // Si currentUserId n'est pas dans la liste, l'ajouter
          allProprietaires = currentUserId && !proprietaires.includes(currentUserId) 
            ? [currentUserId, ...proprietaires]
            : proprietaires;
        } else if (currentUserId) {
          // Si aucun propriétaire n'est fourni, utiliser au moins le currentUserId
          allProprietaires = [currentUserId];
        }
        
        // Ajouter les nouveaux propriétaires
        for (const userId of allProprietaires) {
          const userUuid = getUserUuidById(db, userId);
          if (!userUuid) {
            console.warn(`⚠️ Impossible de récupérer l'UUID pour l'utilisateur ${userId}`);
            continue;
          }
          db.prepare(`
            INSERT INTO subscription_proprietaires (subscription_id, user_id, user_uuid)
            VALUES (?, ?, ?)
          `).run(id, userId, userUuid);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('[Subscriptions] Erreur mise à jour abonnement:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer un abonnement
  ipcMain.handle('subscriptions-delete', async (event, id) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('[Subscriptions] Erreur suppression abonnement:', error);
      return { success: false, error: error.message };
    }
  });

  // Mettre à jour automatiquement les dates de prochain paiement
  ipcMain.handle('subscriptions-update-next-payments', async () => {
    try {
      const db = getDb();
      const activeSubscriptions = db.prepare(`
        SELECT id, start_date, frequency, next_payment_date
        FROM subscriptions
        WHERE status = 'active'
      `).all();
      
      let updated = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (const sub of activeSubscriptions) {
        if (sub.next_payment_date && sub.next_payment_date < today) {
          // La date de paiement est passée, calculer la prochaine
          const nextDate = calculateNextPaymentDate(sub.next_payment_date, sub.frequency);
          if (nextDate) {
            db.prepare('UPDATE subscriptions SET next_payment_date = ? WHERE id = ?')
              .run(nextDate, sub.id);
            updated++;
          }
        }
      }
      
      return { success: true, updated };
    } catch (error) {
      console.error('[Subscriptions] Erreur mise à jour dates:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerSubscriptionHandlers };

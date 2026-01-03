const { getUserIdByName, getUserUuidById, getUserUuidByName } = require('../common-helpers');

/**
 * Enregistre les handlers IPC pour les achats ponctuels
 */
function registerPurchaseHandlers(ipcMain, getDb, store) {
  // Récupérer tous les sites référencés
  ipcMain.handle('purchase-sites-get', async () => {
    try {
      const db = getDb();
      const sites = db.prepare('SELECT * FROM purchase_sites ORDER BY name ASC').all();
      return { success: true, sites };
    } catch (error) {
      console.error('[Purchases] Erreur récupération sites:', error);
      return { success: false, error: error.message };
    }
  });

  // Créer un site référencé
  ipcMain.handle('purchase-sites-create', async (event, name) => {
    try {
      const db = getDb();
      if (!name || !name.trim()) {
        return { success: false, error: 'Le nom du site est requis' };
      }
      
      try {
        const result = db.prepare('INSERT INTO purchase_sites (name) VALUES (?)').run(name.trim());
        return { success: true, id: result.lastInsertRowid };
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          return { success: false, error: 'Ce site existe déjà' };
        }
        throw error;
      }
    } catch (error) {
      console.error('[Purchases] Erreur création site:', error);
      return { success: false, error: error.message };
    }
  });

  // Récupérer tous les achats ponctuels
  ipcMain.handle('one-time-purchases-get', async (event, filters = {}) => {
    try {
      const db = getDb();
      const { search, site_id, start_date, end_date } = filters;
      
      let query = `
        SELECT 
          p.*,
          ps.name as site_name_referenced,
          GROUP_CONCAT(pp.user_id) as user_ids,
          GROUP_CONCAT(u.name) as user_names,
          GROUP_CONCAT(u.color) as user_colors,
          GROUP_CONCAT(u.emoji) as user_emojis
        FROM one_time_purchases p
        LEFT JOIN purchase_sites ps ON p.site_id = ps.id
        LEFT JOIN one_time_purchase_proprietaires pp ON p.id = pp.purchase_id
        LEFT JOIN users u ON pp.user_id = u.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (search) {
        conditions.push('(LOWER(p.site_name) LIKE ? OR LOWER(ps.name) LIKE ? OR LOWER(p.notes) LIKE ?)');
        const like = `%${search.toLowerCase()}%`;
        params.push(like, like, like);
      }
      
      if (site_id) {
        conditions.push('p.site_id = ?');
        params.push(site_id);
      }
      
      if (start_date) {
        conditions.push('p.purchase_date >= ?');
        params.push(start_date);
      }
      
      if (end_date) {
        conditions.push('p.purchase_date <= ?');
        params.push(end_date);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY p.id ORDER BY p.purchase_date DESC, p.created_at DESC';
      
      const purchases = db.prepare(query).all(...params);
      
      // Parser les propriétaires
      return purchases.map(purchase => ({
        ...purchase,
        site_name: purchase.site_name_referenced || purchase.site_name,
        proprietaires: purchase.user_ids ? purchase.user_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: purchase.user_names.split(',')[idx],
          color: purchase.user_colors.split(',')[idx],
          emoji: purchase.user_emojis.split(',')[idx]
        })) : []
      }));
    } catch (error) {
      console.error('[Purchases] Erreur récupération achats:', error);
      throw error;
    }
  });

  // Créer un achat ponctuel
  ipcMain.handle('one-time-purchases-create', async (event, purchaseData) => {
    try {
      const db = getDb();
      const { site_id, site_name, purchase_date, amount, devise, credits_count, notes, proprietaires } = purchaseData;
      
      if (!purchase_date || !amount) {
        return { success: false, error: 'Date et montant requis' };
      }
      
      // Si site_id n'est pas fourni mais site_name l'est, créer ou récupérer le site
      let finalSiteId = site_id;
      if (!finalSiteId && site_name && site_name.trim()) {
        // Chercher si le site existe
        const existingSite = db.prepare('SELECT id FROM purchase_sites WHERE LOWER(name) = LOWER(?)').get(site_name.trim());
        if (existingSite) {
          finalSiteId = existingSite.id;
        } else {
          // Créer le site
          const siteResult = db.prepare('INSERT INTO purchase_sites (name) VALUES (?)').run(site_name.trim());
          finalSiteId = siteResult.lastInsertRowid;
        }
      }
      
      const result = db.prepare(`
        INSERT INTO one_time_purchases (site_id, site_name, purchase_date, amount, devise, credits_count, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        finalSiteId || null,
        site_name || null,
        purchase_date,
        amount,
        devise || 'EUR',
        credits_count || null,
        notes || null
      );
      
      const purchaseId = result.lastInsertRowid;
      
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
          INSERT INTO one_time_purchase_proprietaires (purchase_id, user_id, user_uuid)
          VALUES (?, ?, ?)
        `).run(purchaseId, userId, userUuid);
      }
      
      return { success: true, id: purchaseId };
    } catch (error) {
      console.error('[Purchases] Erreur création achat:', error);
      return { success: false, error: error.message };
    }
  });

  // Mettre à jour un achat ponctuel
  ipcMain.handle('one-time-purchases-update', async (event, id, purchaseData) => {
    try {
      const db = getDb();
      const { site_id, site_name, purchase_date, amount, devise, credits_count, notes, proprietaires } = purchaseData;
      
      // Gérer le site
      let finalSiteId = site_id;
      if (!finalSiteId && site_name && site_name.trim()) {
        const existingSite = db.prepare('SELECT id FROM purchase_sites WHERE LOWER(name) = LOWER(?)').get(site_name.trim());
        if (existingSite) {
          finalSiteId = existingSite.id;
        } else {
          const siteResult = db.prepare('INSERT INTO purchase_sites (name) VALUES (?)').run(site_name.trim());
          finalSiteId = siteResult.lastInsertRowid;
        }
      }
      
      // Mettre à jour l'achat
      const updates = [];
      const params = [];
      
      if (finalSiteId !== undefined) {
        updates.push('site_id = ?');
        params.push(finalSiteId);
      }
      if (site_name !== undefined) {
        updates.push('site_name = ?');
        params.push(site_name);
      }
      if (purchase_date !== undefined) {
        updates.push('purchase_date = ?');
        params.push(purchase_date);
      }
      if (amount !== undefined) {
        updates.push('amount = ?');
        params.push(amount);
      }
      if (devise !== undefined) {
        updates.push('devise = ?');
        params.push(devise);
      }
      if (credits_count !== undefined) {
        updates.push('credits_count = ?');
        params.push(credits_count);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }
      
      if (updates.length > 0) {
        params.push(id);
        db.prepare(`UPDATE one_time_purchases SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
      
      // Mettre à jour les propriétaires si fournis
      if (proprietaires !== undefined) {
        db.prepare('DELETE FROM one_time_purchase_proprietaires WHERE purchase_id = ?').run(id);
        
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
            INSERT INTO one_time_purchase_proprietaires (purchase_id, user_id, user_uuid)
            VALUES (?, ?, ?)
          `).run(id, userId, userUuid);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('[Purchases] Erreur mise à jour achat:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer un achat ponctuel
  ipcMain.handle('one-time-purchases-delete', async (event, id) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM one_time_purchases WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('[Purchases] Erreur suppression achat:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerPurchaseHandlers };

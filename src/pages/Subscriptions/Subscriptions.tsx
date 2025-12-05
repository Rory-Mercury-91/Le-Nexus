import { Calendar, CreditCard, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddPurchaseModal from '../../components/modals/subscriptions/AddPurchaseModal';
import AddSubscriptionModal from '../../components/modals/subscriptions/AddSubscriptionModal';
import EditPurchaseModal from '../../components/modals/subscriptions/EditPurchaseModal';
import EditSubscriptionModal from '../../components/modals/subscriptions/EditSubscriptionModal';
import { useConfirm } from '../../hooks/common/useConfirm';
import { useToast } from '../../hooks/common/useToast';

interface Subscription {
  id: number;
  name: string;
  type: string;
  price: number;
  frequency: string;
  start_date: string;
  next_payment_date: string | null;
  status: 'active' | 'expired' | 'cancelled';
  notes: string | null;
  proprietaires: Array<{ id: number; name: string; color: string; emoji: string }>;
}

interface OneTimePurchase {
  id: number;
  site_id: number | null;
  site_name: string | null;
  purchase_date: string;
  amount: number;
  credits_count: number | null;
  notes: string | null;
  proprietaires: Array<{ id: number; name: string; color: string; emoji: string }>;
}

export default function Subscriptions() {
  const { showToast, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchases, setPurchases] = useState<OneTimePurchase[]>([]);
  const [purchaseSites, setPurchaseSites] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string; color: string; emoji: string }>>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; color: string; emoji: string } | null>(null);

  // États pour les modals
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<OneTimePurchase | null>(null);

  // Filtres
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseSiteFilter, setPurchaseSiteFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les utilisateurs
      const allUsers = await window.electronAPI.getAllUsers();
      setUsers(allUsers);

      const userName = await window.electronAPI.getCurrentUser();
      if (userName) {
        const user = allUsers.find((u: { name: string }) => u.name === userName);
        if (user) {
          setCurrentUser(user);
        }
      }

      // Charger les sites d'achat
      const sitesResult = await window.electronAPI.purchaseSitesGet();
      if (sitesResult?.success && sitesResult.sites) {
        setPurchaseSites(sitesResult.sites);
      }

      // Charger les abonnements
      await loadSubscriptions();

      // Charger les achats ponctuels
      await loadPurchases();

      // Mettre à jour les dates de paiement
      await window.electronAPI.subscriptionsUpdateNextPayments?.();
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de charger les données',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const filters: any = {};
      if (subscriptionStatusFilter !== 'all') {
        filters.status = subscriptionStatusFilter;
      }
      if (subscriptionSearch) {
        filters.search = subscriptionSearch;
      }
      const data = await window.electronAPI.subscriptionsGet?.(filters) || [];
      setSubscriptions(data);
    } catch (error) {
      console.error('Erreur chargement abonnements:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      const filters: any = {};
      if (purchaseSiteFilter) {
        filters.site_id = purchaseSiteFilter;
      }
      if (purchaseSearch) {
        filters.search = purchaseSearch;
      }
      const data = await window.electronAPI.oneTimePurchasesGet?.(filters) || [];
      setPurchases(data);
    } catch (error) {
      console.error('Erreur chargement achats:', error);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [subscriptionSearch, subscriptionStatusFilter]);

  useEffect(() => {
    loadPurchases();
  }, [purchaseSearch, purchaseSiteFilter]);

  const handleDeleteSubscription = async (id: number) => {
    const subscription = subscriptions.find(s => s.id === id);
    const confirmed = await confirm({
      title: 'Supprimer l\'abonnement',
      message: `Êtes-vous sûr de vouloir supprimer "${subscription?.name}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.subscriptionsDelete?.(id);
      if (result?.success) {
        showToast({
          title: 'Abonnement supprimé',
          type: 'success'
        });
        await loadSubscriptions();
      }
    } catch (error) {
      console.error('Erreur suppression abonnement:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer l\'abonnement',
        type: 'error'
      });
    }
  };

  const handleDeletePurchase = async (id: number) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'achat',
      message: `Êtes-vous sûr de vouloir supprimer cet achat ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.oneTimePurchasesDelete?.(id);
      if (result?.success) {
        showToast({
          title: 'Achat supprimé',
          type: 'success'
        });
        await loadPurchases();
      }
    } catch (error) {
      console.error('Erreur suppression achat:', error);
      showToast({
        title: 'Erreur',
        message: 'Impossible de supprimer l\'achat',
        type: 'error'
      });
    }
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const monthlyCost = activeSubscriptions.reduce((sum, sub) => {
      let monthlyPrice = sub.price;
      if (sub.frequency === 'quarterly') {
        monthlyPrice = sub.price / 3;
      } else if (sub.frequency === 'yearly') {
        monthlyPrice = sub.price / 12;
      }
      // Diviser par le nombre de propriétaires
      const ownerCount = sub.proprietaires.length || 1;
      return sum + (monthlyPrice / ownerCount);
    }, 0);

    const yearlyCost = monthlyCost * 12;

    const totalPurchases = purchases.reduce((sum, purchase) => {
      const ownerCount = purchase.proprietaires.length || 1;
      return sum + (purchase.amount / ownerCount);
    }, 0);

    return {
      activeCount: activeSubscriptions.length,
      monthlyCost,
      yearlyCost,
      totalPurchases
    };
  }, [subscriptions, purchases]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <ConfirmDialog />

      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* En-tête */}
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>💳</span>
              Abonnements
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Gérez vos abonnements récurrents et vos achats ponctuels
            </p>
          </div>

          {/* Statistiques */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Abonnements actifs</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.activeCount}</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Coût mensuel</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.monthlyCost.toFixed(2)}€</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Coût annuel</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.yearlyCost.toFixed(2)}€</div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total achats ponctuels</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{stats.totalPurchases.toFixed(2)}€</div>
            </div>
          </div>

          {/* Section Abonnements */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={24} />
                Abonnements récurrents
              </h2>
              <button
                onClick={() => setShowAddSubscriptionModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} />
                Ajouter un abonnement
              </button>
            </div>

            {/* Filtres abonnements */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Rechercher un abonnement..."
                    value={subscriptionSearch}
                    onChange={(e) => setSubscriptionSearch(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>
              <select
                value={subscriptionStatusFilter}
                onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
                className="select"
                style={{ width: 'auto', minWidth: 'fit-content' }}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="expired">Expirés</option>
                <option value="cancelled">Annulés</option>
              </select>
            </div>

            {/* Liste des abonnements */}
            {subscriptions.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>
                  Aucun abonnement trouvé
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {subscriptions.map(sub => {
                  const devise = (sub as any).devise || 'EUR';
                  const deviseSymbol = devise === 'EUR' ? '€' : devise === 'USD' ? '$' : devise === 'GBP' ? '£' : devise;
                  return (
                    <div key={sub.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, flex: 1 }}>{sub.name}</h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setEditingSubscription(sub)}
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--error)' }}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <div><strong>Type:</strong> {sub.type}</div>
                        <div><strong>Prix:</strong> {sub.price.toFixed(2)}{deviseSymbol} / {sub.frequency === 'monthly' ? 'mois' : sub.frequency === 'quarterly' ? 'trimestre' : 'an'}</div>
                        <div><strong>Début:</strong> {new Date(sub.start_date).toLocaleDateString('fr-FR')}</div>
                        {sub.next_payment_date && (
                          <div><strong>Prochain paiement:</strong> {new Date(sub.next_payment_date).toLocaleDateString('fr-FR')}</div>
                        )}
                        <div style={{ marginTop: '8px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: sub.status === 'active' ? 'var(--success)' : sub.status === 'expired' ? 'var(--error)' : 'var(--text-secondary)',
                            color: 'white'
                          }}>
                            {sub.status === 'active' ? 'Actif' : sub.status === 'expired' ? 'Expiré' : 'Annulé'}
                          </span>
                        </div>
                        {sub.proprietaires.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {sub.proprietaires.map(prop => (
                              <span
                                key={prop.id}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  background: `${prop.color}22`,
                                  color: prop.color,
                                  border: `1px solid ${prop.color}`
                                }}
                              >
                                {prop.emoji} {prop.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section Achats ponctuels */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={24} />
                Achats ponctuels
              </h2>
              <button
                onClick={() => setShowAddPurchaseModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} />
                Ajouter un achat
              </button>
            </div>

            {/* Filtres achats */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Rechercher un achat..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>
              <select
                value={purchaseSiteFilter || ''}
                onChange={(e) => setPurchaseSiteFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="select"
                style={{ width: 'auto', minWidth: 'fit-content' }}
              >
                <option value="">Tous les sites</option>
                {purchaseSites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            {/* Liste des achats */}
            {purchases.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>
                  Aucun achat ponctuel trouvé
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {purchases.map(purchase => {
                  const devise = (purchase as any).devise || 'EUR';
                  const deviseSymbol = devise === 'EUR' ? '€' : devise === 'USD' ? '$' : devise === 'GBP' ? '£' : devise;
                  return (
                    <div key={purchase.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, flex: 1 }}>
                          {purchase.site_name || 'Site non spécifié'}
                        </h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setEditingPurchase(purchase)}
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            className="btn btn-outline"
                            style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--error)' }}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <div><strong>Date:</strong> {new Date(purchase.purchase_date).toLocaleDateString('fr-FR')}</div>
                        <div><strong>Montant:</strong> {purchase.amount.toFixed(2)}{deviseSymbol}</div>
                        {purchase.credits_count && (
                          <div><strong>Crédits:</strong> {purchase.credits_count}</div>
                        )}
                        {purchase.notes && (
                          <div style={{ marginTop: '8px', fontStyle: 'italic', fontSize: '12px' }}>{purchase.notes}</div>
                        )}
                        {purchase.proprietaires.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {purchase.proprietaires.map(prop => (
                              <span
                                key={prop.id}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  background: `${prop.color}22`,
                                  color: prop.color,
                                  border: `1px solid ${prop.color}`
                                }}
                              >
                                {prop.emoji} {prop.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddSubscriptionModal && (
        <AddSubscriptionModal
          users={users}
          currentUserId={currentUser?.id || null}
          onClose={() => setShowAddSubscriptionModal(false)}
          onSuccess={async () => {
            setShowAddSubscriptionModal(false);
            await loadSubscriptions();
          }}
        />
      )}

      {editingSubscription && (
        <EditSubscriptionModal
          subscription={editingSubscription}
          users={users}
          currentUserId={currentUser?.id || null}
          onClose={() => setEditingSubscription(null)}
          onSuccess={async () => {
            setEditingSubscription(null);
            await loadSubscriptions();
          }}
        />
      )}

      {showAddPurchaseModal && (
        <AddPurchaseModal
          users={users}
          currentUserId={currentUser?.id || null}
          purchaseSites={purchaseSites}
          onClose={() => setShowAddPurchaseModal(false)}
          onSuccess={async () => {
            setShowAddPurchaseModal(false);
            await loadPurchases();
            // Recharger les sites au cas où un nouveau a été créé
            const sitesResult = await window.electronAPI.purchaseSitesGet();
            if (sitesResult?.success && sitesResult.sites) {
              setPurchaseSites(sitesResult.sites);
            }
          }}
        />
      )}

      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          users={users}
          currentUserId={currentUser?.id || null}
          purchaseSites={purchaseSites}
          onClose={() => setEditingPurchase(null)}
          onSuccess={async () => {
            setEditingPurchase(null);
            await loadPurchases();
            // Recharger les sites au cas où un nouveau a été créé
            const sitesResult = await window.electronAPI.purchaseSitesGet();
            if (sitesResult?.success && sitesResult.sites) {
              setPurchaseSites(sitesResult.sites);
            }
          }}
        />
      )}
    </>
  );
}

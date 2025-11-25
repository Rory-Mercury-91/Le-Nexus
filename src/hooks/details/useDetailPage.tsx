import { useCallback, useEffect, useState } from 'react';

export type DisplayPreferencesMode = 'global' | 'global-local';

export interface DetailPageConfig<T, TDisplayPrefs> {
  /** ID de l'item (depuis useParams) */
  itemId: string | undefined;
  /** Valeurs par défaut des préférences d'affichage */
  displayDefaults: TDisplayPrefs;
  /** API pour charger les détails de l'item */
  loadDetailApi: (itemId: number) => Promise<T | null>;
  /** Mode de préférences d'affichage : 'global' (simple) ou 'global-local' (avec overrides) */
  displayPreferencesMode?: DisplayPreferencesMode;
  /** API pour charger les préférences d'affichage globales */
  loadDisplaySettingsApi?: () => Promise<TDisplayPrefs | null>;
  /** API pour charger les overrides locaux (mode 'global-local') */
  loadDisplayOverridesApi?: (itemId: number) => Promise<Partial<TDisplayPrefs> | null>;
  /** Fonction pour normaliser les données après chargement */
  normalizeData?: (data: T) => T;
  /** Nom de l'événement CustomEvent pour écouter les changements de statut */
  statusEventName?: string;
  /** Fonction pour vérifier si un événement concerne l'item actuel */
  isEventForCurrentItem?: (event: CustomEvent, item: T | null, itemId: string | undefined) => boolean;
  /** Fonction pour recharger l'item après un événement */
  reloadAfterEvent?: (event: CustomEvent, itemId: string | undefined) => Promise<T | null>;
  /** Message d'erreur si l'ID est manquant */
  missingIdError?: string;
  /** Message d'erreur si l'item n'est pas trouvé */
  notFoundError?: string;
}

export function useDetailPage<T, TDisplayPrefs>(config: DetailPageConfig<T, TDisplayPrefs>) {
  const {
    itemId,
    displayDefaults,
    loadDetailApi,
    displayPreferencesMode = 'global',
    loadDisplaySettingsApi,
    loadDisplayOverridesApi,
    normalizeData,
    statusEventName,
    isEventForCurrentItem,
    reloadAfterEvent,
    missingIdError = 'Identifiant manquant',
    notFoundError = 'Élément introuvable dans votre collection'
  } = config;

  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayPrefs, setDisplayPrefs] = useState<TDisplayPrefs>(displayDefaults);
  const [showDisplaySettingsModal, setShowDisplaySettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Charger les préférences d'affichage
  const refreshDisplayPrefs = useCallback(async () => {
    if (!loadDisplaySettingsApi) return;
    try {
      const defaults = { ...displayDefaults };
      const globalPrefs = await loadDisplaySettingsApi();

      if (displayPreferencesMode === 'global-local' && loadDisplayOverridesApi) {
        // Mode global-local : utiliser l'ID réel de l'item (pas le tmdbId)
        // Pour les séries, item.id est l'ID réel, itemId est le tmdbId
        const realItemId = item && typeof item === 'object' && 'id' in item ? (item as any).id : null;
        if (realItemId) {
          const localOverrides = await loadDisplayOverridesApi(realItemId);
          // IMPORTANT : Les overrides locaux ont toujours la priorité
          // Fusion : defaults → globales → locales (les locales écrasent les globales)
          const merged = { ...defaults, ...globalPrefs, ...localOverrides };
          setDisplayPrefs(merged as TDisplayPrefs);
        } else {
          // Pas encore chargé, utiliser les globales uniquement
          setDisplayPrefs({ ...defaults, ...globalPrefs } as TDisplayPrefs);
        }
      } else {
        // Mode global : fusionner defaults -> global
        setDisplayPrefs({ ...defaults, ...globalPrefs } as TDisplayPrefs);
      }
    } catch (err) {
      console.error('Erreur chargement préférences:', err);
      setDisplayPrefs(displayDefaults);
    }
  }, [loadDisplaySettingsApi, loadDisplayOverridesApi, displayDefaults, displayPreferencesMode, item]);

  // Charger les détails de l'item
  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      const { silent = false } = options || {};

      if (!itemId) {
        setError(missingIdError);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        const detail = await loadDetailApi(Number(itemId));

        if (!detail) {
          setError(notFoundError);
          setItem(null);
        } else {
          const normalized = normalizeData ? normalizeData(detail) : detail;
          setItem(normalized);

          // Charger les préférences d'affichage
          if (loadDisplaySettingsApi) {
            try {
              const defaults = { ...displayDefaults };
              const globalPrefs = await loadDisplaySettingsApi();

              if (displayPreferencesMode === 'global-local' && loadDisplayOverridesApi) {
                // Mode global-local : utiliser l'ID réel de l'item (pas le tmdbId)
                const realItemId = normalized && typeof normalized === 'object' && 'id' in normalized ? (normalized as any).id : null;
                if (realItemId) {
                  const localOverrides = await loadDisplayOverridesApi(realItemId);
                  // IMPORTANT : Les overrides locaux ont toujours la priorité
                  // Fusion : defaults → globales → locales (les locales écrasent les globales)
                  const merged = { ...defaults, ...globalPrefs, ...localOverrides };
                  setDisplayPrefs(merged as TDisplayPrefs);
                } else {
                  // Pas d'ID réel disponible, utiliser les globales uniquement
                  setDisplayPrefs({ ...defaults, ...globalPrefs } as TDisplayPrefs);
                }
              } else {
                // Mode global : fusionner defaults -> global
                setDisplayPrefs({ ...defaults, ...globalPrefs } as TDisplayPrefs);
              }
            } catch (err) {
              console.error('Erreur chargement préférences:', err);
              setDisplayPrefs(displayDefaults);
            }
          }

          setError(null);
        }
      } catch (err: any) {
        console.error('Erreur chargement détails:', err);
        setError(err?.message || 'Impossible de charger les détails');
        setItem(null);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [itemId, loadDetailApi, loadDisplaySettingsApi, displayDefaults, normalizeData, missingIdError, notFoundError]
  );

  // Charger au montage et quand itemId change
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Écouter les changements de statut depuis la page de collection
  useEffect(() => {
    if (!statusEventName || !isEventForCurrentItem) return;

    const handleStatusChangeFromCollection = (event: CustomEvent) => {
      if (!isEventForCurrentItem(event, item, itemId)) {
        return;
      }

      // Recharger depuis la base pour avoir la valeur exacte persistée
      if (reloadAfterEvent) {
        reloadAfterEvent(event, itemId)
          .then((detail) => {
            if (detail) {
              const normalized = normalizeData ? normalizeData(detail) : detail;
              setItem(normalized);
            }
          })
          .catch((err) => {
            console.error('Erreur rechargement après changement statut:', err);
            // Si le rechargement échoue, mettre à jour quand même localement si possible
            if (event.detail?.statut && item) {
              setItem((prev) => {
                if (!prev) return prev;
                const updated = { ...prev, statut_visionnage: event.detail.statut } as T;
                return normalizeData ? normalizeData(updated) : updated;
              });
            }
          });
      } else {
        // Fallback : mettre à jour localement
        if (event.detail?.statut && item) {
          setItem((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, statut_visionnage: event.detail.statut } as T;
            return normalizeData ? normalizeData(updated) : updated;
          });
        }
      }
    };

    window.addEventListener(statusEventName, handleStatusChangeFromCollection as EventListener);
    return () => {
      window.removeEventListener(statusEventName, handleStatusChangeFromCollection as EventListener);
    };
  }, [item, itemId, statusEventName, isEventForCurrentItem, reloadAfterEvent, normalizeData]);

  const handleOpenDisplaySettings = useCallback(() => {
    setShowDisplaySettingsModal(true);
  }, []);

  const handleCloseDisplaySettings = useCallback(async () => {
    setShowDisplaySettingsModal(false);
    await refreshDisplayPrefs();
  }, [refreshDisplayPrefs]);

  return {
    item,
    setItem,
    loading,
    error,
    displayPrefs,
    setDisplayPrefs,
    showDisplaySettingsModal,
    setShowDisplaySettingsModal,
    showEditModal,
    setShowEditModal,
    refreshDisplayPrefs,
    loadDetail,
    handleOpenDisplaySettings,
    handleCloseDisplaySettings
  };
}

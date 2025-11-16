/**
 * Hook pour vérifier si un élément est nouveau (< 7 jours)
 */
export function useIsNew(createdAt: string | null | undefined, options?: {
  hideIfCompleted?: boolean;
  hideIfFullProgress?: boolean;
  currentProgress?: number;
  totalProgress?: number;
  completedStatus?: string;
  currentStatus?: string;
}) {
  const isNew = () => {
    if (!createdAt) return false;
    
    // Masquer si statut = complété
    if (options?.hideIfCompleted) {
      if (options?.currentStatus === options?.completedStatus) return false;
    }
    
    // Masquer si complétion = 100%
    if (options?.hideIfFullProgress) {
      const current = options?.currentProgress || 0;
      const total = options?.totalProgress || 0;
      if (total > 0 && current === total) return false;
    }
    
    const createdDate = new Date(createdAt);
    const daysDiff = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < 7;
  };

  return isNew;
}

export type AdulteGameFieldKey = 'main_info' | 'user_params' | 'translation' | 'tags' | 'labels';

export const ADULTE_GAME_DISPLAY_DEFAULTS: Record<AdulteGameFieldKey, boolean> = {
  main_info: true,
  user_params: true,
  translation: true,
  tags: true,
  labels: true,
};

export const ADULTE_GAME_DISPLAY_CATEGORIES: Array<{
  title: string;
  icon: string;
  fields: Array<{ key: AdulteGameFieldKey; label: string }>;
}> = [
  {
    title: 'Informations principales',
    icon: '🎮',
    fields: [{ key: 'main_info', label: 'Carte informations principales' }],
  },
  {
    title: 'Suivi personnel',
    icon: '🧾',
    fields: [{ key: 'user_params', label: 'Carte paramètres & notes personnelles' }],
  },
  {
    title: 'Traduction française',
    icon: '🈶',
    fields: [{ key: 'translation', label: 'Carte traduction française' }],
  },
  {
    title: 'Tags & labels',
    icon: '🏷️',
    fields: [
      { key: 'tags', label: 'Carte tags & préférences' },
      { key: 'labels', label: 'Carte labels personnalisés' },
    ],
  },
];

export const ADULTE_GAME_DISPLAY_FIELDS = ADULTE_GAME_DISPLAY_CATEGORIES.flatMap((category) => category.fields);

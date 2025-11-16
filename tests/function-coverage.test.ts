/**
 * Tests de couverture des fonctions
 * Vérifie que toutes les fonctions principales existent et sont appelables
 * Ce fichier sert à identifier le code mort et à vérifier que les fonctions sont accessibles
 */

import { describe, expect, it } from 'vitest';

describe('Fonctions Handlers - Mangas', () => {
  it('devrait exporter les handlers manga', async () => {
    const mangaHandlers = await import('../electron/handlers/mangas/manga-handlers.js');
    expect(mangaHandlers).toBeDefined();
    expect(typeof mangaHandlers.registerMangaHandlers).toBe('function');
  });

  it('devrait exporter les handlers CRUD manga', async () => {
    const crudHandlers = await import('../electron/handlers/mangas/manga-crud-handlers.js');
    expect(crudHandlers).toBeDefined();
  });
});

describe('Fonctions Handlers - Animes', () => {
  it('devrait exporter les handlers anime', async () => {
    const animeHandlers = await import('../electron/handlers/animes/anime-handlers.js');
    expect(animeHandlers).toBeDefined();
    expect(typeof animeHandlers.registerAnimeHandlers).toBe('function');
  });

  it('devrait exporter les handlers CRUD anime', async () => {
    const crudHandlers = await import('../electron/handlers/animes/anime-crud-handlers.js');
    expect(crudHandlers).toBeDefined();
  });
});

describe('Fonctions Handlers - Adulte Game', () => {
  it('devrait exporter les handlers adulte-game', async () => {
    const adulteGameHandlers = await import('../electron/handlers/adulte-game/adulte-game-handlers.js');
    expect(adulteGameHandlers).toBeDefined();
    expect(typeof adulteGameHandlers.registerAdulteGameHandlers).toBe('function');
  });

  it('devrait exporter les handlers CRUD adulte-game', async () => {
    const crudHandlers = await import('../electron/handlers/adulte-game/adulte-game-crud-handlers.js');
    expect(crudHandlers).toBeDefined();
  });
});

describe('Fonctions Handlers - Settings', () => {
  it('devrait exporter les handlers settings', async () => {
    const settingsHandlers = await import('../electron/handlers/settings/settings-handlers.js');
    expect(settingsHandlers).toBeDefined();
    expect(typeof settingsHandlers.registerSettingsHandlers).toBe('function');
  });
});

describe('Fonctions Services - Mangas', () => {
  it('devrait exporter le service d\'import manga', async () => {
    const importService = await import('../electron/services/mangas/manga-import-service.js');
    expect(importService).toBeDefined();
  });

  it('devrait exporter le scraper Nautiljon', async () => {
    const scraper = await import('../electron/services/mangas/nautiljon-scraper.js');
    expect(scraper).toBeDefined();
    expect(typeof scraper.scrapeNautiljonPage).toBe('function');
  });
});

describe('Fonctions Hooks - React', () => {
  it('devrait exporter useMangaDetail', async () => {
    const useMangaDetail = await import('../src/hooks/details/useMangaDetail');
    expect(useMangaDetail).toBeDefined();
    expect(typeof useMangaDetail.useMangaDetail).toBe('function');
  });

  it('devrait exporter useAnimeDetail', async () => {
    const useAnimeDetail = await import('../src/hooks/details/useAnimeDetail');
    expect(useAnimeDetail).toBeDefined();
    expect(typeof useAnimeDetail.useAnimeDetail).toBe('function');
  });

  it('devrait exporter useAdulteGameDetail', async () => {
    const useAdulteGameDetail = await import('../src/hooks/details/useAdulteGameDetail');
    expect(useAdulteGameDetail).toBeDefined();
    expect(typeof useAdulteGameDetail.useAdulteGameDetail).toBe('function');
  });

  it('devrait exporter useSettings', async () => {
    const useSettings = await import('../src/hooks/settings/useSettings');
    expect(useSettings).toBeDefined();
    expect(typeof useSettings.useSettings).toBe('function');
  });

  it('devrait exporter useAdulteGameCollection', async () => {
    const useAdulteGameCollection = await import('../src/hooks/collections/useAdulteGameCollection');
    expect(useAdulteGameCollection).toBeDefined();
    expect(typeof useAdulteGameCollection.useAdulteGameCollection).toBe('function');
  });
});

/// <reference types="vitest/globals" />
/// <reference types="../src/vite-env" />
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Electron API
(global.window as Window).electronAPI = {
  // Mock IPC handlers
  getAllSeries: vi.fn(),
  getSerieById: vi.fn(),
  addSerie: vi.fn(),
  updateSerie: vi.fn(),
  deleteSerie: vi.fn(),
  getAllAnimes: vi.fn(),
  getAnimeById: vi.fn(),
  addAnime: vi.fn(),
  updateAnime: vi.fn(),
  deleteAnime: vi.fn(),
  getAllAdulteGames: vi.fn(),
  getAdulteGameById: vi.fn(),
  addAdulteGame: vi.fn(),
  updateAdulteGame: vi.fn(),
  deleteAdulteGame: vi.fn(),
  getAllUsers: vi.fn(),
  getCurrentUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getStatistics: vi.fn(),
  searchGlobal: vi.fn(),
  getTheme: vi.fn(),
  setTheme: vi.fn(),
  // Mock event listeners
  onMangaImported: vi.fn(() => vi.fn()),
  onAnimeImported: vi.fn(() => vi.fn()),
  onMangaImportStart: vi.fn(() => vi.fn()),
  onMangaImportComplete: vi.fn(() => vi.fn()),
  onAnimeImportProgress: vi.fn(() => vi.fn())
} as any; // Type ElectronAPI sera résolu après npm install

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

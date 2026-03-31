// Local storage keys for custom categories
const STORAGE_KEYS = {
  GEWERKE: "custom_gewerke",
  BEREICHE: "custom_bereiche",
  KATEGORIEN: "custom_kategorien",
  MEDIA_KATEGORIEN: "custom_media_kategorien",
  DOCUMENT_BEREICHE: "custom_document_bereiche",
};

// Default values
export const DEFAULT_GEWERKE = [
  "Architekt",
  "Elektriker",
  "Heizung",
  "Sanitär",
  "Maler",
  "Zimmermann",
  "Dachdecker",
];

export const DEFAULT_BEREICHE = [
  "Planung",
  "Ausführung",
  "Abnahme",
  "Dokumentation",
];

export const DEFAULT_KATEGORIEN = [
  "Energie",
  "Orga",
  "Dach",
  "Fassade",
  "Innenausbau",
];

export const DEFAULT_MEDIA_KATEGORIEN = [
  "Pläne",
  "Fotos",
  "Visualisierungen",
  "Sonstiges",
];

export const DEFAULT_DOCUMENT_BEREICHE = [
  "Architekt",
  "Statik",
  "Bauantrag",
  "Verträge",
  "Rechnungen",
];

// Helper functions to manage custom categories
function getStoredCategories(key: string, defaults: string[]): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : defaults;
    }
  } catch (error) {
    console.error("Error loading custom categories:", error);
  }
  return defaults;
}

function saveCategories(key: string, categories: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(categories));
  } catch (error) {
    console.error("Error saving custom categories:", error);
  }
}

// Gewerke management
export function getGewerke(): string[] {
  return getStoredCategories(STORAGE_KEYS.GEWERKE, DEFAULT_GEWERKE);
}

export function addGewerke(newGewerke: string): void {
  const current = getGewerke();
  if (!current.includes(newGewerke)) {
    saveCategories(STORAGE_KEYS.GEWERKE, [...current, newGewerke]);
  }
}

// Bereiche management
export function getBereiche(): string[] {
  return getStoredCategories(STORAGE_KEYS.BEREICHE, DEFAULT_BEREICHE);
}

export function addBereich(newBereich: string): void {
  const current = getBereiche();
  if (!current.includes(newBereich)) {
    saveCategories(STORAGE_KEYS.BEREICHE, [...current, newBereich]);
  }
}

// Kategorien management
export function getKategorien(): string[] {
  return getStoredCategories(STORAGE_KEYS.KATEGORIEN, DEFAULT_KATEGORIEN);
}

export function addKategorie(newKategorie: string): void {
  const current = getKategorien();
  if (!current.includes(newKategorie)) {
    saveCategories(STORAGE_KEYS.KATEGORIEN, [...current, newKategorie]);
  }
}

// Media Kategorien management
export function getMediaKategorien(): string[] {
  return getStoredCategories(
    STORAGE_KEYS.MEDIA_KATEGORIEN,
    DEFAULT_MEDIA_KATEGORIEN,
  );
}

export function addMediaKategorie(newKategorie: string): void {
  const current = getMediaKategorien();
  if (!current.includes(newKategorie)) {
    saveCategories(STORAGE_KEYS.MEDIA_KATEGORIEN, [...current, newKategorie]);
  }
}

// Document Bereiche management
export function getDocumentBereiche(): string[] {
  return getStoredCategories(
    STORAGE_KEYS.DOCUMENT_BEREICHE,
    DEFAULT_DOCUMENT_BEREICHE,
  );
}

export function addDocumentBereich(newBereich: string): void {
  const current = getDocumentBereiche();
  if (!current.includes(newBereich)) {
    saveCategories(STORAGE_KEYS.DOCUMENT_BEREICHE, [...current, newBereich]);
  }
}

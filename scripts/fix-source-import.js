// Script pour corriger les animes sans source_import
const Database = require('better-sqlite3');
const path = require('path');

// Chemin vers votre base de données
const dbPath = path.join(__dirname, '..', 'manga.db');
const db = new Database(dbPath);

console.log('🔧 Correction des source_import manquants...\n');

// Récupérer tous les animes sans source_import
const animesWithoutSource = db.prepare(`
  SELECT id, titre FROM anime_series WHERE source_import IS NULL
`).all();

console.log(`📊 ${animesWithoutSource.length} anime(s) trouvé(s) sans source_import\n`);

if (animesWithoutSource.length > 0) {
  console.log('Liste des animes :');
  animesWithoutSource.forEach((anime, index) => {
    console.log(`  ${index + 1}. [ID: ${anime.id}] ${anime.titre}`);
  });
  
  console.log('\n💡 Pour corriger un anime spécifique, modifiez ce script.\n');
  console.log('Exemple pour mettre "Hero Without a Class" en ADN :');
  console.log('db.prepare("UPDATE anime_series SET source_import = ? WHERE id = ?").run("adn", 11);');
  
  // Décommenter et adapter cette ligne si vous voulez appliquer la correction
  // db.prepare('UPDATE anime_series SET source_import = ? WHERE id = ?').run('adn', 11);
  // console.log('✅ Anime ID 11 mis à jour avec source_import = "adn"');
}

db.close();
console.log('\n✅ Script terminé');

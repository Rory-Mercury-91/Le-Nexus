# Script PowerShell pour nettoyer le cache winCodeSign d'electron-builder
# Ce script peut nécessiter des droits administrateur pour supprimer les liens symboliques

$cachePath = Join-Path $env:LOCALAPPDATA "electron-builder\Cache\winCodeSign"

Write-Host "🧹 Nettoyage du cache winCodeSign..." -ForegroundColor Cyan
Write-Host "📁 Chemin: $cachePath" -ForegroundColor Gray

if (Test-Path $cachePath) {
    try {
        # Essayer de supprimer récursivement
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Cache winCodeSign nettoyé avec succès !" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de la suppression: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Essayez d'exécuter PowerShell en tant qu'administrateur" -ForegroundColor Yellow
        Write-Host "   Ou supprimez manuellement le dossier: $cachePath" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "ℹ️  Aucun cache winCodeSign trouvé" -ForegroundColor Gray
}

Write-Host "✅ Nettoyage terminé" -ForegroundColor Green

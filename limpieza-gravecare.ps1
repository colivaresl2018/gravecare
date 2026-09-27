# limpieza-gravecare.ps1
# Ejecutar desde C:\Users\coliv\OneDrive\Documentos\Gravecare
# Elimina archivos huerfanos/sin uso detectados en la auditoria (24-sep-2026)

Set-Location "C:\Users\coliv\OneDrive\Documentos\Gravecare"

Write-Host "Eliminando paginas huerfanas (sin enlaces entrantes o con flujo roto)..." -ForegroundColor Yellow
git rm public/inscribirme-SPOT.html
git rm public/pago.html
git rm public/suscribirme.html

Write-Host "Eliminando JS sin uso (ningun HTML los importa)..." -ForegroundColor Yellow
git rm public/firebaseConfig.js
git rm public/firebasePayments.js
git rm public/js/pagos.js
git rm public/js/recovery.js
git rm public/js/registro.js
git rm public/js/sepulturas.js
git rm public/js/utils/rut.js

Write-Host "Eliminando carpeta functions duplicada dentro de public/..." -ForegroundColor Yellow
git rm public/functions/package.json

Write-Host "Eliminando imagenes sin uso en assets/..." -ForegroundColor Yellow
git rm "public/assets/12 Rosas.jpg"
git rm "public/assets/Arreglo_Premium.jpg"
git rm "public/assets/Arreglo_Standar.jpg"
git rm "public/assets/Arreglo_delux.jpg"
git rm "public/assets/arreglito-de-6-rosas.jpg"

Write-Host "Listo. Revisa 'git status' antes de confirmar." -ForegroundColor Green
Write-Host "Luego ejecuta:" -ForegroundColor Cyan
Write-Host '  git add .'
Write-Host '  git commit -m "Limpieza: elimina paginas y JS huerfanos, corrige enlace roto en contacto.html"'
Write-Host '  git push origin main'

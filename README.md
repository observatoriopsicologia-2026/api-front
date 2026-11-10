# Observatorio POT Frontend

Aplicación Angular pública y panel administrador del Observatorio POT.

## Instalar

```bash
cd api-front
npm install
```

## Configurar API

Para local usa `src/environments/environment.ts`.

En Cloudflare Pages configura la variable de compilacion `API_URL` con la URL
HTTPS real de Render terminada en `/api`. `prebuild` valida la URL y genera el
ambiente de produccion con ese unico valor publico. No exporta otras variables.
Pages rechaza la compilacion si falta `API_URL`, evitando publicar con una URL
de ejemplo. Para una compilacion local sin `API_URL` se conserva el ambiente
guardado en `src/environments/environment.prod.ts`:

```ts
apiUrl: 'https://tu-api.onrender.com/api'
```

## Ejecutar

```bash
npm start
```

La web queda en `http://localhost:4200`.

Si Windows muestra `spawn EPERM` con `esbuild`, cierra el `ng serve` que esté vivo con `Ctrl + C` y vuelve a ejecutar el build. Puedes validar tipos sin generar bundle con:

```bash
npm run typecheck
```

## Desplegar

El proyecto `observatorio-pot-ucatolica` de Cloudflare Pages usa Direct Upload.
Su direccion es https://observatorio-pot-ucatolica.pages.dev y su backend es
https://observatorio-pot-api-7kc0.onrender.com/api. El backend se despliega desde
GitHub en Render; el frontend se publica con Wrangler despues de compilar.
Subir commits a GitHub NO publica automaticamente el frontend.

Para publicar una nueva version desde PowerShell, con Node 24 y Wrangler autorizado
en la cuenta de Cloudflare del Observatorio:

```powershell
npm ci --include=dev
$env:API_URL = 'https://observatorio-pot-api-7kc0.onrender.com/api'
npm run verify
npx wrangler@4.159.0 pages deploy dist/observatorio-pot-web/browser --project-name observatorio-pot-ucatolica --branch main
```

Publicar solo el directorio `browser`, nunca la raiz del repositorio ni `.env`.
Los archivos `public/_redirects` y `public/_headers` configuran las rutas SPA y
cabeceras de seguridad. `render.yaml` se conserva como alternativa de hosting.

Para un proyecto nuevo con integracion Git nativa en Pages, usar el preset Angular,
la rama `main`, el directorio raiz del repositorio, Node 24 y la variable `API_URL`.
Un proyecto Direct Upload existente no se convierte a integracion Git nativa.
El comando de compilacion para esa alternativa es:

```bash
npm ci --include=dev && npm run build
```

Publish directory:

```text
dist/observatorio-pot-web/browser
```

Antes de publicar, configura `API_URL` con la URL HTTPS real del backend.
Configura esa misma URL del frontend como `CLIENT_ORIGIN` del backend.

Las credenciales de PostgreSQL, JWT y las claves de R2 solo van en Render para
el backend. Cualquier valor compilado en Angular es publico. No necesitas
Workers ni instalar PostgreSQL dentro de Cloudflare.

## Verificacion

```bash
npm run coverage
npm run build
```

`npm run verify` ejecuta ambas comprobaciones. El reporte usa solo registros de
la API: Inicio tampoco inventa contadores, paises, eventos ni noticias cuando
faltan datos o la API no responde.

Prueba abrir y recargar directamente `/admin`, `/publicaciones`, `/dataset` y
`/indicadores`. Comprueba acceso administrador,
subida de PDF, previsualizacion y descarga despues de reiniciar el backend.

## Reportes sin licencias de Power BI

`/dataset` y `/indicadores` usan Chart.js (licencia MIT), sin iframe ni login de
Microsoft. Los informes originales de Power BI no se borran ni se modifican.
Sus URLs antiguas en los ambientes ya no son utilizadas por los componentes.

El dataset carga metadatos visibles desde `/api/dataset/documents`, sin textos
extraidos ni binarios PDF. Fuente multiple, tematica, busqueda, tipo y rango de
anios afectan conjuntamente las graficas y la matriz. Las barras de tematica y
tipo tambien filtran al seleccionarse. La lista pagina los mismos resultados.
Actualizar recarga los datos guardados por el administrador; no requiere una
actualizacion programada de Power BI. Los indicadores usan `/api/analytics`.

Esto reproduce las visualizaciones actuales, no el editor completo de Power BI,
DAX ni su motor semantico. Los datos siguen siendo los de PostgreSQL. No hay
costos de licencia de graficacion; hosting, almacenamiento y trafico son aparte.

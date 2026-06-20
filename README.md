# GOATPHONE 🐐📱

E-commerce de celulares con un **módulo de comparación estilo versus.com**: puntaje por celular,
vistas de 1 / 2 / varios equipos enfrentados, cards de especificaciones que al expandirse muestran
un **gráfico interactivo** (barra / histograma / torta) comparando cada spec contra **toda la base
de datos** (posición vs la media), **resumen + ganador por IA**, **chat con IA (RAG)** y checkout con
**Mercado Pago (sandbox)**.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + TailwindCSS + TanStack Query |
| Gráficos | Recharts (barras, histograma, torta) |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL + **pgvector** (catálogo relacional + vector store para RAG) |
| Auth | JWT + bcrypt, roles `admin` / `client` |
| IA | Google Gemini `gemini-flash-lite-latest` + embeddings `text-embedding-004` |
| Pagos | Mercado Pago Checkout Pro (sandbox) |

Monorepo con **npm workspaces**:

```
packages/shared   → tipos + definición de specs (fuente única para scoring y gráficos)
apps/api          → NestJS (auth, dataset, catalog, comparison, ai, payments, orders)
apps/web          → React (catálogo, comparador, chat, carrito, admin)
```

## Requisitos previos

- **Node.js >= 20**
- **PostgreSQL 18** corriendo en `localhost:5432` con la extensión **pgvector** instalada
  (este proyecto ya detectó pgvector 0.8.2 en tu instalación).
- (Opcional) API key de **Google AI Studio** para la IA real.
- (Opcional) Credenciales de prueba de **Mercado Pago** (Argentina) para el checkout real.

> Sin las API keys el sistema funciona igual: la IA usa respuestas de *fallback* y el checkout
> devuelve un error claro hasta configurar Mercado Pago.

## Configuración (`.env`)

En la raíz del repo hay un `.env` (copia de `.env.example`). Valores clave:

```env
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/goatphone_v3?schema=public"
JWT_SECRET="<secreto largo>"
ADMIN_EMAIL="admin@goatphone.com"
ADMIN_PASSWORD="admin1234"

# IA (opcional)
GEMINI_API_KEY=""               # tu key de Google AI Studio
GEMINI_MODEL="gemini-flash-lite-latest"
GEMINI_EMBED_MODEL="text-embedding-004"
AI_MAX_OUTPUT_TOKENS="600"      # cuida el free tier
AI_RAG_TOP_K="6"

# Mercado Pago (opcional, sandbox)
MP_ACCESS_TOKEN=""              # Access Token de PRUEBA (TEST-...)
MP_PUBLIC_KEY=""
MP_CURRENCY="ARS"
MP_NOTIFICATION_URL="http://localhost:3000/payments/webhook"
```

## Puesta en marcha

```bash
# 1) instalar dependencias (raíz del monorepo)
npm install

# 2) crear la base y habilitar pgvector (una vez)
#    psql -U postgres -c "CREATE DATABASE goatphone_v3"
#    psql -U postgres -d goatphone_v3 -c "CREATE EXTENSION IF NOT EXISTS vector"

# 3) generar cliente + crear tablas
npm run prisma:generate
cd apps/api && npx prisma db push && cd ../..

# 4) importar el dataset (902 celulares) + spec_stats + usuario admin
npm run seed

# 5) levantar API (:3000) y Web (:5173)
npm run dev
```

Abrí <http://localhost:5173>. Login admin: **admin@goatphone.com / admin1234**.

> Si activás `GEMINI_API_KEY` después de cargar productos, reindexá los embeddings:
> `POST /ai/reindex` (como admin) para habilitar el RAG semántico.

## Cómo funciona

### Dataset y catálogo
- `imputed_final.csv` (902 celulares, 36 columnas) se importa a la tabla `dataset_phones`.
- El **admin** busca en ese dataset (`/dataset/search`) y agrega celulares al catálogo cargando
  **precio (ARS), stock e imagen** manualmente. Las specs se heredan del dataset.

### Puntaje (estilo versus.com)
- Cada spec cuantitativa se normaliza con **min-max sobre `spec_stats`** (percentiles p01–p99 de
  toda la base). Las booleanas valen 0/1. El precio entra como eficiencia en la categoría **Valor**.
- Se agrupa en 7 categorías ponderadas (Rendimiento, Cámara, Pantalla, Batería, Almacenamiento,
  Conectividad, Valor) → **score global 0–100**. Ver `apps/api/src/comparison/scoring.service.ts`.

### Gráficos de comparación
- Endpoint `GET /comparison/spec-distribution?spec=<key>&ids=<a,b>`:
  - **Cuantitativa** → histograma de la base + línea de media + marcadores de los celulares
    comparados + **percentil** de cada uno.
  - **Categórica / booleana** → torta con la distribución de la base, resaltando cada celular.
- En el front, cada **SpecCard** se expande y renderiza el gráfico con **Recharts** + una explicación.

### IA (Gemini + RAG híbrido)
- **Resumen + ganador**: `POST /ai/summary` (cacheado por set de celulares para ahorrar tokens).
- **Chat**: `POST /ai/chat` combina recuperación **estructurada** (SQL: stock, precio, marca) +
  **semántica** (pgvector top-K) y arma un contexto compacto. Rate-limit por usuario y `maxOutputTokens`
  acotado para cuidar el free tier.

### Pagos (Mercado Pago Checkout Pro – sandbox)
- `POST /payments/checkout` crea la orden y una *preference*; el front redirige al `init_point`.
- `POST /payments/webhook` confirma el pago y **descuenta stock** (requiere URL pública, ej. ngrok).
- En local sin webhook, la página de resultado confirma la orden vía
  `POST /payments/confirm/:orderId` (solo sandbox, validando dueño).

## Roles
- **admin**: buscar dataset, CRUD de productos (precio/stock/imagen/activo), ver órdenes, reindexar IA.
- **client**: ver/filtrar catálogo, comparar, chatear con IA, comprar.

## Scripts útiles
```bash
npm run dev            # api + web
npm run build          # build de los 3 paquetes
npm run seed           # re-importar dataset y recomputar spec_stats
npm run dev:api        # solo API
npm run dev:web        # solo Web
```

# API Documentation

AirAware exposes a secure REST API on port 3000.

## Endpoints & File Paths

### `GET /api/health`
- **File**: `server.ts`
- **Description**: Health check endpoint returning service status.

### `GET /api/air`
- **File**: `src/app/api/airHandler.ts`
- **Query Parameters**: `q` (city name) OR `lat` & `lon` coordinates; optional `demo=true`.
- **Description**: Fetches current AQI, pollutants, hourly trend, and geocoded locations via the swappable data adapter and TTL cache.

### `POST /api/plan`
- **File**: `src/app/api/planHandler.ts`
- **Body Schema**: `recommendationsRequestSchema` (`src/lib/validation/schemas.ts`)
- **Description**: Generates deterministic recommendations (`dailyRoutine`, `indoorHacks`, `sustainableAlternatives`, safety precautions) and impact estimates.

### `POST /api/assist`
- **File**: `src/app/api/assistHandler.ts`
- **Body Schema**: `assistRequestSchema` (`src/lib/validation/schemas.ts`)
- **Description**: Returns Zod-validated structured Gemini explanations using coarse profile context, cached by SHA-256 request hash with graceful fallback (`fallback: true`).

## Known Limitations

- **Rate Limits**: General API endpoints enforce a per-IP limit of 60 req/min; AI assistant endpoints enforce 10 req/min per instance.

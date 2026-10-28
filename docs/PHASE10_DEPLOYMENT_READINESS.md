# FinSure — Production Deployment Readiness Specification
**Phase 10 Product Completion & Operational Readiness Guide**  
**Document Version:** 1.0.0  
**Effective Date:** 2026-09-30  

---

## 1. Overview & Architecture Summary

FinSure is an enterprise-grade AI-powered financial fraud detection platform designed for high-velocity Unified Payments Interface (UPI) ecosystems under strict sub-100ms inference budgets.

The production runtime consists of:
1. **Frontend Presentation Layer:** Single-Page Application (SPA) built on React 18, TypeScript, Tailwind CSS, and Vite. Features dual-language customer explanations (EN/HI), forensic analyst workspaces, and accessible 3D WebGL visualizations with 2D fallbacks.
2. **Backend Serving Engine:** Python FastAPI microservice serving real-time multi-modal inference (`/api/v1/transactions/score`), Argon2id authentication, RBAC policy enforcement, incident response, evidence-grounded investigation, and cryptographic audit ledgers.
3. **Inference Pipeline:** 4-tier multi-model architecture:
   - Classical Tabular: XGBoost Classifier (36 features)
   - Behavioral Trajectory: GRU + Attention Pooling (50 steps x 12 features)
   - Relational Topology: GraphSAGE GNN (7,046 cached embeddings)
   - Unsupervised Anomaly: Deep Undercomplete Autoencoder (Bottleneck: 6 dims)
   - Typology Classification: 6-Class Multi-Task Scam Classifier
   - Decision Brain: Isotonic Regression Calibrated Meta-Learner Gate
4. **State & Persistence:** SQLite for local/offline testing; PostgreSQL-ready schema models (`backend/models/`) and Redis for feature caching and session stores.

---

## 2. Environment Variables & Configuration

### 2.1 Backend Environment Configuration (`.env`)

| Variable | Type | Default | Required in Production | Description |
|---|---|---|---|---|
| `APP_ENV` | String | `development` | Yes (`production`) | Application environment profile |
| `DEBUG` | Boolean | `false` | Yes (`false`) | Disables debug endpoints and verbose tracing |
| `PORT` | Integer | `8000` | Yes | HTTP listening port for Uvicorn |
| `HOST` | String | `0.0.0.0` | Yes | Network bind address |
| `CORS_ORIGINS` | Comma-separated | `http://localhost:3000` | Yes | Exact domain whitelist for frontend origins |
| `JWT_SECRET` | String | *Min 32 chars* | **CRITICAL** | Cryptographic key for HS256 JWT access tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | `15` | Yes | Access token lifetime window |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Integer | `7` | Yes | Refresh token rotation window |
| `ARGON2_MEMORY_COST` | Integer | `65536` | Yes | 64 MB Argon2id memory cost |
| `ARGON2_TIME_COST` | Integer | `2` | Yes | Iteration rounds for Argon2id |
| `ARGON2_PARALLELISM` | Integer | `4` | Yes | Thread parallelism for password hashing |
| `DATABASE_URL` | String | SQLite Path | Yes | PostgreSQL connection URI for enterprise deployment |
| `REDIS_URL` | String | `redis://localhost:6379/0` | Recommended | Redis connection URI for real-time feature store |
| `INVESTIGATOR_PROVIDER` | String | `template` | Yes | `template` (deterministic) or external LLM adapter |

### 2.2 Frontend Environment Configuration (`frontend/.env`)

| Variable | Type | Default | Required in Production | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | String | `/api/v1` | Yes | Base URL for FastAPI routes (e.g. `/api/v1` behind Nginx reverse proxy) |
| `VITE_ENABLE_3D` | Boolean | `true` | Optional | Global toggle for 3D Three.js canvas features |

---

## 3. Infrastructure & Dependency Requirements

### 3.1 Reverse Proxy & CORS Policy
- In production, static frontend assets must be served behind an edge reverse proxy (such as Nginx, Cloudflare, or AWS CloudFront).
- All `/api/` traffic must be securely proxied to the FastAPI service at `backend:8000`.
- CORS must be restricted strictly to the organization's domain:
  ```python
  allow_origins=["https://finsure.internal", "https://app.finsure.ai"]
  ```

### 3.2 Database Strategy
- **Development/Offline:** SQLite repositories (`data/finsure_auth.db`, `data/finsure_incidents.db`, `data/finsure_cases.db`) with thread-safe locking.
- **Enterprise Production:** PostgreSQL 15+ cluster with connection pooling (e.g., PgBouncer). All table schemas in `backend/models/` and `backend/repositories/` utilize SQL standard types.

### 3.3 Feature Store & Cache (Redis)
- Redis 7.0+ cluster with persistent AOF (Append-Only File).
- In the event of a Redis network partition, FinSure automatically activates its **In-Memory Resilient Fallback** (`backend/services/profile_service.py`), ensuring uninterrupted scoring under SLA budgets.

---

## 4. Frontend Production Build & Code Splitting

### 4.1 Build Verification
Execute the production compilation pass:
```bash
cd frontend
npm run build
```
Vite compiles the application with Rollup optimizations:
- `dist/index.html`: Entry HTML shell
- `dist/assets/index-*.js`: Vendor & app core routes
- `dist/assets/index-*.css`: Tailwind utility bundle
- `dist/assets/three-*.js`: Isolated Three.js WebGL spatial bundle (lazy loaded)

### 4.2 Three.js Lazy Loading Guarantee
- The 3D Three.js graphics engine is strictly lazy-loaded via `React.lazy` on views requiring spatial visualization:
  - `LandingPage`: VerdictGate 3D Ensemble Flow
  - `AnalystRingsPage`: Trinetra UPI Graph
  - `AnalystReplayPage`: Threat Globe Spatial Map
- **Crucial Performance Guarantee:** 3D libraries are **never loaded** on customer login, signup, OTP verification, customer simulator, simple tables, or admin governance screens.

---

## 5. Security & RBAC Enforcement Summary

1. **Server-Side Authorization Authority:** All role checks are performed server-side via FastAPI dependencies (`require_role([...])`). The frontend `RoleGuard` provides user-friendly redirection, but cannot bypass server RBAC.
2. **Four-Eyes Policy:** Dismissing a `CRITICAL` priority case (or risk score $\ge 90$) requires co-authorization from a second analyst or compliance supervisor (`approved_by !== actor_id`).
3. **Zero-Deletion Immutability:** Evidence records cannot be deleted from the database. A record may only be marked `withdrawn` with a mandatory reason code.
4. **Tamper-Evident SHA-256 Ledger:** All case transitions and incident events are cryptographically chained. Integrity verification detects any post-write database modifications.
5. **Assistive AI Boundary:** The FinSure Investigator is strictly assistive and read-only. It evaluates recorded evidence items and synthesizes explanatory narratives. It possesses zero capability or permission to mutate case records, change risk scores, or decide fraud verdicts.

---

## 6. Known Production Limitations & Edge Cases

1. **LLM Provider Integration:** The primary investigation engine runs the deterministic `TemplateInvestigatorAdapter`, which guarantees 100% citation groundedness. Local Ollama or remote LLM adapters should be evaluated in staging environments before enabling in production.
2. **Four-Eyes Approver Input:** In development and automated testing environments, co-authorization approval accepts manual input of a valid peer analyst ID (`approved_by`) rather than an active multi-session web socket handshake.
3. **Simulated Financial Rails:** Payments and UPI flows are simulated in synthetic sandboxes. Production integration requires connecting to bank payment switch APIs rather than live NPCI settlement rails directly.

---

## 7. Pre-Deployment Verification Checklist

- [x] All 148 backend regression unit tests passing (`backend/tests/`).
- [x] All Phase 9B customer portal unit tests passing (`phase9b_customer_portal.test.js`).
- [x] All Phase 9C analyst portal unit tests passing (`phase9c_analyst_portal.test.js`).
- [x] All Phase 9D case investigation workspace unit tests passing (`phase9d_case_workspace.test.js`).
- [x] Phase 10 product completion & integration test suite passing (`phase10_product_completion.test.js`).
- [x] Zero TypeScript compilation errors (`npx tsc --noEmit`).
- [x] Vite production build succeeds without warnings.
- [x] No secrets or credentials committed in frontend source or `.env`.
- [x] Verified P95 inference latency is under 100ms SLO (Measured: 98.16 ms).
- [x] All 3D views provide complete 2D/accessible fallbacks and support `prefers-reduced-motion`.
- [x] Backend authority strictly preserved (zero client-side risk or state calculation).

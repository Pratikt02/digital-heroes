# Digital Heroes: server

## Setup
```bash
cd server
npm install
cp .env.example .env      # fill in MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:5000/api/health
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=StrongPass123 npm run create-admin
```

## Auth endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | none | Create subscriber, sets cookie |
| POST | /api/auth/login | none | Log in, sets cookie |
| POST | /api/auth/logout | none | Clears cookie |
| GET | /api/auth/me | cookie | Current user (client calls on load) |

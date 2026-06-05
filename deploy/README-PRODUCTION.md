# DiagAuto Mada - Production Internet

Architecture production:

Client APK -> Internet HTTPS -> Backend API + MySQL -> Admin

## URL cible

Par defaut les builds cloud utilisent:

- API: `https://diagauto-connect.onrender.com/api`
- Client web: `https://client.diagautomada.com`

Si le domaine change, modifier `VITE_API_BASE_URL` avant build ou utiliser
`Configuration serveur` sur l'ecran de login.

## Serveur

1. Louer un VPS Ubuntu.
2. Pointer le DNS de votre domaine API vers le serveur choisi si vous ajoutez un domaine personnalise.
3. Installer Docker et Docker Compose.
4. Copier le projet sur le serveur.
5. Copier `backend/.env.production.example` vers `backend/.env.production`.
6. Coller la connection string Supabase pooler dans `DATABASE_URL`, remplir `JWT_SECRET`, WhatsApp si disponible.

Exemple Supabase pooler:

```text
postgresql://postgres.sfofohkdhtbhenwggoar:VOTRE_MOT_DE_PASSE@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```
7. Lancer:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

8. Mettre Nginx/Caddy devant `127.0.0.1:5000` avec HTTPS.

## Rebuild APK Client cloud

Sur le PC de build:

```powershell
$env:VITE_API_BASE_URL="https://diagauto-connect.onrender.com/api"
npm.cmd run build:mobile:client --prefix web
npm.cmd run android:sync --prefix mobile/client
```

Puis construire l'APK Android comme d'habitude.

## Admin cloud

L'Admin v1.5+ peut utiliser l'API publique. Si besoin, cliquer
`Configuration serveur` sur l'ecran de login et mettre:

```text
https://diagauto-connect.onrender.com/api
```

# CMS for local development

Only Clarity and PostgreSQL run on `root@xlsft.com`, under
`/root/services/cv.xlsft.com`. The CV frontend remains local.

- Compose file: `docker-compose.yaml`.
- Clarity: published `crumbleerp/clarity:40c71ad`, pinned to its multiarch digest.
- Public CMS: `https://cv.xlsft.com/admin/`, dataset `cv`.
- Media: Beget S3 bucket `3f3deb6e7eb1-cv-xlsft-ru`.
- S3 endpoint: `https://s3.ru1.storage.beget.cloud`, region `ru1`.
- Database: persistent named PostgreSQL volume.

Traefik uses the existing external `traefik` network, `websecure` entrypoint and
`letsencrypt` resolver. It forwards the complete `/admin/` prefix to Clarity.
Old `/admin/media/` links redirect to Beget. No router publishes the site root.

The server directory needs only `docker-compose.yaml` and private `.env` with
`POSTGRES_PASSWORD`, `CLARITY_ROOT_PASSWORD`, `CLARITY_SESSION_SECRET`,
`STORAGE_ACCESS_KEY`, and `STORAGE_SECRET_KEY`. Do not add credentials to Git.

```sh
cd /root/services/cv.xlsft.com
docker compose pull
docker compose up -d
docker compose ps
```

Local development reads this CMS using `CLARITY_ENDPOINT` and a read-only
`CLARITY_DEV_TOKEN`; automatic schema publishing is disabled.

Do not use `docker compose down -v`: that would delete the live CMS database.

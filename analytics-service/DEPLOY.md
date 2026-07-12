# Deploying analytics-service to AWS (Day 11)

Backend → **Elastic Beanstalk** (Java SE platform) running `target/application.jar`
against a managed **RDS PostgreSQL** and **ElastiCache Redis**.

The repo already contains everything needed for the deploy bundle:

- `Procfile` — binds Spring to EB's `PORT=5000`.
- `.ebextensions/env.config` — non-secret env properties (driver, `SQL_INIT_MODE=never`, S3/SMS on, region).
- `pom.xml` `<finalName>application</finalName>` — stable `target/application.jar`.
- `application.yml` — every cloud value is an env-var override (`DB_*`, `REDIS_*`, `S3_*`, `AT_*`, `CORS_ALLOWED_ORIGINS`, `SQL_INIT_MODE`).

Secrets and endpoints are **never** committed; set them with `eb setenv` (below).

## Prerequisites
- `aws configure` done (access key/secret, default region `eu-west-1`).
- EB CLI: `/c/Users/Chartsmademe/AppData/Roaming/Python/Python314/Scripts/eb.exe`.

## 1. RDS PostgreSQL
1. Create a PostgreSQL instance (`db.t3.micro` is fine for the demo), DB name `foodtrace`.
2. Note the endpoint, master username, password.
3. Load Role 1's schema + seed data into it (Role 1 owns these tables):
   ```bash
   psql "host=<rds-endpoint> dbname=foodtrace user=<user>" -f src/main/resources/schema.sql
   psql "host=<rds-endpoint> dbname=foodtrace user=<user>" -f src/main/resources/data.sql
   ```
   (Until Role 1's canonical dump is available, the service's own `schema.sql`/`data.sql`
   match the agreed column contract and seed realistic numbers.)

## 2. ElastiCache Redis
1. Create a Redis (cluster-mode-disabled) node; note the primary endpoint.
2. Same VPC as EB so the security groups can reach it.

## 3. Build the bundle
```bash
cd analytics-service
../tools/apache-maven-3.9.9/bin/mvn.cmd clean package   # → target/application.jar
```

## 4. Elastic Beanstalk
```bash
eb init -p "Corretto 17" analytics-service --region eu-west-1
eb create foodtrace-analytics-prod --single        # --single = no load balancer (demo cost)
```
Then set endpoints + secrets (NOT in git):
```bash
eb setenv \
  DB_URL=jdbc:postgresql://<rds-endpoint>:5432/foodtrace \
  DB_USERNAME=<user> DB_PASSWORD=<secret> \
  REDIS_HOST=<elasticache-endpoint> REDIS_PORT=6379 \
  S3_BUCKET=<evidence-bucket> \
  AT_USERNAME=<at-user> AT_API_KEY=<secret> AT_SENDER_ID=<id> \
  CORS_ALLOWED_ORIGINS=https://<amplify-domain>
eb deploy
```

## 5. Security groups
- Add an inbound rule on the **RDS** SG allowing Postgres (5432) **from the EB instance SG**.
- Add an inbound rule on the **ElastiCache** SG allowing Redis (6379) **from the EB instance SG**.

## 6. Verify
```bash
eb open                       # or: curl https://<eb-env-url>/api/health
curl https://<eb-env-url>/api/analytics/summary
```
Expect health `UP` and the summary KPIs (30 batches / 10 farms / 5 recalls / 2 active / 4 compliance flags).

> EB restarts re-run the app but **not** the SQL init (`SQL_INIT_MODE=never`), so RDS data is preserved.

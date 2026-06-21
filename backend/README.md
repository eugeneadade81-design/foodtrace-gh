# FoodTrace Spring Boot Backend

This is the active FoodTrace GH backend. It is a Java 21 Spring Boot API using PostgreSQL and Flyway migrations.

## Requirements

- Java 21+
- Maven 3.9+
- PostgreSQL

## Run

From the repository root:

```powershell
npm run dev:backend
```

Or from this folder:

```powershell
mvn spring-boot:run
```

The API listens on `PORT` or `3000` by default and serves routes under `/api`.

## Environment

```text
DATABASE_URL=jdbc:postgresql://localhost:5432/foodtrace
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JWT_SECRET=replace-this-in-production
FRONTEND_URL=http://localhost:5173
MOBILE_ORIGINS=exp://localhost:8081
EXPOSE_OTP=false
```

Hosted `postgres://...` or `postgresql://...` URLs are converted to JDBC format during startup.

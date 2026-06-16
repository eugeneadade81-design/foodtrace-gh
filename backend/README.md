# FoodTrace Spring Boot Backend

This is the Spring Boot replacement for the current Express backend. It is scaffolded side-by-side so the existing Node backend remains available while the Java API is completed.

## Requirements

- Java 21+
- Maven 3.9+ or the Maven wrapper once added
- PostgreSQL

## Run

```powershell
cd backend-spring
mvn spring-boot:run
```

The API listens on `PORT` or `3000` by default and mirrors the existing frontend/mobile routes under `/api`.

## Environment

```text
DATABASE_URL=jdbc:postgresql://localhost:5432/foodtrace
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
JWT_SECRET=replace-this-in-production
FRONTEND_URL=http://localhost:5173
MOBILE_ORIGINS=exp://localhost:8081
```

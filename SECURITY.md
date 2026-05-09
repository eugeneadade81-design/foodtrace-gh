# Security

FoodTrace GH is designed for public health and product-safety workflows, so the platform treats consumer, farmer, manufacturer, pharmacist, and regulator data as sensitive.

## Data Stored

FoodTrace GH stores:

- Account details such as name, phone, email, role, language, and verification status.
- Farm, crop-cycle, pesticide-input, manufacturer, pharmacy, batch, and QR records.
- Consumer scan history and consumer safety reports.
- District-level location details for farms, pharmacies, reports, recalls, and analytics.
- Uploaded report photos when a deployment enables file storage.

The platform does not require precise GPS coordinates for the core demo workflow.

## Protection Controls

- Passwords are hashed before storage.
- OTP verification is used for account verification flows.
- AES-256 encryption at rest is expected for production database volumes, object storage, and managed backups.
- TLS 1.3 is expected for production traffic between clients, APIs, databases, cache, and object storage.
- JWT secrets must be long, random, and stored only in environment variables or a production secret manager.
- Redis and PostgreSQL should not be publicly exposed in production.
- API routes enforce role-based access so each role only reaches the workflows intended for that role.

## Location Privacy

FoodTrace GH stores district-level location only for the demo and expected production workflow. It does not need precise GPS to verify product safety, route recalls, or show regulator analytics.

## Data Deletion

Users may request deletion of their account and associated personal data. Production operators should verify the requester and complete deletion or anonymization within 30 days, except where legal or public-safety retention requirements apply.

## Reporting Security Issues

Please report security concerns privately to the FoodTrace GH maintainers or Group 94 project lead. Do not publish exploit details before the team has had time to investigate and patch.

## Production Checklist

- Rotate all demo secrets before deployment.
- Use managed PostgreSQL backups and encrypted volumes.
- Enable HTTPS with TLS 1.3.
- Restrict database, Redis, and object storage access by network policy.
- Configure audit logging for regulator and recall actions.
- Review Africa's Talking, Google Cloud, and storage credentials regularly.

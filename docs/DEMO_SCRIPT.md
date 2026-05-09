# FoodTrace GH Demo Script

Target length: under 5 minutes.

## 1. The Problem - 30 Seconds

"91% of Ghanaian consumers cannot verify the safety of locally produced food. FoodTrace GH gives consumers, farmers, manufacturers, pharmacists, and FDA regulators one shared traceability system so a QR scan can answer: is this safe, where did it come from, and what should I do next?"

## 2. Consumer Demo - 1 Minute

1. Open the web app or mobile app.
2. Show the FoodTrace GH landing page and the tagline: "Scan It. Trace It. Trust It."
3. Scan or enter `FT-QR-1001`.
4. Show the green safe result for Accra Foods Tomato Paste 400g.
5. Point out manufacturer, batch number, expiry date, and recommended action.
6. Play or mention the audio summary.
7. Scan or enter `FT-QR-4004`.
8. Show the red recalled result for GoldCoast Sobolo Drink 500ml.
9. Show the report concern button as the consumer escalation path.

## 3. Farmer Demo - 1 Minute

1. Log in as `kwame.asante@foodtrace.gh` with `Password123!`.
2. Show Kwame Asante Farm in Kumasi, Ashanti Region.
3. Show crops: tomato and pepper.
4. Log Cypermethrin as a pesticide input.
5. Show EPA approved status and the calculated safe harvest date.
6. Point out that banned pesticides such as DDT trigger alerts.

## 4. Manufacturer Demo - 1 Minute

1. Log in as `accra.foods@foodtrace.gh` with `Password123!`.
2. Show Accra Foods Ltd and FDA registration `FDA/GH/2024/001`.
3. Show the batch list and QR code for `FT-QR-1001`.
4. Create or review a batch.
5. Issue a recall and show that the status can change from active to recalled.
6. Explain that consumer scans immediately reflect recall risk.

## 5. Drug Demo - 1 Minute

1. Scan or enter `DR-QR-2002`.
2. Show Artesunate 50mg with approved FDA status.
3. Point out the prescription required banner.
4. Scan or enter `DR-QR-4004`.
5. Show Fake Chloroquine as a red banned or recalled result.
6. Say: "For high-risk medicine, the app tells the user not to use it and to contact a pharmacist or regulator."

## 6. FDA Dashboard - 30 Seconds

1. Log in as `regulator@foodtrace.gh` with `Password123!`.
2. Show the compliance overview.
3. Point out farms, manufacturers, pharmacies, recalls, pending reports, and high-risk alerts.
4. Show the recall form with batch selector, reason, and district scope.

## 7. USSD Demo - 30 Seconds

1. Explain that FoodTrace GH also supports feature phones.
2. Show the menu idea: `*714*FOOD#`.
3. Enter a code such as `FT-QR-1001`.
4. Explain that SMS/USSD returns the same safety status for users without smartphones.

## 8. Closing - 30 Seconds

"FoodTrace GH can start with QR-based product verification, then grow into paid manufacturer traceability tools, pharmacy compliance dashboards, FDA analytics, and SMS/USSD access for mass adoption. Group 94 built it for Ghana's food and drug safety future."

## Demo Checklist

- Backend health is green at `http://localhost:3000/health`.
- Redis is connected.
- PostgreSQL database `foodtrace_gh` is migrated and seeded.
- Web app is open at `http://127.0.0.1:5173`.
- Mobile app has the correct API base URL for the phone or emulator.
- Practice the full demo at least 3 times and keep it under 5 minutes.

# CS554 Project 1 — EC2 REST Service: Pounds → Kilograms

A minimal REST API running on AWS EC2 that converts pounds (lbs) to kilograms (kg).

---

## Public Endpoints

- **With port**  
  `http://13.222.58.121:8080/convert?lbs=150`

- **Without port (via NGINX on 80)**  
  `http://13.222.58.121/convert?lbs=150`

- **HTTPS (extra credit via sslip.io)**  
  `https://13-222-58-121.sslip.io/convert?lbs=150`

> Note: HTTPS uses a demo hostname that maps to my EC2 IP for issuing a valid Let’s Encrypt certificate without buying a domain.

---

## API Specification

**GET** `/convert?lbs=<number>`

**200 OK** `application/json`
```json
{
  "lbs": 150,
  "kg": 68.039,
  "formula": "kg = lbs * 0.45359237"
}

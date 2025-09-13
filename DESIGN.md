# DESIGN.md — CS554 Project 1: EC2 REST (lbs → kg)

## 1) Overview & Goals
This project deploys a minimal REST service on AWS EC2 that converts pounds (lbs) to kilograms (kg). The service returns JSON with correct rounding (3 decimals) and input validation (400 on missing/invalid `lbs`, 422 on negative/non-finite). Secondary goals: secure provisioning (least privilege, tight Security Groups), reliable operation via service management, basic logging, and reproducible documentation. Optional enhancements include reverse proxying through NGINX and HTTPS via Let’s Encrypt.  
**Stack:** Node.js (Express + Morgan) managed by **systemd**; **NGINX** on port 80 as a reverse proxy; optional TLS using **sslip.io** + **Certbot**.  
**Public endpoints**  
- Direct app (8080): `http://13.222.58.121:8080/convert?lbs=150`  
- Via NGINX (80): `http://13.222.58.121/convert?lbs=150`  
- HTTPS (optional): `https://13-222-58-121.sslip.io/convert?lbs=150`  — I used the free hostname `13-222-58-121.sslip.io` from sslip.io, which resolves to `13.222.58.121`; this met Let’s Encrypt’s hostname requirement and allowed issuing a valid TLS certificate without buying a domain.

---

## 2) Architecture
**Instance:** Amazon Linux 2 on **t3.micro** (default VPC).  
**Process model**
- The Node.js app runs as non-root **ec2-user** under **systemd** (`node server.js`), configured to restart on failure and at boot.  
- **NGINX** listens on port 80 and proxies to `127.0.0.1:8080`.  
- **Certbot**  issues a certificate for `13-222-58-121.sslip.io` and configures NGINX for TLS.  
**Security Group Rule Summary**
- **SSH (22/tcp)** restricted to my IP.  
- **App (8080/tcp)** temporarily open for demo/testing.  
- **HTTP (80/tcp)** and **HTTPS (443/tcp)** open for web access during testing/TLS.  
**Data flow**
1) Client → `:8080` → Node.js service  
2) Client → `:80` → NGINX → `127.0.0.1:8080`  
3) Client → `:443` (TLS) → NGINX → `127.0.0.1:8080`

---

## 3) API Specification
**GET** `/convert?lbs=<number>`  

**200 OK** (JSON)  
```json
{ "lbs": 150, "kg": 68.039, "formula": "kg = lbs * 0.45359237" }
```  

**Errors**
- **400 Bad Request**: missing or invalid `lbs`.  
- **422 Unprocessable Entity**: negative or non-finite values.  

**Formula:** `kg = lbs * 0.45359237`, rounded to three decimals.  

---

## 4) Implementation
The service exposes a single route, `GET /convert?lbs=<number>`. It computes kilograms with the formula `kg = lbs * 0.45359237`, rounds the result to three decimals, and returns JSON in the shape `{ "lbs": <number>, "kg": <number>, "formula": "kg = lbs * 0.45359237" }`. Inputs are validated: if `lbs` is missing or not a number the API returns **400 Bad Request**; if `lbs` is negative or not finite (NaN/Infinity) it returns **422 Unprocessable Entity**.

Requests are logged by Express using Morgan; logs go to stdout and are collected/rotated by the OS via systemd-journald—no custom log files are created. The app runs as the non-root `ec2-user` under **systemd**, set to restart on failure and start at boot. It listens on `0.0.0.0:8080`, while **NGINX** listens on port 80 and proxies to `127.0.0.1:8080`. For HTTPS, the hostname `13-222-58-121.sslip.io` maps to the instance IP, allowing **Certbot** to obtain a Let’s Encrypt certificate; NGINX then terminates TLS on port 443.


---

## 5) Security & Hygiene
- **Least privilege.** The service runs as the non-root `ec2-user` (evidence in screenshots).
- **Security Group rule summary.** Inbound limited to: **SSH (22)** only from my IP; **8080** opened temporarily for demo; **HTTP (80)** and **HTTPS (443)** open only during testing/TLS.
- **Logging hygiene.** Morgan writes access logs to stdout; **systemd-journald** collects and rotates them (no custom log files).
- **Cost hygiene (cleanup executed).** After project completion, I closed 8080/80/443, terminated the EC2 instance, deleted the project Key Pair, and verified no orphaned EBS volumes or Elastic IPs remain (see Cleanup Note for evidence).

---

## 6) Testing & Evidence
- **Local EC2 tests:** verified with curl against `127.0.0.1:8080`.  
- **External tests:** curl and Postman against the public IP confirmed both valid and error cases.  
- **Reliability:** `systemctl status p1` confirmed service was active; `journalctl` logs verified request handling.  
- **Screenshots:** included in README to document successful responses over 8080, 80, and HTTPS.  

---

## 7) Rationale
**Stack:** Node.js (Express + Morgan) running under **systemd**; **NGINX** on port 80 reverse-proxies to `127.0.0.1:8080`; optional HTTPS via **Certbot** using an **sslip.io** hostname.

**Public endpoints**
- Direct app (8080): `http://13.222.58.121:8080/convert?lbs=150`
- Via NGINX (80): `http://13.222.58.121/convert?lbs=150`
- HTTPS: `https://13-222-58-121.sslip.io/convert?lbs=150` — I used the free hostname `13-222-58-121.sslip.io` (maps to `13.222.58.121`), which satisfies Let’s Encrypt’s hostname requirement, so a valid TLS certificate could be issued without buying a domain.
---

## 8) Cleanup Note (Executed)
Evidence of resource cleanup to satisfy the “Cleanup & Cost Hygiene” requirement.

- **Closed Security Group ports 8080, 80, and 443**  
  ![Updated Security Group inbound rules](screenshots/updated-sg.png)  
  *Figure 25: Security Group after cleanup — only SSH (22) from my IP is allowed.*

- **Terminated the EC2 instance**  
  ![Terminated EC2](screenshots/terminated.png)  
  *Figure 26: EC2 console showing the instance in the Terminated state.*

- **Deleted the project Key Pair; no Elastic IP was allocated**  
  ![Deleted Key Pair](screenshots/keydelete.png)  
  *Figure 27: Key Pair list after deletion (Elastic IPs list is empty).*

- **Verified no orphaned EBS volumes remain**  
  ![Verified EBS volumes](screenshots/volume.png)  
  *Figure 28: Volumes page confirming no remaining EBS volumes in this region.*


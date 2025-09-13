# DESIGN.md — CS554 Project 1: EC2 REST (lbs → kg)

### 1) Overview & Goals
This project deploys a small REST API on AWS EC2 that converts pounds (lbs) to kilograms (kg). It returns JSON, rounding results to **three decimals**. Inputs are validated: if `lbs` is missing or not a number, the API returns **400 Bad Request**; if `lbs` is negative or not finite (NaN/Infinity), it returns **422 Unprocessable Entity **. The build focuses on secure setup (least-privilege user, tight Security Groups), reliable operation (managed by systemd), basic logging, and clear, reproducible setup docs. Optional extras include placing **NGINX** in front as a reverse proxy and enabling **HTTPS** with Let’s Encrypt (via an `sslip.io` hostname).
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

**Logging & service management:** Express (via Morgan) writes one line per request to standard output. systemd-journald automatically captures those lines into the OS “journal” and rotates them-i.e., it keeps recent logs and, when size/time limits are reached, it compresses or discards older entries so logs don’t grow forever. No app-specific log files are created. The app runs as the non-root ec2-user under systemd; it’s enabled to start at boot and configured with Restart=always, so if the process crashes or the VM reboots, systemd brings it back. 

**Networking:** the app listens on 0.0.0.0:8080; NGINX listens on port 80 and forwards requests to 127.0.0.1:8080. For HTTPS, 13-222-58-121.sslip.io maps to the instance IP so Certbot can obtain a Let’s Encrypt certificate; NGINX then terminates TLS on port 443.

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

## 7) Design Decisions
- **Why this stack:** Node.js/Express is quick to build a single GET endpoint; Morgan gives simple access logs; **systemd** keeps the service running through failures and reboots.
- **Why NGINX:** It’s the public front door on **80/443** and forwards to the app on **127.0.0.1:8080**, so HTTPS/networking stays at the edge while the app only handles lbs→kg logic.
- **Why sslip.io + Certbot:** `sslip.io` turns the IP `13.222.58.121` into a free hostname `13-222-58-121.sslip.io`. Let’s Encrypt requires a hostname, so this enables a real TLS cert without buying a domain.
- **Security posture:** Runs as non-root `ec2-user`; Security Group opens only what’s needed during testing.
- **Cost hygiene:** Cleaning up—closing ports, terminating the instance, and deleting the project Key Pair and any orphaned EBS volumes—prevents ongoing charges.

**Stack:** Node.js (Express + Morgan) under **systemd**; **NGINX** on port 80 proxying to `127.0.0.1:8080`; optional HTTPS via **Certbot** using an **sslip.io** hostname.

**Public endpoints (for reference)**
- Direct (8080): `http://13.222.58.121:8080/convert?lbs=150`
- Via NGINX (80): `http://13.222.58.121/convert?lbs=150`
- HTTPS (optional): `https://13-222-58-121.sslip.io/convert?lbs=150` — hostname maps to `13.222.58.121`, satisfying Let’s Encrypt’s hostname requirement.
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


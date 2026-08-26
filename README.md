# Hostel Ease — Student Accommodation Platform (LAUTECH Edition)

> **"Find your hostel. Stress less."**  
> Official student housing platform for **Ladoke Akintola University of Technology (LAUTECH)**, Ogbomoso, Oyo State, Nigeria.

---

## 🌟 Overview & Core Capabilities

Hostel Ease is a verified student accommodation platform engineered to eliminate stress, fake agents, and high fees for LAUTECH students.

* **Student Hub**: Smart search across Ogbomoso neighborhoods (*Under G*, *Adenike*, *Stadium*, *Isale General*), transparent fee itemization, scheduled physical/virtual inspections, reservation escrow payments, move-in damage audits, and **100% optional roommate compatibility matching**.
* **Landlord Portal**: Listing management, room space availability controls, inspection scheduling, booking requests, move-in key handover verification, and real-time revenue ledger.
* **Admin Command Center**: Landlord identity verification (NIN/CAC/Property Deeds), dispute escrow mediation, safety report investigations, community moderation, and supply-demand gap telemetry.
* **Community Engine**: Factual student Q&A, 9-category structured hostel feedback, verified stay badges, and local campus commute guides.

---

## 🛠️ Architecture Stack

* **Frontend**: React 18, Vite 6, TypeScript 5, Tailwind CSS, Lucide Icons.
* **Backend**: Node.js + Express 5 (ES Modules), TypeScript runtime via `tsx`.
* **Database**: Embedded SQLite with `better-sqlite3` (Write-Ahead Logging `WAL` mode and foreign keys enabled). Zero-config, persistent at `data/hostel_ease.db`.
* **Process Management**: PM2 enterprise process supervisor with automatic restart on crashes and server reboots.
* **Reverse Proxy**: Nginx with SSL/TLS (Let's Encrypt Certbot), rate limiting, and gzip compression.

---

## 🚀 Local Development Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/your-username/hostel-ease.git
cd hostel-ease

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env

# 4. Start full development stack (Frontend on :3000 + Backend on :5000)
npm run dev:all
```

* **Frontend App**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`
* **Health Check**: `http://localhost:5000/api/health`

---

## 🌐 Production Deployment Architecture (Antigravity → GitHub → Production Server)

This project is architected for **independent 24/7 production operation**. Antigravity is only used as your development IDE. Once code is pushed to GitHub, your production server runs autonomously without requiring active AI tokens or sessions.

```text
┌──────────────────────────────────────┐
│  DEVELOPMENT (Antigravity IDE)       │
│  - Code changes & local tests        │
│  - Git commit & push                 │
└──────────────────┬───────────────────┘
                   │  git push origin main
                   ▼
┌──────────────────────────────────────┐
│       GITHUB REPOSITORY              │
│  - Single source of truth            │
│  - Automated GitHub Actions CI/CD    │
└──────────────────┬───────────────────┘
                   │  SSH Deployment Action / Git Pull
                   ▼
┌────────────────────────────────────────────────────────┐
│             PRODUCTION VPS SERVER (24/7)               │
│  - Reverse Proxy: Nginx                                │
│  - Process Manager: PM2 (Auto-restart on crash/reboot) │
│  - Unified Node Server: Express (serves API & SPA)     │
│  - Persistent SQLite: `data/hostel_ease.db`            │
│  - Persistent Media: `uploads/`                        │
│  - Runs completely independently of Antigravity        │
└────────────────────────────────────────────────────────┘
```

---

### Step 1: Server Prerequisites (Ubuntu 22.04+ LTS VPS)

On your Ubuntu VPS (e.g. DigitalOcean, Linode, AWS EC2, Hetzner):

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git nginx certbot python3-certbot-nginx sqlite3

# Install PM2 globally
sudo npm install -g pm2
```

---

### Step 2: Clone Repository on Server

```bash
# Create application directory
sudo mkdir -p /var/www/hostel-ease
sudo chown -R $USER:$USER /var/www/hostel-ease

# Clone repository
git clone https://github.com/your-username/hostel-ease.git /var/www/hostel-ease
cd /var/www/hostel-ease

# Install clean production dependencies
npm ci
```

---

### Step 3: Configure Production Environment (`.env`)

```bash
cp .env.example .env
nano .env
```

Set your production secrets:
```ini
NODE_ENV=production
PORT=5000
APP_URL=http://YOUR_SERVER_IP_OR_DOMAIN
AUTH_JWT_SECRET=generate_strong_64_char_random_secret_here
DATABASE_PATH=./data/hostel_ease.db
CORS_ORIGIN=*
```

*(To generate a strong JWT secret, run: `openssl rand -base64 48`)*

---

### Step 4: Build & Launch with PM2 Process Manager

```bash
# 1. Build the production React frontend bundle
npm run build

# 2. Run initial database migrations (idempotent, safe DDL)
npm run db:migrate

# 3. Start the application with PM2
pm2 start ecosystem.config.cjs --env production

# 4. Save PM2 state and configure systemd autostart on server reboot
pm2 save
pm2 startup
```

*(Copy and execute the `sudo env PATH=...` command generated by `pm2 startup`).*

---

### Step 5: Configure Nginx Reverse Proxy

1. Copy the Nginx configuration:
```bash
sudo cp nginx/hostelease.conf /etc/nginx/sites-available/hostelease.conf
sudo ln -s /etc/nginx/sites-available/hostelease.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

2. Edit the server block:
```bash
sudo nano /etc/nginx/sites-available/hostelease.conf
# Replace YOUR_DOMAIN.COM with your actual domain or VPS IP address
```

3. Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. *(Optional — Once your domain DNS is pointed)* Obtain free SSL certificate:
```bash
sudo certbot --nginx -d YOUR_DOMAIN.COM -d www.YOUR_DOMAIN.COM
```

---

### Step 6: Set Up Automated GitHub Actions CI/CD

Whenever you push to the `main` branch, GitHub Actions will automatically test, build, and deploy the new code to your production server.

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
| :--- | :--- |
| `PROD_HOST` | Your server's public IP address or hostname (e.g. `165.22.100.50`) |
| `PROD_USER` | Your server SSH username (e.g. `root` or `ubuntu`) |
| `PROD_SSH_KEY` | Private SSH key authorized to access the server |
| `PROD_PORT` | SSH port (default: `22`) |
| `PROD_APP_PATH` | Application directory on server (default: `/var/www/hostel-ease`) |

The deployment workflow is defined in `.github/workflows/deploy.yml`.

---

### Step 7: Automated Daily Database & Media Backups

Add a daily cron job to back up the SQLite database and uploaded photos:

```bash
# Make backup script executable
chmod +x /var/www/hostel-ease/scripts/backup.sh

# Open crontab
crontab -e

# Add daily backup at 2:00 AM:
0 2 * * * /var/www/hostel-ease/scripts/backup.sh >> /var/log/hostel-ease-backup.log 2>&1
```

Backups are saved to `/var/www/hostel-ease/backups/` and automatically retain the last 30 days.

---

## 🔧 Production Maintenance Commands

| Task | Command |
| :--- | :--- |
| **Check Application Status** | `pm2 status` |
| **View Live Real-Time Logs** | `pm2 logs hostel-ease` |
| **Restart Application** | `pm2 restart hostel-ease` |
| **Reload Zero-Downtime** | `pm2 reload hostel-ease` |
| **Stop Application** | `pm2 stop hostel-ease` |
| **One-Command Manual Deploy** | `./scripts/deploy.sh` |
| **Trigger Immediate Backup** | `./scripts/backup.sh` |
| **Check API Health Status** | `curl -i http://localhost:5000/api/health` |
| **Roll Back to Previous Git Commit** | `git reset --hard <commit-hash> && npm run build && pm2 reload hostel-ease` |

---

## 🔐 SQLite Data Protection Guarantees

1. **Zero Database Overwrites**: `data/hostel_ease.db` is ignored by Git in `.gitignore` and is never overwritten during `git pull` or deployments.
2. **Pre-Deploy Snapshots**: `scripts/deploy.sh` automatically creates a pre-deployment safety snapshot (`data/hostel_ease.db.pre-deploy-*`) before running migrations.
3. **Deterministic & Safe Migrations**: `server/migrate.ts` executes idempotent `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements inside an atomic SQLite transaction. It **never** drops tables, never resets schemas, and preserves all user records.
4. **Graceful Shutdown**: The Express server catches `SIGTERM` and `SIGINT` signals, closing active SQLite transactions cleanly to prevent database corruption.
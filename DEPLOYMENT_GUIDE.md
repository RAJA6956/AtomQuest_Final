# Deployment Guide - AtomQuest Real-Time Support Portal

This guide covers deploying the AtomQuest support portal to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Database backup strategy in place
- [ ] SSL/TLS certificates obtained
- [ ] Server firewall configured
- [ ] Logging and monitoring set up
- [ ] Backup and recovery procedures documented

## Production Environment Setup

### System Requirements
- Ubuntu 20.04+ (or equivalent Linux distribution)
- Node.js 16 LTS or higher
- 2+ CPU cores
- 2GB+ RAM
- 50GB+ disk space (for recordings)

### Installation Steps

1. **Clone/Transfer Project**
```bash
mkdir -p /opt/atomquest
cd /opt/atomquest
# Copy project files here
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install Dependencies**
```bash
npm ci --production  # Use 'ci' for reproducible builds
```

4. **Create Application User**
```bash
sudo useradd -r -s /bin/false atomquest
sudo chown -R atomquest:atomquest /opt/atomquest
```

5. **Configure Environment**
```bash
# Create .env file
cat > /opt/atomquest/.env <<EOF
PORT=3000
NODE_ENV=production
DATABASE_PATH=/var/lib/atomquest/data.db
UPLOADS_PATH=/var/lib/atomquest/uploads
RECORDINGS_PATH=/var/lib/atomquest/recordings
LOG_LEVEL=info
EOF

# Set permissions
chmod 600 /opt/atomquest/.env
```

6. **Create Data Directories**
```bash
sudo mkdir -p /var/lib/atomquest/{uploads,recordings,logs}
sudo chown -R atomquest:atomquest /var/lib/atomquest
sudo chmod 755 /var/lib/atomquest
```

## Running as a Service

### Using systemd (Recommended)

Create `/etc/systemd/system/atomquest.service`:
```ini
[Unit]
Description=AtomQuest Real-Time Support Portal
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=atomquest
WorkingDirectory=/opt/atomquest
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
EnvironmentFile=/opt/atomquest/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable atomquest
sudo systemctl start atomquest
sudo systemctl status atomquest
```

View logs:
```bash
sudo journalctl -u atomquest -f
```

### Using PM2

```bash
npm install -g pm2

# Start application
pm2 start server.js --name atomquest --instances max

# Configure to start on boot
pm2 startup systemd -u atomquest --hp /home/atomquest
pm2 save
```

## Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/atomquest`:
```nginx
upstream atomquest {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name atomquest.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name atomquest.example.com;

    # SSL Certificates (get from Let's Encrypt with Certbot)
    ssl_certificate /etc/letsencrypt/live/atomquest.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/atomquest.example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Proxy settings
    location / {
        proxy_pass http://atomquest;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload limits
    client_max_body_size 100M;

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/atomquest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/TLS Setup with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d atomquest.example.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Database Management

### Backup Strategy

Create `/opt/atomquest/backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/backups/atomquest"
DB_FILE="/var/lib/atomquest/data.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/data_$TIMESTAMP.db"

# Create backup
mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

Add cron job:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/atomquest/backup.sh
```

### Restore from Backup

```bash
# Stop the application
sudo systemctl stop atomquest

# Restore database
sudo cp /backups/atomquest/data_YYYYMMDD_HHMMSS.db.gz /tmp/
sudo gunzip /tmp/data_YYYYMMDD_HHMMSS.db.gz
sudo cp /tmp/data_YYYYMMDD_HHMMSS.db /var/lib/atomquest/data.db
sudo chown atomquest:atomquest /var/lib/atomquest/data.db

# Start the application
sudo systemctl start atomquest
```

## Monitoring and Logging

### System Monitoring

Install Prometheus metrics (optional):
```bash
npm install prom-client
```

### Log Rotation

Create `/etc/logrotate.d/atomquest`:
```
/var/lib/atomquest/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 atomquest atomquest
    sharedscripts
    postrotate
        systemctl reload atomquest > /dev/null 2>&1 || true
    endscript
}
```

### Health Checks

```bash
# Simple health check script
curl -s http://localhost:3000 | grep -q "AtomQuest" && echo "OK" || echo "DOWN"
```

Add to cron for monitoring:
```bash
*/5 * * * * /opt/atomquest/health_check.sh >> /var/log/atomquest_health.log
```

## Performance Tuning

### Node.js Configuration

```bash
# Increase file descriptors
sudo sysctl -w fs.file-max=65535

# TCP tuning
sudo sysctl -w net.core.somaxconn=1024
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=2048

# Make permanent
echo "fs.file-max=65535" | sudo tee -a /etc/sysctl.conf
```

### Application Tuning

In `server.js`:
```javascript
// Increase pool size for MediaSoup worker
const worker = await mediasoup.createWorker({
  rtcMinPort: 20000,
  rtcMaxPort: 20200,
  logLevel: 'warn',
  logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
});

// Tune for your infrastructure
process.env.UV_THREADPOOL_SIZE = 128;
```

## Security Hardening

1. **Firewall Configuration**
```bash
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 20000:20200/udp # MediaSoup RTC
```

2. **Fail2Ban Protection**
```bash
sudo apt-get install fail2ban
# Copy jail template and configure
```

3. **Regular Updates**
```bash
# Security updates
sudo apt-get update && sudo apt-get upgrade -y

# Node.js dependencies
npm audit fix --force
npm outdated
```

## Troubleshooting

### High CPU Usage
- Check number of active sessions
- Monitor MediaSoup worker processes
- Check for CPU-bound operations in logs

### High Memory Usage
- Check for memory leaks in application
- Monitor WebRTC transport creation
- Review database query performance

### Connection Issues
- Check firewall rules for RTC ports
- Verify NAT/port forwarding
- Check WebSocket connectivity
- Review reverse proxy configuration

## Disaster Recovery

1. **Complete System Failure**
   - Stop application
   - Restore database from backup
   - Restore uploaded files if available
   - Restart services

2. **Data Corruption**
   - Use backup from before corruption
   - Restore and verify data integrity
   - Test application before resuming

3. **Security Breach**
   - Stop application immediately
   - Analyze logs for breach details
   - Backup compromised database
   - Reinstall from clean system image
   - Restore database after review

## Rollback Procedure

```bash
# Keep previous version in /opt/atomquest-old
cd /opt/atomquest
sudo systemctl stop atomquest

# Rollback
sudo rm -rf /opt/atomquest
sudo mv /opt/atomquest-old /opt/atomquest
sudo chown -R atomquest:atomquest /opt/atomquest

sudo systemctl start atomquest
```

## Capacity Planning

Based on 2-core/2GB server:
- ~50 concurrent sessions
- ~1GB disk per 1000 recordings
- ~100MB disk per 50,000 chat messages

For larger deployments, consider:
- Load balancing (multiple instances)
- Database replication
- Object storage for recordings (S3, etc.)
- Message queue for chat/events

## Support and Updates

- Monitor Node.js security advisories
- Keep MediaSoup updated
- Review dependency vulnerabilities regularly
- Document all customizations
- Maintain deployment scripts version control

---

For questions or issues, refer to the main README.md and ARCHITECTURE.md files.

# Deployment Guide

## 1. Install dependencies

```bash
cd /home/edu/retiro
npm install
```

## 2. Set up systemd service

```bash
sudo cp retiro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable retiro
sudo systemctl start retiro
sudo systemctl status retiro
```

## 3. Set up nginx

```bash
sudo apt install nginx -y
sudo cp nginx.conf /etc/nginx/sites-available/retiro
sudo ln -s /etc/nginx/sites-available/retiro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Cloudflare setup

1. Add your domain to Cloudflare
2. Point DNS A record to your VPS IP (proxied/orange cloud)
3. SSL/TLS settings:
   - Set mode to "Full (strict)"
   - Create Origin Certificate in Cloudflare dashboard
   - Save cert to `/etc/ssl/cloudflare-origin.pem`
   - Save key to `/etc/ssl/cloudflare-origin-key.pem`
4. Enable "Always Use HTTPS"
5. Enable "Auto Minify" for JS/CSS/HTML
6. Set caching level to "Standard"

## 5. Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 6. Verify

```bash
# Check service status
sudo systemctl status retiro

# Check logs
sudo journalctl -u retiro -f

# Test locally
curl http://127.0.0.1:3000/api/health
```

## Security notes

- The app binds to 127.0.0.1 (localhost only) - nginx handles external traffic
- Rate limiting: 60 req/min general, 5 req/5min for refresh endpoint
- Helmet.js adds security headers (CSP, X-Frame-Options, etc.)
- Trust proxy enabled for correct client IP behind Cloudflare/nginx

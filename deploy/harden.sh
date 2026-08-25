#!/usr/bin/env bash
# harden.sh — idempotent Raspberry Pi host hardening (plan §7.4).
#
# Run as root on the Pi:  sudo bash harden.sh
#
# What it does:
#   1. unattended security updates
#   2. ufw: deny in, allow 80/443, SSH from LAN only
#   3. sshd: key-only auth, no root login  (COMMENTED until keys are confirmed)
#   4. fail2ban: sshd + nginx rate-limit jails
#   5. read-only web root ownership/permissions
#   6. systemd sandbox drop-in for nginx
#   7. logs → tmpfs (SD-card wear)
#
# TODO:LUKAS before first run:
#   - confirm you can log in with an SSH key, then un-comment section 3
#   - pick the exposure path: Cloudflare Tunnel (recommended — home IP stays
#     off DNS, router has zero inbound holes) vs. port-forward + DDNS.
#     NEVER expose port 22 to the internet either way.

set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }

WEBROOT=/srv/gamernation
WEBOWNER=gnweb                 # non-www-data owner; nginx only ever needs read
LAN_CIDR=192.168.0.0/16        # TODO:LUKAS — tighten to your actual LAN subnet

echo "── 1. unattended security updates"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -yq unattended-upgrades >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "── 2. firewall (ufw)"
DEBIAN_FRONTEND=noninteractive apt-get install -yq ufw >/dev/null
ufw --force default deny incoming
ufw default allow outgoing
ufw allow 80/tcp
ufw allow 443/tcp
# SSH from LAN only — with a Cloudflare/Tailscale tunnel you can delete this too
ufw allow from "$LAN_CIDR" to any port 22 proto tcp
ufw --force enable

echo "── 3. sshd hardening"
# Un-comment AFTER confirming key-based login works, or you will lock yourself out.
# install -d /etc/ssh/sshd_config.d
# cat > /etc/ssh/sshd_config.d/90-gn-harden.conf <<'EOF'
# PasswordAuthentication no
# PermitRootLogin no
# KbdInteractiveAuthentication no
# # TODO:LUKAS — set your login user and (optionally) a non-default port:
# # AllowUsers lukas
# # Port 2299
# EOF
# sshd -t && systemctl reload ssh
echo "   (section 3 is commented out — read the script before enabling)"

echo "── 4. fail2ban"
DEBIAN_FRONTEND=noninteractive apt-get install -yq fail2ban >/dev/null
cat > /etc/fail2ban/jail.d/gn.conf <<'EOF'
[sshd]
enabled = true

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "── 5. read-only web root"
id "$WEBOWNER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home-dir "$WEBROOT" "$WEBOWNER"
install -d "$WEBROOT"
chown -R "$WEBOWNER":"$WEBOWNER" "$WEBROOT"
find "$WEBROOT" -type d -exec chmod 0555 {} +
find "$WEBROOT" -type f -exec chmod 0444 {} +

echo "── 6. systemd sandbox for nginx"
install -d /etc/systemd/system/nginx.service.d
cat > /etc/systemd/system/nginx.service.d/harden.conf <<'EOF'
[Service]
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
NoNewPrivileges=yes
ReadWritePaths=/var/log/nginx /var/lib/nginx /run
EOF
systemctl daemon-reload

echo "── 7. nginx logs on tmpfs (SD-card wear)"
if ! grep -q "/var/log/nginx" /etc/fstab; then
  echo "tmpfs /var/log/nginx tmpfs defaults,noatime,nosuid,nodev,noexec,size=16m 0 0" >> /etc/fstab
  mount /var/log/nginx 2>/dev/null || true
fi

nginx -t && systemctl restart nginx || echo "nginx config test failed — fix before restart"
echo "done. re-run any time; every step is idempotent."

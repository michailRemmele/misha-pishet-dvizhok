#!/usr/bin/env bash
#
# Prepares the host to serve static sites behind a single native Caddy.
#
# Idempotent: safe to re-run. It does not touch site content and it does not
# start Caddy, so running it while the old Docker stack is still serving
# traffic causes no downtime. The cutover is a separate, deliberate step;
# see ops/MIGRATION.md.
#
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash ops/vps-bootstrap.sh"
  exit 1
fi

if [[ -n "${SUDO_USER:-}" ]]; then
  DEPLOY_USER="$SUDO_USER"
else
  DEPLOY_USER="root"
fi

echo "==> Deploy user: $DEPLOY_USER"

# --- packages ---------------------------------------------------------------

apt-get update
apt-get install -y ca-certificates curl gnupg ufw debian-keyring debian-archive-keyring apt-transport-https

# --- caddy from its own apt repository --------------------------------------

if [[ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]]; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
fi

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  > /etc/apt/sources.list.d/caddy-stable.list

apt-get update
apt-get install -y caddy

# Installing the package starts and enables the service. While the Docker stack
# still holds ports 80 and 443 that start fails, which is harmless but noisy.
# Stop it here; the cutover step enables it deliberately.
systemctl disable --now caddy || true

# --- layout -----------------------------------------------------------------
#
# Every site is a directory of timestamped releases plus a `current` symlink.
# Deploys write a new release and swing the symlink, so a publish is atomic and
# never leaves files behind from a page that was renamed or deleted.

install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/sites
for site in blog dachajs; do
  install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/srv/sites/$site"
  install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/srv/sites/$site/releases"
done

# Each site ships its own virtual host from its own repository into this
# directory, so no project needs to know how another one is served.
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /etc/caddy/conf.d

# --- let the deploy user reload caddy, and nothing else ---------------------

SYSTEMCTL="$(command -v systemctl)"

cat > /etc/sudoers.d/caddy-reload <<SUDOERS
$DEPLOY_USER ALL=(root) NOPASSWD: $SYSTEMCTL reload caddy
SUDOERS
chmod 440 /etc/sudoers.d/caddy-reload
visudo -c -f /etc/sudoers.d/caddy-reload

# --- firewall ---------------------------------------------------------------

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo
echo "Bootstrap complete. Caddy is installed but deliberately NOT running."
echo "Next: follow ops/MIGRATION.md to cut over from the Docker stack."

#!/bin/bash
set -euo pipefail

dnf install -y docker git openssl
systemctl enable --now docker

mkdir -p /usr/local/lib/docker/cli-plugins /opt/job-application-tracker
curl --fail --silent --show-error --location \
  https://github.com/docker/compose/releases/download/v2.39.1/docker-compose-linux-x86_64 \
  --output /usr/local/lib/docker/cli-plugins/docker-compose
curl --fail --silent --show-error --location \
  https://github.com/docker/compose/releases/download/v2.39.1/docker-compose-linux-x86_64.sha256 \
  --output /tmp/docker-compose.sha256
(cd /usr/local/lib/docker/cli-plugins && sha256sum --check /tmp/docker-compose.sha256)
chmod 755 /usr/local/lib/docker/cli-plugins/docker-compose

if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

touch /var/lib/job-tracker-bootstrap-ready

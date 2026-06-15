#!/bin/sh
# If docker.sock is mounted, create/update a docker group matching its GID
# so the node user can spawn sandbox containers.
if [ -S /var/run/docker.sock ]; then
    SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
    if ! getent group "$SOCK_GID" > /dev/null 2>&1; then
        addgroup -g "$SOCK_GID" docker 2>/dev/null
    fi
    DOCKER_GROUP=$(getent group "$SOCK_GID" | cut -d: -f1)
    addgroup node "$DOCKER_GROUP" 2>/dev/null
fi

exec su-exec node "$@"

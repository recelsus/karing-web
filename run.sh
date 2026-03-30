#!/usr/bin/env bash

set -eu

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="docker/docker-compose.yml"
BASE_PATH="${KARING_WEB_BASE_PATH:-/web/}"
NETWORK_NAME=""
TEST_PORT=""
NETWORK_OVERRIDE_FILE="$ROOT_DIR/docker/.network.override.yml"
ACTIVE_OPTIONS_FILE="$ROOT_DIR/docker/.active-options"

cd "$ROOT_DIR"

load_active_options() {
  if [ -f "$ACTIVE_OPTIONS_FILE" ]; then
    # shellcheck disable=SC1090
    . "$ACTIVE_OPTIONS_FILE"
  fi
}

usage() {
  cat <<'EOF'
Usage:
  ./run.sh [network_name]
  ./run.sh --test PORT [network_name]
  ./run.sh --help

Behaviour:
  - If containers are not running, build dist/ on the host and start compose.
  - If containers are running, stop compose.
  - Both start and stop ask for y/N confirmation.

Arguments:
  network_name   Optional external Docker network name to join.
  --test PORT    Publish nginx on 0.0.0.0:PORT for browser testing.

Environment:
  KARING_WEB_BASE_PATH   Base path for the frontend build. Default: /web/
EOF
}

load_active_options

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --test)
      if [ $# -lt 2 ]; then
        echo "--test requires a port." >&2
        exit 1
      fi
      TEST_PORT="$2"
      shift 2
      ;;
    *)
      if [ -z "$NETWORK_NAME" ]; then
        NETWORK_NAME="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      ;;
  esac
done

confirm() {
  local prompt="$1"
  local answer

  printf "%s [y/N]: " "$prompt"
  read -r answer || true

  case "$answer" in
    y|Y)
      return 0
      ;;
    *)
      echo "Cancelled."
      return 1
      ;;
  esac
}

is_running() {
  docker ps --format '{{.Names}}' | grep -Eq '^(karing|karing-web)$'
}

write_override_file() {
  cat > "$NETWORK_OVERRIDE_FILE" <<EOF
services:
$(if [ -n "$NETWORK_NAME" ]; then cat <<NETWORKS
  karing:
    networks:
      - shared_external

  karing-web:
    networks:
      - shared_external
NETWORKS
else cat <<WEBONLY
  karing-web:
WEBONLY
fi)
$(if [ -n "$TEST_PORT" ]; then cat <<PORTS
    ports:
      - "0.0.0.0:${TEST_PORT}:8080"
PORTS
fi)
$(if [ -n "$NETWORK_NAME" ]; then cat <<NETWORKS
networks:
  shared_external:
    external: true
    name: ${NETWORK_NAME}
NETWORKS
fi)
EOF
}

run_compose() {
  local compose_args=(-f "$COMPOSE_FILE")

  if [ -n "$NETWORK_NAME" ] || [ -n "$TEST_PORT" ]; then
    write_override_file
    compose_args+=(-f "$NETWORK_OVERRIDE_FILE")
    {
      printf 'NETWORK_NAME=%s\n' "$NETWORK_NAME"
      printf 'TEST_PORT=%s\n' "$TEST_PORT"
    } > "$ACTIVE_OPTIONS_FILE"
  else
    rm -f "$NETWORK_OVERRIDE_FILE" "$ACTIVE_OPTIONS_FILE"
  fi

  PROJECT_ROOT="$ROOT_DIR" docker compose "${compose_args[@]}" "$@"
}

start_stack() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required." >&2
    exit 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required." >&2
    exit 1
  fi

  if ! confirm "Start karing-web container after building dist/?"; then
    return 0
  fi

  if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install
  fi

  mkdir -p "$ROOT_DIR/data" "$ROOT_DIR/logs"

  echo "Building frontend for base path: $BASE_PATH"
  KARING_WEB_BASE_PATH="$BASE_PATH" npm run build

  echo "Starting docker compose..."
  run_compose up -d

  if [ -n "$TEST_PORT" ]; then
    echo "Test mode enabled:"
    echo "  karing     -> http://0.0.0.0:${TEST_PORT}/"
    echo "  karing-web -> http://0.0.0.0:${TEST_PORT}${BASE_PATH}"
  else
    echo "Containers started with internal expose on port 8080."
  fi
}

stop_stack() {
  if ! confirm "Stop karing-web container?"; then
    return 0
  fi

  run_compose down
  rm -f "$NETWORK_OVERRIDE_FILE" "$ACTIVE_OPTIONS_FILE"
}

if is_running; then
  stop_stack
else
  start_stack
fi

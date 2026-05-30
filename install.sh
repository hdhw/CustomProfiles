#!/usr/bin/env bash
set -euo pipefail

PLUGIN="CustomProfiles"
REPO="https://github.com/Equicord/Equicord.git"
ROOT="$(cd "$(dirname "$0")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }
step() { echo "==> $*"; }

need_cmd() {
    command -v "$1" >/dev/null 2>&1 || die "missing $1 — install it first"
}

ensure_pnpm() {
    if command -v pnpm >/dev/null 2>&1; then
        return
    fi
    step "pnpm not found, setting up"
    if command -v corepack >/dev/null 2>&1; then
        corepack enable
        corepack prepare pnpm@latest --activate
    elif command -v npm >/dev/null 2>&1; then
        npm install -g pnpm
    else
        die "need node/npm or corepack for pnpm"
    fi
    command -v pnpm >/dev/null 2>&1 || die "pnpm setup failed"
}

pick_equicord_dir() {
    if [[ -n "${EQUICORD_PATH:-}" ]]; then
        echo "$EQUICORD_PATH"
        return
    fi
    if [[ -d "$HOME/Equicord" ]]; then
        echo "$HOME/Equicord"
        return
    fi
    if [[ -d "$HOME/Documents/Equicord" ]]; then
        echo "$HOME/Documents/Equicord"
        return
    fi
    echo "$HOME/Equicord"
}

need_cmd git
need_cmd node
ensure_pnpm

EQ="$(pick_equicord_dir)"

if [[ ! -d "$EQ" ]]; then
    step "cloning Equicord -> $EQ"
    mkdir -p "$(dirname "$EQ")"
    git clone --depth 1 "$REPO" "$EQ"
elif [[ ! -f "$EQ/package.json" ]]; then
    die "$EQ exists but is not an Equicord folder"
fi

DEST="$EQ/src/userplugins/$PLUGIN"
step "installing plugin -> $DEST"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
mkdir -p "$DEST"
cp "$ROOT/index.tsx" "$DEST/index.tsx"

step "installing dependencies"
(cd "$EQ" && pnpm install --frozen-lockfile)

step "building"
(cd "$EQ" && pnpm build)

step "injecting into Discord (pick your install if asked)"
(cd "$EQ" && pnpm inject)

echo
echo "done."
echo "restart Discord, then enable CustomProfiles in Equicord settings."

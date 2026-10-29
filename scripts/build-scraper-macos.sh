#!/bin/bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT

git clone --depth 1 --branch v1.18.1 https://github.com/gosom/google-maps-scraper.git "$build_dir/google-maps-scraper"
mkdir -p "$project_dir/resources/bin"

cd "$build_dir/google-maps-scraper"
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$project_dir/resources/bin/google-maps-scraper" .
chmod +x "$project_dir/resources/bin/google-maps-scraper"
file "$project_dir/resources/bin/google-maps-scraper"

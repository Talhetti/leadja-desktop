#!/bin/bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_svg="$project_dir/resources/icon.svg"
iconset_dir="$project_dir/resources/icon.iconset"
output_icns="$project_dir/resources/icon.icns"
preview_dir="$(mktemp -d)"
trap 'rm -rf "$preview_dir" "$iconset_dir"' EXIT

rm -rf "$iconset_dir"
mkdir -p "$iconset_dir"
qlmanage -t -s 1024 -o "$preview_dir" "$source_svg" >/dev/null
source_png="$preview_dir/icon.svg.png"

for size in 16 32 128 256 512; do
  sips --resampleHeightWidth "$size" "$size" "$source_png" --out "$iconset_dir/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips --resampleHeightWidth "$double" "$double" "$source_png" --out "$iconset_dir/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns "$iconset_dir" -o "$output_icns"
echo "Ícone criado em $output_icns"

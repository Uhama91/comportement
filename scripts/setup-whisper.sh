#!/bin/bash
# Setup script for whisper-server sidecar binary and model
# Usage: ./scripts/setup-whisper.sh
set -euo pipefail

WHISPER_VERSION="v1.8.3"
MODEL_NAME="ggml-small.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"
APP_ID="fr.comportement.app"

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "${ARCH}" in
    arm64|aarch64) TRIPLE="aarch64-apple-darwin" ;;
    x86_64)        TRIPLE="x86_64-apple-darwin" ;;
    *)             echo "Architecture non supportee: ${ARCH}"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BINARY_DIR="${PROJECT_DIR}/src-tauri/binaries"
BINARY_PATH="${BINARY_DIR}/whisper-server-${TRIPLE}"

echo "=== Setup whisper-server pour Comportement ==="
echo "Architecture: ${TRIPLE}"
echo ""

# Step 1: Compile whisper-server
echo "--- Etape 1: Compilation de whisper-server ${WHISPER_VERSION} ---"

BUILD_DIR="/tmp/whisper-cpp-build-$$"
if [ -f "${BINARY_PATH}" ] && [ "$(wc -c < "${BINARY_PATH}" | tr -d ' ')" -gt 1000 ]; then
    echo "Binary deja present ($(du -h "${BINARY_PATH}" | cut -f1)). Passer avec --force pour recompiler."
    if [ "${1:-}" != "--force" ]; then
        SKIP_BUILD=1
    fi
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
    echo "Clonage whisper.cpp ${WHISPER_VERSION}..."
    git clone --depth 1 --branch "${WHISPER_VERSION}" https://github.com/ggml-org/whisper.cpp.git "${BUILD_DIR}"

    echo "Compilation..."
    cd "${BUILD_DIR}"
    cmake -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build -j$(sysctl -n hw.ncpu) --config Release

    echo "Copie du binaire..."
    cp build/bin/whisper-server "${BINARY_PATH}"
    chmod +x "${BINARY_PATH}"

    echo "Nettoyage..."
    rm -rf "${BUILD_DIR}"

    echo "Binary installe: $(du -h "${BINARY_PATH}" | cut -f1)"
fi

# Step 2: Download model
echo ""
echo "--- Etape 2: Telechargement du modele ${MODEL_NAME} ---"

if [ "${OS}" = "darwin" ]; then
    MODEL_DIR="${HOME}/Library/Application Support/${APP_ID}/models"
else
    MODEL_DIR="${HOME}/.local/share/${APP_ID}/models"
fi

MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"

mkdir -p "${MODEL_DIR}"

if [ -f "${MODEL_PATH}" ]; then
    SIZE=$(du -h "${MODEL_PATH}" | cut -f1)
    echo "Modele deja present: ${MODEL_PATH} (${SIZE})"
    echo "Passer avec --force pour retelecharger."
else
    echo "Telechargement de ${MODEL_NAME} (~488 Mo)..."
    echo "Cela peut prendre quelques minutes."
    curl -L --progress-bar -o "${MODEL_PATH}" "${MODEL_URL}"
    SIZE=$(du -h "${MODEL_PATH}" | cut -f1)
    echo "Modele telecharge: ${MODEL_PATH} (${SIZE})"
fi

echo ""
echo "=== Setup termine ==="
echo "Binary: ${BINARY_PATH}"
echo "Modele: ${MODEL_PATH}"
echo ""
echo "Lancez 'npm run tauri dev' pour tester."

#!/bin/bash
# Setup script for llama-server sidecar binary and Qwen 2.5 Coder 1.5B model
# Usage: ./scripts/setup-llama.sh [--force]
set -euo pipefail

LLAMA_VERSION="b5460"
MODEL_NAME="qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/${MODEL_NAME}"
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
BINARY_PATH="${BINARY_DIR}/llama-server-${TRIPLE}"

echo "=== Setup llama-server pour Comportement ==="
echo "Architecture: ${TRIPLE}"
echo ""

# Step 1: Compile llama-server
echo "--- Etape 1: Compilation de llama-server ${LLAMA_VERSION} ---"

BUILD_DIR="/tmp/llama-cpp-build-$$"
SKIP_BUILD=0
if [ -f "${BINARY_PATH}" ] && [ "$(wc -c < "${BINARY_PATH}" | tr -d ' ')" -gt 1000 ]; then
    echo "Binary deja present ($(du -h "${BINARY_PATH}" | cut -f1)). Passer avec --force pour recompiler."
    if [ "${1:-}" != "--force" ]; then
        SKIP_BUILD=1
    fi
fi

if [ "${SKIP_BUILD}" != "1" ]; then
    echo "Clonage llama.cpp ${LLAMA_VERSION}..."
    git clone --depth 1 --branch "${LLAMA_VERSION}" https://github.com/ggml-org/llama.cpp.git "${BUILD_DIR}"

    echo "Compilation..."
    cd "${BUILD_DIR}"
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DGGML_METAL=ON
    cmake --build build -j$(sysctl -n hw.ncpu) --config Release --target llama-server

    echo "Copie du binaire..."
    mkdir -p "${BINARY_DIR}"
    cp build/bin/llama-server "${BINARY_PATH}"
    chmod +x "${BINARY_PATH}"

    echo "Nettoyage..."
    rm -rf "${BUILD_DIR}"

    echo "Binary installe: $(du -h "${BINARY_PATH}" | cut -f1)"
fi

# Step 2: Download Qwen 2.5 Coder 1.5B model
echo ""
echo "--- Etape 2: Telechargement du modele ${MODEL_NAME} ---"

if [ "${OS}" = "darwin" ]; then
    MODEL_DIR="${HOME}/Library/Application Support/${APP_ID}/models"
else
    MODEL_DIR="${HOME}/.local/share/${APP_ID}/models"
fi

MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"

mkdir -p "${MODEL_DIR}"

if [ -f "${MODEL_PATH}" ] && [ "${1:-}" != "--force" ]; then
    SIZE=$(du -h "${MODEL_PATH}" | cut -f1)
    echo "Modele deja present: ${MODEL_PATH} (${SIZE})"
    echo "Passer avec --force pour retelecharger."
else
    echo "Telechargement de ${MODEL_NAME} (~980 Mo)..."
    echo "Cela peut prendre quelques minutes."
    curl -L --progress-bar -o "${MODEL_PATH}" "${MODEL_URL}"
    SIZE=$(du -h "${MODEL_PATH}" | cut -f1)
    echo "Modele telecharge: ${MODEL_PATH} (${SIZE})"
fi

# Step 3: Copy GBNF grammars to app data
echo ""
echo "--- Etape 3: Installation des grammaires GBNF ---"

GRAMMAR_SRC="${PROJECT_DIR}/src-tauri/grammars"
GRAMMAR_DST="${MODEL_DIR}/../grammars"

mkdir -p "${GRAMMAR_DST}"

if [ -d "${GRAMMAR_SRC}" ]; then
    cp "${GRAMMAR_SRC}"/*.gbnf "${GRAMMAR_DST}/" 2>/dev/null || true
    echo "Grammaires copiees dans: ${GRAMMAR_DST}"
else
    echo "ATTENTION: Repertoire grammaires introuvable: ${GRAMMAR_SRC}"
fi

echo ""
echo "=== Setup termine ==="
echo "Binary: ${BINARY_PATH}"
echo "Modele: ${MODEL_PATH}"
echo "Grammaires: ${GRAMMAR_DST}"
echo ""
echo "Lancez 'npm run tauri dev' pour tester."

#!/usr/bin/env bash
# Сборка бинарника whisper.cpp server для Audioray.
#
# Использование:
#   ./scripts/build-whisper.sh              # auto: Metal на Apple Silicon, иначе CPU
#   ./scripts/build-whisper.sh metal        # Apple Silicon (GPU)
#   ./scripts/build-whisper.sh cuda          # NVIDIA CUDA
#   ./scripts/build-whisper.sh vulkan        # Vulkan (AMD/Intel/NVIDIA)
#   ./scripts/build-whisper.sh cpu           # только CPU
#   ./scripts/build-whisper.sh openblas      # CPU + OpenBLAS
#
# Переменные окружения:
#   WHISPER_CPP_DIR  — путь к whisper.cpp (по умолчанию из whisper-node)
#   CMAKE_BUILD_TYPE — Release (по умолчанию) или Debug

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIORAY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND="${1:-auto}"

WHISPER_CPP_DIR="${WHISPER_CPP_DIR:-${AUDIORAY_ROOT}/node_modules/whisper-node/lib/whisper.cpp}"

if [[ ! -d "${WHISPER_CPP_DIR}" ]]; then
  echo "❌ Каталог whisper.cpp не найден: ${WHISPER_CPP_DIR}"
  echo "   Сначала выполните: cd audioray && npm install"
  exit 1
fi

detect_auto_backend() {
  case "$(uname -s)" in
    Darwin)
      if [[ "$(uname -m)" == "arm64" ]]; then
        echo "metal"
      else
        echo "cpu"
      fi
      ;;
    Linux)
      if command -v nvidia-smi >/dev/null 2>&1; then
        echo "cuda"
      else
        echo "cpu"
      fi
      ;;
    *)
      echo "cpu"
      ;;
  esac
}

if [[ "${BACKEND}" == "auto" ]]; then
  BACKEND="$(detect_auto_backend)"
  echo "ℹ️  Автовыбор backend: ${BACKEND}"
fi

echo "📦 whisper.cpp: ${WHISPER_CPP_DIR}"
echo "🔧 backend: ${BACKEND}"

build_with_cmake() {
  local build_dir="${WHISPER_CPP_DIR}/build"
  local cmake_args=(
    -B "${build_dir}"
    -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:-Release}"
    -DWHISPER_BUILD_SERVER=ON
  )

  case "${BACKEND}" in
    metal)
      cmake_args+=(-DWHISPER_METAL=ON)
      ;;
    cuda)
      cmake_args+=(-DGGML_CUDA=ON -DWHISPER_CUDA=ON)
      ;;
    vulkan)
      cmake_args+=(-DGGML_VULKAN=ON -DWHISPER_VULKAN=ON)
      ;;
    openblas)
      cmake_args+=(-DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS)
      ;;
    cpu)
      ;;
    *)
      echo "❌ Неизвестный backend: ${BACKEND}"
      echo "   Допустимо: auto, metal, cuda, vulkan, cpu, openblas"
      exit 1
      ;;
  esac

  cmake "${cmake_args[@]}" "${WHISPER_CPP_DIR}"
  cmake --build "${build_dir}" --config "${CMAKE_BUILD_TYPE:-Release}" -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"

  # CMake может положить бинарник в build/bin или build/
  for candidate in \
    "${build_dir}/bin/server" \
    "${build_dir}/bin/whisper-server" \
    "${build_dir}/server" \
    "${build_dir}/whisper-server"; do
    if [[ -f "${candidate}" ]]; then
      cp -f "${candidate}" "${WHISPER_CPP_DIR}/server"
      chmod +x "${WHISPER_CPP_DIR}/server"
      echo "✅ server: ${WHISPER_CPP_DIR}/server (из ${candidate})"
      return 0
    fi
  done

  echo "❌ Бинарник server не найден после cmake build"
  exit 1
}

build_with_make() {
  local make_args=()
  case "${BACKEND}" in
    metal)
      make_args+=(WHISPER_METAL=1)
      ;;
    cuda)
      make_args+=(WHISPER_CUDA=1)
      ;;
    vulkan)
      make_args+=(WHISPER_VULKAN=1)
      ;;
    openblas)
      make_args+=(WHISPER_OPENBLAS=1)
      ;;
    cpu)
      ;;
    *)
      echo "❌ Неизвестный backend: ${BACKEND}"
      exit 1
      ;;
  esac

  (
    cd "${WHISPER_CPP_DIR}"
    make clean 2>/dev/null || true
    make server -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)" "${make_args[@]}"
  )

  if [[ -f "${WHISPER_CPP_DIR}/server" ]]; then
    echo "✅ server: ${WHISPER_CPP_DIR}/server"
    return 0
  fi

  echo "❌ Бинарник server не найден после make"
  exit 1
}

if [[ -f "${WHISPER_CPP_DIR}/CMakeLists.txt" ]]; then
  if ! command -v cmake >/dev/null 2>&1; then
    echo "❌ cmake не найден. Установите CMake 3.x+"
    exit 1
  fi
  build_with_cmake
elif [[ -f "${WHISPER_CPP_DIR}/Makefile" ]]; then
  if ! command -v make >/dev/null 2>&1; then
    echo "❌ make не найден"
    exit 1
  fi
  build_with_make
else
  echo "❌ Не найден ни CMakeLists.txt, ни Makefile в ${WHISPER_CPP_DIR}"
  exit 1
fi

echo ""
echo "Проверка:"
"${WHISPER_CPP_DIR}/server" --help 2>&1 | head -5 || true
echo ""
echo "Готово. Запустите Audioray: npm run start:dev"

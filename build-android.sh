#!/bin/bash

# Android 正式版签名打包脚本（含自动安装环境）
# 支持 macOS / Linux (Debian/Ubuntu)
# 流程: 安装环境 -> 构建前端 -> cap sync -> gradle assembleRelease

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
APK_OUTPUT="$ANDROID_DIR/app/build/outputs/apk/release"

# Android SDK 配置
ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/.android/sdk}"
COMPILE_SDK=36
BUILD_TOOLS_VER="35.0.0"
CMDLINE_TOOLS_VER="13114758"   # commandlinetools-linux-* 版本号

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}========== $1 ==========${NC}"; }

# ─────────────────────────────────────────────
# 系统检测
# ─────────────────────────────────────────────
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="mac"
    elif [[ -f /etc/debian_version ]] || command -v apt-get &>/dev/null; then
        OS="debian"
    elif command -v yum &>/dev/null; then
        OS="rhel"
    else
        OS="unknown"
    fi
    log_info "操作系统: $OS"
}

# ─────────────────────────────────────────────
# 安装 Java 17
# ─────────────────────────────────────────────
install_java() {
    log_warn "未找到 java 或版本不足 21，开始自动安装 JDK 21..."
    if [[ "$OS" == "mac" ]]; then
        if ! command -v brew &>/dev/null; then
            log_error "macOS 需要先安装 Homebrew: https://brew.sh"
            exit 1
        fi
        brew install --quiet openjdk@21
        sudo ln -sfn "$(brew --prefix openjdk@21)/libexec/openjdk.jdk" \
            /Library/Java/JavaVirtualMachines/openjdk-21.jdk 2>/dev/null || true
        export PATH="$(brew --prefix openjdk@21)/bin:$PATH"
    elif [[ "$OS" == "debian" ]]; then
        apt-get install -y -qq wget apt-transport-https gnupg ca-certificates curl
        apt-get update -qq

        INSTALLED=0
        # 方案1: 官方源直接有 openjdk-21（Ubuntu 24.04 / Debian 13+）
        if apt-cache show openjdk-21-jdk-headless &>/dev/null 2>&1; then
            log_info "从官方源安装 openjdk-21..."
            apt-get install -y openjdk-21-jdk-headless && INSTALLED=1
        fi

        # 方案2: Debian backports（Debian 12 bookworm 可用）
        if [ "$INSTALLED" -eq 0 ]; then
            CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
            BACKPORT="${CODENAME}-backports"
            log_info "尝试 ${BACKPORT} 安装 openjdk-21..."
            echo "deb http://deb.debian.org/debian ${BACKPORT} main" \
                > /etc/apt/sources.list.d/backports.list
            apt-get update -qq
            if apt-cache show -t "$BACKPORT" openjdk-21-jdk-headless &>/dev/null 2>&1; then
                apt-get install -y -t "$BACKPORT" openjdk-21-jdk-headless && INSTALLED=1
            fi
        fi

        # 方案3: Eclipse Temurin（正确 dearmor 导入 GPG key）
        if [ "$INSTALLED" -eq 0 ]; then
            log_info "使用 Eclipse Temurin 仓库安装 JDK 21..."
            CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
            curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public \
                | gpg --dearmor -o /etc/apt/trusted.gpg.d/adoptium.gpg
            echo "deb https://packages.adoptium.net/artifactory/deb ${CODENAME} main" \
                > /etc/apt/sources.list.d/adoptium.list
            apt-get update -qq
            apt-get install -y temurin-21-jdk && INSTALLED=1
        fi

        if [ "$INSTALLED" -eq 0 ]; then
            log_error "所有方案均失败，请手动安装 JDK 21"
            exit 1
        fi

        # 切换系统默认 java 为 21
        JAVA21=$(update-alternatives --list java 2>/dev/null | grep -E "java-21|temurin-21" | head -1)
        [ -n "$JAVA21" ] && update-alternatives --set java "$JAVA21" 2>/dev/null || true
        export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
    elif [[ "$OS" == "rhel" ]]; then
        yum install -y java-21-openjdk-devel
        export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
    else
        log_error "不支持的系统，请手动安装 JDK 21"
        exit 1
    fi
    export PATH="$JAVA_HOME/bin:$PATH"
    log_info "Java 安装完成: $(java -version 2>&1 | head -1)"
}

# ─────────────────────────────────────────────
# 安装 Android SDK（仅 Linux）
# ─────────────────────────────────────────────
install_android_sdk_linux() {
    log_warn "未找到 Android SDK，开始自动安装..."
    apt-get install -y -qq wget unzip 2>/dev/null || yum install -y wget unzip 2>/dev/null || true

    mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
    local TOOLS_ZIP="/tmp/cmdline-tools.zip"
    local TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VER}_latest.zip"

    log_info "下载 Android Command Line Tools..."
    wget -q --show-progress -O "$TOOLS_ZIP" "$TOOLS_URL" || \
        curl -L --progress-bar -o "$TOOLS_ZIP" "$TOOLS_URL"

    log_info "解压 Command Line Tools..."
    unzip -q -o "$TOOLS_ZIP" -d "$ANDROID_SDK_ROOT/cmdline-tools"
    # Google 打包结构需要重命名为 latest
    if [ -d "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" ]; then
        mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" \
           "$ANDROID_SDK_ROOT/cmdline-tools/latest"
    fi
    rm -f "$TOOLS_ZIP"

    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

    log_info "安装 SDK 组件 (platforms;android-${COMPILE_SDK}, build-tools;${BUILD_TOOLS_VER})..."
    yes | sdkmanager --licenses > /dev/null 2>&1 || true
    sdkmanager \
        "platform-tools" \
        "platforms;android-${COMPILE_SDK}" \
        "build-tools;${BUILD_TOOLS_VER}"

    log_info "Android SDK 安装完成: $ANDROID_SDK_ROOT"
}

setup_android_sdk_env() {
    # 设置常见 SDK 路径
    local CANDIDATES=(
        "$HOME/.android/sdk"
        "$HOME/Android/Sdk"
        "/opt/android-sdk"
        "/usr/lib/android-sdk"
        "$ANDROID_HOME"
    )
    for dir in "${CANDIDATES[@]}"; do
        if [ -d "$dir/platform-tools" ]; then
            ANDROID_SDK_ROOT="$dir"
            export ANDROID_HOME="$dir"
            export PATH="$dir/cmdline-tools/latest/bin:$dir/platform-tools:$PATH"
            log_info "找到 Android SDK: $dir"
            return 0
        fi
    done
    return 1
}

# ─────────────────────────────────────────────
# nvm 加载（每次都尝试 source，确保当前 shell 可用）
# ─────────────────────────────────────────────
load_nvm() {
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    # ~/.npmrc 里的 prefix/globalconfig 与 nvm 不兼容，先移除
    if [ -f "$HOME/.npmrc" ]; then
        sed -i '/^prefix\s*=/d'       "$HOME/.npmrc" 2>/dev/null || true
        sed -i '/^globalconfig\s*=/d' "$HOME/.npmrc" 2>/dev/null || true
    fi

    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
}

# ─────────────────────────────────────────────
# 安装 Node.js 22（通过 nvm）
# ─────────────────────────────────────────────
install_nodejs() {
    log_warn "Node.js 未安装或版本不足 22，使用 nvm 安装 Node.js 22..."

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    # 安装 nvm（如果没有）
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        log_info "安装 nvm..."
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi

    # 激活 nvm
    load_nvm

    if ! command -v nvm &>/dev/null; then
        log_error "nvm 加载失败，请手动安装 Node.js 22: https://nodejs.org"
        exit 1
    fi

    log_info "通过 nvm 安装 Node.js 22..."
    nvm install 22
    nvm use 22
    nvm alias default 22

    log_info "Node.js 安装完成: $(node -v)"
}

# ─────────────────────────────────────────────
# 安装 pnpm
# ─────────────────────────────────────────────
install_pnpm() {
    log_warn "未找到 pnpm，开始自动安装..."
    if command -v npm &>/dev/null; then
        npm install -g pnpm --silent
    else
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        export PATH="$HOME/.local/share/pnpm:$PATH"
    fi
    # 刷新路径
    export PATH="$HOME/.local/share/pnpm:$(npm root -g 2>/dev/null | sed 's|/node_modules||')/.bin:$PATH"
    log_info "pnpm 安装完成: $(pnpm -v)"
}

# ─────────────────────────────────────────────
# 环境检查与自动安装入口
# ─────────────────────────────────────────────
check_and_install_deps() {
    log_step "环境检查与安装"
    detect_os

    # Java（Capacitor Android 需要 >= 21）
    if ! command -v java &>/dev/null; then
        install_java
    else
        JAVA_MAJOR=$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')
        if [ "${JAVA_MAJOR:-0}" -lt 21 ]; then
            log_warn "当前 Java ${JAVA_MAJOR} < 21，Capacitor Android 需要 JDK 21，升级中..."
            install_java
        else
            log_info "Java: $(java -version 2>&1 | head -1)"
        fi
    fi

    # Android SDK
    if ! setup_android_sdk_env; then
        if [[ "$OS" == "mac" ]]; then
            log_error "macOS 上请先安装 Android Studio，或手动设置 ANDROID_HOME"
            exit 1
        else
            install_android_sdk_linux
        fi
    fi

    # Node.js（Capacitor CLI 要求 >= 22）
    # 先尝试加载 nvm（可能上次已经装好了）
    load_nvm
    # 检查 nvm 是否管理了 node 22
    if command -v nvm &>/dev/null && nvm ls 22 &>/dev/null 2>&1; then
        nvm use 22 --silent
        log_info "Node.js (nvm): $(node -v)"
    else
        NODE_MAJOR=0
        if command -v node &>/dev/null; then
            NODE_MAJOR=$(node -e "process.stdout.write(String(process.version.match(/^v(\d+)/)[1]))" 2>/dev/null || echo "0")
        fi
        if [ "$NODE_MAJOR" -lt 22 ]; then
            install_nodejs
        else
            log_info "Node.js: $(node -v)"
        fi
    fi

    # pnpm
    if ! command -v pnpm &>/dev/null; then
        install_pnpm
    else
        log_info "pnpm: $(pnpm -v)"
    fi

    # gradlew
    if [ ! -f "$ANDROID_DIR/gradlew" ]; then
        log_error "未找到 gradlew，android 目录不完整"
        exit 1
    fi

    # 签名配置
    if [ ! -f "$ANDROID_DIR/keystore.properties" ]; then
        log_warn "未找到 keystore.properties，将使用 debug 签名"
    else
        log_info "签名配置: 已就绪"
    fi

    log_info "所有依赖检查完毕 ✓"
}

# ─────────────────────────────────────────────
# Step 1: 构建前端
# ─────────────────────────────────────────────
build_web() {
    log_step "Step 1/3  构建前端资源 (pnpm run build)"
    cd "$PROJECT_DIR"
    pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent
    pnpm run build
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        log_error "构建失败，dist 目录不存在"
        exit 1
    fi
    log_info "前端构建完成 -> dist/"
}

# ─────────────────────────────────────────────
# Step 2: Capacitor sync
# ─────────────────────────────────────────────
sync_android() {
    log_step "Step 2/3  同步资源到 Android (npx cap sync android)"
    cd "$PROJECT_DIR"
    # 确保 nvm node 22 在当前 shell 中生效
    load_nvm
    command -v nvm &>/dev/null && nvm use 22 --silent 2>/dev/null || true
    log_info "当前 node: $(node -v), npx: $(npx --version)"
    npx cap sync android
    log_info "Capacitor sync 完成"
}

# ─────────────────────────────────────────────
# Step 3: Gradle 打包
# ─────────────────────────────────────────────
build_apk() {
    log_step "Step 3/3  Gradle 正式版签名打包 (assembleRelease)"
    cd "$ANDROID_DIR"
    chmod +x gradlew
    # 写入 local.properties（Linux 上 SDK 路径）
    if [[ "$OS" != "mac" ]] && [ -n "$ANDROID_HOME" ]; then
        echo "sdk.dir=$ANDROID_HOME" > local.properties
        log_info "已写入 local.properties: sdk.dir=$ANDROID_HOME"
    fi
    ./gradlew assembleRelease --stacktrace
    log_info "APK 打包完成"
}

# ─────────────────────────────────────────────
# 输出结果
# ─────────────────────────────────────────────
show_result() {
    log_step "打包完成"
    local APK_FILE
    APK_FILE=$(find "$APK_OUTPUT" -name "*.apk" 2>/dev/null | head -1)
    if [ -n "$APK_FILE" ]; then
        local APK_SIZE
        APK_SIZE=$(du -sh "$APK_FILE" | cut -f1)
        log_info "APK 路径: $APK_FILE"
        log_info "APK 大小: $APK_SIZE"
        echo ""
        echo -e "${GREEN}>>> 签名 APK 已生成，可直接安装 <<<${NC}"
    else
        log_warn "未找到 APK 文件，请检查构建日志"
    fi
}

# ─────────────────────────────────────────────
# 主入口
# ─────────────────────────────────────────────
main() {
    echo ""
    echo -e "${BLUE}======================================"
    echo -e "  Android 正式版签名打包"
    echo -e "  项目: $(basename "$PROJECT_DIR")"
    echo -e "======================================${NC}"
    echo ""

    check_and_install_deps
    build_web
    sync_android
    build_apk
    show_result
}

main "$@"

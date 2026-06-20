#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
MINGW_PREFIX="$HOME/.local/mingw"
CARGO_CONFIG="$HOME/.cargo/config.toml"

log()  { echo -e "\033[36m[INFO]\033[0m $1"; }
ok()   { echo -e "\033[32m[OK]\033[0m   $1"; }
fail() { echo -e "\033[31m[FAIL]\033[0m $1"; exit 1; }

# ── 1. Rust ──
log "检查 Rust..."
. "$HOME/.cargo/env" 2>/dev/null || true
rustc --version 2>/dev/null || fail "Rust 未安装: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

# ── 2. Windows target ──
log "添加 Windows 编译目标..."
rustup target add x86_64-pc-windows-gnu 2>&1 | tail -1

# ── 3. MinGW 工具链（从 apt 下载 deb 本地解压，无需 sudo） ──
if [ ! -f "$MINGW_PREFIX/usr/bin/x86_64-w64-mingw32-gcc-posix" ]; then
    log "下载 MinGW 交叉编译工具链..."
    mkdir -p /tmp/mingw-dl
    apt-get download \
        gcc-mingw-w64-x86-64 gcc-mingw-w64-x86-64-posix gcc-mingw-w64-base \
        binutils-mingw-w64-x86-64 mingw-w64-common mingw-w64-x86-64-dev \
        gcc-mingw-w64-x86-64-posix-runtime \
        --directory /tmp/mingw-dl 2>&1 | tail -1

    mkdir -p "$MINGW_PREFIX"
    for f in /tmp/mingw-dl/*.deb; do dpkg-deb -x "$f" "$MINGW_PREFIX"; done
    chmod +x "$MINGW_PREFIX/usr/bin/x86_64-w64-mingw32-"*
    rm -rf /tmp/mingw-dl
    ok "MinGW 已安装"
else
    ok "MinGW 已存在"
fi

# ── 4. 配置 rust-lld 作为链接器（避免 PE 导出符号上限 65535） ──
RUST_LINKER="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/bin/rust-lld"
MINGW_LD="$MINGW_PREFIX/usr/bin/x86_64-w64-mingw32-ld.bfd"

if [ ! -f "$MINGW_LD.bak" ]; then
    mv "$MINGW_LD" "$MINGW_LD.bak" 2>/dev/null || true
fi
cat > "$MINGW_LD" << LDEOF
#!/bin/bash
exec "$RUST_LINKER" -flavor gnu -m i386pep "\$@"
LDEOF
chmod +x "$MINGW_LD"

# ── 5. 配置 Cargo ──
mkdir -p "$HOME/.cargo"
if ! grep -q "x86_64-pc-windows-gnu" "$CARGO_CONFIG" 2>/dev/null; then
    cat >> "$CARGO_CONFIG" << EOF

[target.x86_64-pc-windows-gnu]
linker = "$MINGW_PREFIX/usr/bin/x86_64-w64-mingw32-gcc-posix"
ar = "$MINGW_PREFIX/usr/bin/x86_64-w64-mingw32-ar"
EOF
fi

# ── 6. 确保 Cargo.toml 不含 cdylib ──
cd "$PROJECT_DIR"
sed -i 's/crate-type = \["staticlib", "cdylib", "rlib"\]/crate-type = ["staticlib", "rlib"]/' src-tauri/Cargo.toml

# ── 7. 构建前端 ──
log "构建前端..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm install --silent 2>/dev/null
npm run build 2>&1 | tail -1

# ── 8. 交叉编译 .exe ──
log "交叉编译 Windows .exe..."
export PATH="$MINGW_PREFIX/usr/bin:$PATH"
cd "$PROJECT_DIR/src-tauri"
npx tauri build --target x86_64-pc-windows-gnu 2>&1 | grep -E "Built application|Error|error"

EXE="$PROJECT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/sorting-visualizer.exe"
if [ -f "$EXE" ]; then
    mkdir -p "$PROJECT_DIR/dist-win"
    cp "$EXE" "$PROJECT_DIR/dist-win/"
    cp "$PROJECT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/WebView2Loader.dll" "$PROJECT_DIR/dist-win/" 2>/dev/null || true
    echo ""
    echo -e "\033[32m══════════════════════════════════════════════════════\033[0m"
    echo -e "\033[32m  ✅  编译成功\033[0m"
    echo -e "\033[32m══════════════════════════════════════════════════════\033[0m"
    echo -e "  \033[36m📦\033[0m  $(ls -lh "$PROJECT_DIR/dist-win/sorting-visualizer.exe" | awk '{print $5}')
    echo -e "  \033[36m📂\033[0m  $PROJECT_DIR/dist-win/
    echo ""
else
    fail "编译失败"
fi

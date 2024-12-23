#!/bin/bash

# 设置错误时退出
set -e

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 版本号
VERSION=$(grep '"version"' src-tauri/tauri.conf.json | cut -d'"' -f4)

# 创建发布目录
RELEASE_DIR="release"
mkdir -p $RELEASE_DIR

echo -e "${GREEN}开始构建版本 $VERSION ${NC}"

# 构建前端
echo -e "${YELLOW}构建前端代码...${NC}"
bun run build

# 构建 macOS 版本
if [[ "$OSTYPE" == "darwin"* ]]; then
    # 构建 ARM64 版本
    echo -e "${YELLOW}构建 macOS ARM64 版本...${NC}"
    bun tauri build
    
    # 移动 ARM64 构建文件到发布目录
    cp src-tauri/target/release/bundle/dmg/*.dmg $RELEASE_DIR/Tai_${VERSION}_macos_aarch64.dmg
    echo -e "${GREEN}macOS ARM64 版本构建完成${NC}"

    # 构建 x86_64 版本
    echo -e "${YELLOW}构建 macOS Intel (x86_64) 版本...${NC}"
    bun tauri build --target x86_64-apple-darwin
    
    # 移动 x86_64 构建文件到发布目录
    cp src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg $RELEASE_DIR/Tai_${VERSION}_macos_x86_64.dmg
    echo -e "${GREEN}macOS Intel 版本构建完成${NC}"

    # 创建通用版本 (Universal Binary)
    echo -e "${YELLOW}创建 macOS 通用版本...${NC}"
    # 复制 ARM 版本作为基础
    cp -r src-tauri/target/release/bundle/macos/Tai.app $RELEASE_DIR/Tai_universal.app
    # 合并 Intel 二进制
    lipo -create \
        src-tauri/target/release/Tai \
        src-tauri/target/x86_64-apple-darwin/release/Tai \
        -output $RELEASE_DIR/Tai_universal.app/Contents/MacOS/Tai
    
    # 创建通用版本的 DMG
    hdiutil create -volname "Tai Universal" -srcfolder $RELEASE_DIR/Tai_universal.app -ov -format UDZO $RELEASE_DIR/Tai_${VERSION}_macos_universal.dmg
    echo -e "${GREEN}macOS 通用版本构建完成${NC}"
fi

# 构建 Windows 版本 (需要在 Windows 环境或配置交叉编译)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}构建 Windows 版本...${NC}"
    bun tauri build
    
    # 移动 Windows 构建文件到发布目录
    cp src-tauri/target/release/bundle/msi/*.msi $RELEASE_DIR/
    cp src-tauri/target/release/bundle/nsis/*.exe $RELEASE_DIR/
    echo -e "${GREEN}Windows 版本构建完成${NC}"
fi

# 构建 Linux 版本 (需要在 Linux 环境或配置交叉编译)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${YELLOW}构建 Linux 版本...${NC}"
    bun tauri build
    
    # 移动 Linux 构建文件到发布目录
    cp src-tauri/target/release/bundle/deb/*.deb $RELEASE_DIR/
    cp src-tauri/target/release/bundle/appimage/*.AppImage $RELEASE_DIR/
    echo -e "${GREEN}Linux 版本构建完成${NC}"
fi

echo -e "${GREEN}所有平台构建完成！${NC}"
echo -e "构建文件位于 ${YELLOW}$RELEASE_DIR${NC} 目录"

# 列出构建的文件
echo -e "\n${YELLOW}构建的文件列表：${NC}"
ls -lh $RELEASE_DIR

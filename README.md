# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 开发

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run tauri dev
```

## 打包

### 使用 bun 脚本

```bash
# 打包所有平台
bun run build:all

# 只打包 Windows 版本
bun run build:windows

# 只打包 macOS 版本
bun run build:macos

# 只打包 Linux 版本
bun run build:linux
```

### 使用打包脚本

#### Unix-like 系统 (macOS/Linux)

```bash
# 添加执行权限
chmod +x scripts/build.sh

# 显示帮助信息
./scripts/build.sh --help

# 打包示例
./scripts/build.sh -p windows -a x64  # 打包 Windows x64 版本
./scripts/build.sh -p macos -a arm64  # 打包 macOS ARM 版本
./scripts/build.sh -p all -a all      # 打包所有平台所有架构
```

#### Windows

```powershell
# 显示帮助信息
.\scripts\build.ps1 -Help

# 打包示例
.\scripts\build.ps1 -Platform windows -Arch x64  # 打包 Windows x64 版本
.\scripts\build.ps1 -Platform macos -Arch arm64  # 打包 macOS ARM 版本
.\scripts\build.ps1 -Platform all -Arch all      # 打包所有平台所有架构
```

## 支持的平台和架构

- Windows
  - x64 (Intel/AMD)
  - arm64 (ARM)
- macOS
  - x64 (Intel)
  - arm64 (Apple Silicon)
- Linux
  - x64 (Intel/AMD)
  - arm64 (ARM)

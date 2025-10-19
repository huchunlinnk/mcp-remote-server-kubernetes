#!/bin/bash

# MCP Kubernetes Server 启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🚀 MCP Kubernetes Server 启动脚本" $BLUE

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_message "❌ Node.js 未安装，请先安装 Node.js 18 或更高版本" $RED
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_message "❌ Node.js 版本过低，需要 18 或更高版本，当前版本: $(node -v)" $RED
        exit 1
    fi
    
    print_message "✅ Node.js 版本检查通过: $(node -v)" $GREEN
}

# 检查依赖
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_message "📦 安装依赖包..." $YELLOW
        npm install
    else
        print_message "✅ 依赖包已存在" $GREEN
    fi
}

# 检查环境配置
check_environment() {
    if [ ! -f ".env" ]; then
        print_message "⚙️  创建环境配置文件..." $YELLOW
        cp .env.example .env
        print_message "📝 请编辑 .env 文件配置您的环境变量" $YELLOW
    else
        print_message "✅ 环境配置文件已存在" $GREEN
    fi
}

# 检查 Kubernetes 配置
check_kubernetes() {
    if [ -z "$KUBECONFIG" ] && [ ! -f "$HOME/.kube/config" ]; then
        print_message "⚠️  未找到 Kubernetes 配置文件" $YELLOW
        print_message "   请确保设置了 KUBECONFIG 环境变量或在 ~/.kube/config 中有有效配置" $YELLOW
    else
        print_message "✅ Kubernetes 配置检查通过" $GREEN
    fi
}

# 构建项目
build_project() {
    if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
        print_message "🔨 构建项目..." $YELLOW
        npm run build
    else
        print_message "✅ 项目已构建" $GREEN
    fi
}

# 启动服务器
start_server() {
    print_message "🎯 启动 MCP Kubernetes Server..." $GREEN
    
    # 检查端口是否被占用
    PORT=${PORT:-3000}
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        print_message "⚠️  端口 $PORT 已被占用，请修改 PORT 环境变量" $YELLOW
    fi
    
    # 启动服务器
    if [ "$1" = "dev" ]; then
        print_message "🔧 开发模式启动..." $BLUE
        npm run dev
    else
        print_message "🚀 生产模式启动..." $BLUE
        npm start
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  dev     开发模式启动（热重载）"
    echo "  prod    生产模式启动（默认）"
    echo "  help    显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  PORT              服务器端口（默认: 3000）"
    echo "  KUBECONFIG        Kubernetes 配置文件路径"
    echo "  AUTH_ENABLED      是否启用认证（默认: true）"
    echo "  LOG_LEVEL         日志级别（默认: info）"
    echo ""
    echo "示例:"
    echo "  $0              # 生产模式启动"
    echo "  $0 dev          # 开发模式启动"
    echo "  PORT=8080 $0    # 在端口 8080 启动"
}

# 主函数
main() {
    case "$1" in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        "dev")
            MODE="dev"
            ;;
        "prod"|"")
            MODE="prod"
            ;;
        *)
            print_message "❌ 未知选项: $1" $RED
            show_help
            exit 1
            ;;
    esac
    
    print_message "🔍 执行预检查..." $BLUE
    check_node_version
    check_dependencies
    check_environment
    check_kubernetes
    
    if [ "$MODE" = "prod" ]; then
        build_project
    fi
    
    start_server $MODE
}

# 捕获中断信号
trap 'print_message "\n👋 服务器已停止" $YELLOW; exit 0' INT TERM

# 执行主函数
main "$@"
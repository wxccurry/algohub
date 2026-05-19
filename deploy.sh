#!/bin/bash
# AlgoHub 一键部署脚本
set -e

echo "==> AlgoHub 生产环境部署"

# 1. 检查环境变量
if [ ! -f .env.prod ]; then
    echo "[!] 未找到 .env.prod，正在创建..."
    cat > .env.prod << 'EOF'
# 数据库密码（修改为随机强密码）
DB_PASSWORD=algohub_prod_change_me

# JWT 密钥（生成方式: openssl rand -hex 64）
JWT_SECRET_KEY=change-me-use-openssl-rand-hex-64

# 评测回调密钥（生成方式: openssl rand -hex 32）
JUDGE_SECRET=change-me-judge-secret

# 域名（HTTPS 时使用）
DOMAIN=algohub.example.com

# DeepSeek AI（可选）
DEEPSEEK_API_KEY=
AI_ENABLED=false
EOF
    echo "[!] 请编辑 .env.prod 填入真实密钥后重新运行"
    exit 1
fi

# 2. 加载环境变量
set -a; source .env.prod; set +a

# 3. 拉取镜像
echo "==> 构建镜像..."
docker compose -f docker-compose.prod.yml build

# 4. 启动服务
echo "==> 启动服务..."
docker compose -f docker-compose.prod.yml up -d

# 5. 等待数据库就绪
echo "==> 等待数据库..."
sleep 5

# 6. 执行数据库迁移
echo "==> 执行数据库迁移..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head || true

# 7. 导入题库数据
echo "==> 导入题库..."
docker compose -f docker-compose.prod.yml exec -T backend python scripts/import_problems.py data/problems_v1.json || true

# 8. 检查状态
echo "==> 检查服务状态..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "==========================="
echo "  部署完成！"
echo "  访问: http://<服务器IP>"
echo "  API:  http://<服务器IP>/api/health"
echo "==========================="

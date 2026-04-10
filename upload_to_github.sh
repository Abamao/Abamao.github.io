#!/bin/bash
# GitHub 上传脚本

REPO_URL="$1"
if [ -z "$REPO_URL" ]; then
    echo "用法: ./upload_to_github.sh <你的仓库URL>"
    echo "例如: ./upload_to_github.sh https://github.com/username/repo.git"
    exit 1
fi

cd "$(dirname "$0")"

# 初始化 git
git init

# 添加所有文件
git add index.html

# 提交
git commit -m "更新毛毛资源站 - 添加MC专栏和战术终端"

# 添加远程仓库
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# 推送
git branch -M main
git push -u origin main --force

echo "✅ 上传完成！"

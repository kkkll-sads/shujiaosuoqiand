#!/bin/bash

# --- 配置信息 ---
SITE_DIR="/www/wwwroot/qingduan"      # 你的网站根目录
BACKUP_SAVE_DIR="/www/wwwroot/backups"    # 备份文件存放地
DATE=$(date +%Y%m%d_%H%M%S)               # 时间格式
FILE_NAME="qingduan_$DATE.tar.gz"      # 文件名

# --- 执行步骤 ---

# 1. 创建备份目录（如果不存在）
mkdir -p $BACKUP_SAVE_DIR

# 2. 压缩打包 (排除掉不需要备份的大型缓存目录，提高速度)
# 排除 runtime(缓存), node_modules(依赖), vendor(第三方库,可composer恢复)
tar -zcvf $BACKUP_SAVE_DIR/$FILE_NAME \
    --exclude="$SITE_DIR/.git" \
    --exclude="$SITE_DIR/node_modules" \
    $SITE_DIR

# 3. 清理旧备份（只保留最近 7 天的，防止硬盘被塞满）
find $BACKUP_SAVE_DIR -mtime +3 -name "*.tar.gz" -exec rm -rf {} \;

echo "备份已完成: $BACKUP_SAVE_DIR/$FILE_NAME"
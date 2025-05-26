# 域名管理系统（Cloudflare D1 + Workers + Pages）

## 步骤

1. **数据库初始化**
   - 在 Cloudflare D1 控制台执行 schema.sql。
   - 插入管理员账号：
     ```sql
     INSERT INTO users(username, password, role) VALUES ('admin', '123456', 'admin');
     ```

2. **前端部署**
   - 上传 index.html 到 Cloudflare Pages。

3. **后端部署**
   - 上传 worker.js 到 Cloudflare Workers。
   - 绑定 D1 数据库。
   - 配置环境变量（如 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ACME_API_URL, ACME_API_KEY）。
   - 修改 fetch 最后一行的 URL 为你的 Cloudflare Pages 域名。

4. **环境变量**
   - 在 Worker 环境中设置：
     - TELEGRAM_BOT_TOKEN
     - TELEGRAM_CHAT_ID
     - ACME_API_URL（如需SSL自动申请）
     - ACME_API_KEY（如需SSL自动申请）

5. **定时任务**
   - 在 Cloudflare Worker 中配置 Scheduled Trigger，每天自动检查到期并发送 Telegram 提醒。

## 主要功能

- 多用户与权限管理（管理员/普通用户）
- 域名状态监控、到期提醒
- 多注册商信息管理
- SSL证书自动申请（ACME对接预留）、编辑、删除、导入
- Telegram 到期提醒通知

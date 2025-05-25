# 域名管理系统极简版 (Cloudflare Pages + D1 + Workers)
1. 在 Cloudflare D1 控制台执行 schema.sql
2. 上传 index.html 到 Cloudflare Pages (无依赖)
3. 部署 worker.js 到 Cloudflare Workers，并绑定 D1
4. 改好配置，把 fetch 最后一行中的 URL 换成你的 Cloudflare Pages 域名
5. 默认需管理员（推荐直接用 D1 插入一条用户名密码做初始化）

## D1 初始化示例 (假设用 password: 123456)
```sql
INSERT INTO users(username,password) VALUES ('admin','123456');

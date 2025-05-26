export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname, searchParams } = url;
    const headers = { 'Content-Type': 'application/json' };

    // 获取登录态
    function getSession(r) {
      const cookie = r.headers.get('cookie') || '';
      const m = cookie.match(/token=([^;]+)/);
      return m ? m[1] : null;
    }
    async function authedUser() {
      const token = getSession(req);
      if (!token) return null;
      const r = await env.DB.prepare('SELECT * FROM users WHERE password=?').bind(token).first();
      return r;
    }
    function isAdmin(user) {
      return user && user.role === 'admin';
    }

    // 用户注册（仅管理员可用，建议用D1手动插入）
    if (pathname === '/api/register' && req.method === 'POST') {
      const d = await req.json();
      const user = await authedUser();
      if (!user || !isAdmin(user)) return new Response(JSON.stringify({ ok: false, msg: '无权限' }), { headers, status: 403 });
      const old = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(d.username).first();
      if (old) return new Response(JSON.stringify({ ok: false, msg: '用户已存在' }), { headers });
      await env.DB.prepare('INSERT INTO users(username,password,role) VALUES (?,?,?)').bind(d.username, d.password, d.role || 'user').run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // 登录
    if (pathname === '/api/login' && req.method === 'POST') {
      const d = await req.json();
      const u = await env.DB.prepare('SELECT id,username,role FROM users WHERE username=? AND password=?').bind(d.username, d.password).first();
      if (u) {
        return new Response(JSON.stringify({ ok: true, username: u.username, role: u.role }), {
          headers: { ...headers, 'Set-Cookie': `token=${d.password}; Path=/; HttpOnly` }
        });
      }
      return new Response(JSON.stringify({ ok: false, msg: '用户名或密码错误' }), { headers });
    }

    // 登出
    if (pathname === '/api/logout') {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Set-Cookie': 'token=; Max-Age=0; Path=/', 'Content-Type': 'application/json' } });
    }

    // 需要登录的API
    const user = await authedUser();
    if (!user && pathname.startsWith('/api/')) return new Response(JSON.stringify({ ok: false, msg: '未登录' }), { headers, status: 401 });

    // 用户列表（仅管理员）
    if (pathname === '/api/users' && req.method === 'GET') {
      if (!isAdmin(user)) return new Response(JSON.stringify({ ok: false, msg: '无权限' }), { headers, status: 403 });
      const rows = await env.DB.prepare('SELECT id,username,role FROM users').all();
      return new Response(JSON.stringify({ ok: true, data: rows.results }), { headers });
    }

    // 域名列表
    if (pathname === '/api/domains' && req.method === 'GET') {
      let rows;
      if (isAdmin(user)) {
        rows = await env.DB.prepare('SELECT * FROM domains').all();
      } else {
        rows = await env.DB.prepare('SELECT * FROM domains WHERE user_id=?').bind(user.id).all();
      }
      return new Response(JSON.stringify({ ok: true, data: rows.results }), { headers });
    }

    // 添加域名
    if (pathname === '/api/domains' && req.method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO domains(domain,registrar_id,expiry_date,memo,user_id,remind_days) VALUES (?,?,?,?,?,?)')
        .bind(d.domain, d.registrar_id || null, d.expiry_date, d.memo || '', user.id, d.remind_days || 7).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // 删除域名
    if (pathname.startsWith('/api/domains/') && req.method === 'DELETE') {
      const id = pathname.split('/').pop();
      let domain = await env.DB.prepare('SELECT * FROM domains WHERE id=?').bind(id).first();
      if (!domain) return new Response(JSON.stringify({ ok: false, msg: '域名不存在' }), { headers, status: 404 });
      if (!isAdmin(user) && domain.user_id !== user.id) return new Response(JSON.stringify({ ok: false, msg: '无权限' }), { headers, status: 403 });
      await env.DB.prepare('DELETE FROM domains WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // 注册商列表
    if (pathname === '/api/registrars' && req.method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM registrars').all();
      return new Response(JSON.stringify({ ok: true, data: rows.results }), { headers });
    }
    // 添加注册商
    if (pathname === '/api/registrars' && req.method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO registrars(name,contact,website,api_url,api_key,support_email,memo) VALUES (?,?,?,?,?,?,?)')
        .bind(d.name, d.contact || '', d.website || '', d.api_url || '', d.api_key || '', d.support_email || '', d.memo || '').run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    // 删除注册商
    if (pathname.startsWith('/api/registrars/') && req.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM registrars WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // SSL证书列表
    if (pathname === '/api/ssl' && req.method === 'GET') {
      const domain_id = searchParams.get('domain_id');
      if (!domain_id) return new Response(JSON.stringify({ ok: false, msg: '缺少domain_id' }), { headers, status: 400 });
      const rows = await env.DB.prepare('SELECT * FROM ssl_certs WHERE domain_id=?').bind(domain_id).all();
      return new Response(JSON.stringify({ ok: true, data: rows.results }), { headers });
    }
    // 添加/导入SSL证书
    if (pathname === '/api/ssl' && req.method === 'POST') {
      const d = await req.json();
      await env.DB.prepare('INSERT INTO ssl_certs(domain_id,cert,key,expiry_date,memo) VALUES (?,?,?,?,?)')
        .bind(d.domain_id, d.cert, d.key, d.expiry_date, d.memo || '').run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    // 删除SSL证书
    if (pathname.startsWith('/api/ssl/') && req.method === 'DELETE') {
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM ssl_certs WHERE id=?').bind(id).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    // SSL自动申请（ACME对接预留）
    if (pathname === '/api/ssl/apply' && req.method === 'POST') {
      const d = await req.json();
      // 这里假设你有外部ACME服务API
      const acmeApi = env.ACME_API_URL;
      const acmeKey = env.ACME_API_KEY;
      if (!acmeApi || !acmeKey) return new Response(JSON.stringify({ ok: false, msg: '未配置ACME服务' }), { headers, status: 500 });
      // 获取域名
      const domain = await env.DB.prepare('SELECT * FROM domains WHERE id=?').bind(d.domain_id).first();
      if (!domain) return new Response(JSON.stringify({ ok: false, msg: '域名不存在' }), { headers, status: 404 });
      // 调用外部ACME服务
      const acmeRes = await fetch(acmeApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + acmeKey },
        body: JSON.stringify({ domain: domain.domain })
      });
      if (!acmeRes.ok) return new Response(JSON.stringify({ ok: false, msg: 'ACME服务失败' }), { headers, status: 500 });
      const certData = await acmeRes.json();
      if (!certData.cert || !certData.key || !certData.expiry_date) return new Response(JSON.stringify({ ok: false, msg: 'ACME返回无效' }), { headers, status: 500 });
      await env.DB.prepare('INSERT INTO ssl_certs(domain_id,cert,key,expiry_date,memo) VALUES (?,?,?,?,?)')
        .bind(d.domain_id, certData.cert, certData.key, certData.expiry_date, '自动申请').run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // Telegram到期提醒（定时任务调用）
    if (pathname === '/api/cron/remind' && req.method === 'POST') {
      // 仅允许Worker定时触发
      if (req.headers.get('x-cron') !== '1') return new Response('Forbidden', { status: 403 });
      // 查询即将到期的域名
      const now = new Date();
      const domains = await env.DB.prepare('SELECT d.*,u.username,u.id as user_id FROM domains d JOIN users u ON d.user_id=u.id').all();
      for (const d of domains.results) {
        const exp = new Date(d.expiry_date);
        const remindDays = d.remind_days || 7;
        const diff = (exp - now) / (1000 * 3600 * 24);
        if (diff <= remindDays && diff > 0) {
          // 发送Telegram
          await sendTelegram(`域名${d.domain}将于${d.expiry_date}到期，请及时续费！`, env);
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // 静态文件兜底（供前端index.html直接访问）
    return fetch('https://domain-management-8ye.pages.dev/index.html');
  }
}

// Telegram通知
async function sendTelegram(msg, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat_id = env.TELEGRAM_CHAT_ID;
  if (!token || !chat_id) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text: msg })
  });
}

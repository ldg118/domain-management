export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;
    const headers = {'Content-Type': 'application/json'};
    // 简单登录态cookie方案
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
    // 用户注册（建议首次用 D1 手动插入）
    if(pathname === '/api/register' && req.method==='POST'){
      const d = await req.json();
      const old = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(d.username).first();
      if(old) return new Response(JSON.stringify({ok:false, msg:'用户已存在'}), {headers});
      await env.DB.prepare('INSERT INTO users(username,password) VALUES (?,?)').bind(d.username, d.password).run();
      return new Response(JSON.stringify({ok:true}),{headers});
    }
    // 登录
    if(pathname==='/api/login' && req.method==='POST'){
      const d = await req.json();
      const u = await env.DB.prepare('SELECT id,username FROM users WHERE username=? AND password=?').bind(d.username, d.password).first();
      if(u){
        return new Response(JSON.stringify({ok:true,username:u.username}),{
          headers: {...headers, 'Set-Cookie':`token=${d.password}; Path=/; HttpOnly` }
        });
      }
      return new Response(JSON.stringify({ok:false,msg:'用户名或密码错误'}),{headers});
    }
    // 需要登录的API
    const user = await authedUser();
    if (!user && pathname.startsWith('/api/')) return new Response(JSON.stringify({ok:false,msg:'未登录'}), {headers, status:401});
    // 域名操作
    if(pathname==='/api/domains' && req.method==='GET'){
      const rows = await env.DB.prepare('SELECT * FROM domains WHERE user_id=?').bind(user.id).all();
      return new Response(JSON.stringify({ok:true, data:rows.results}),{headers});
    }
    if(pathname==='/api/domains' && req.method==='POST'){
      const d = await req.json();
      await env.DB.prepare('INSERT INTO domains(domain,registrar,expiry_date,memo,user_id) VALUES (?,?,?,?,?)')
        .bind(d.domain, d.registrar, d.expiry_date, d.memo||'', user.id).run();
      return new Response(JSON.stringify({ok:true}),{headers});
    }
    if(pathname.startsWith('/api/domains/') && req.method==='DELETE'){
      const id = pathname.split('/').pop();
      await env.DB.prepare('DELETE FROM domains WHERE id=? AND user_id=?').bind(id, user.id).run();
      return new Response(JSON.stringify({ok:true}),{headers});
    }
    if(pathname==='/api/logout'){
      return new Response(JSON.stringify({ok:true}),{headers:{'Set-Cookie':'token=; Max-Age=0; Path=/','Content-Type':'application/json'}});
    }
    // 静态文件兜底（供前端index.html直接访问）
    return fetch('https://你的cloudflare-pages域名/index.html');
  }
}

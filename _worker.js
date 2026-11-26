// KW 独立站询盘 API — Cloudflare Pages 单文件 Worker（_worker.js）
// 设计：先保存再通知（D1 存档为真源，通知渠道后续接入）；蜜罐 + 同 IP 限速 + 参数化查询。
// 路由：POST /api/inquiry → D1 入库；其余请求 env.ASSETS.fetch 走静态资产。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/inquiry' && request.method === 'POST') {
      try {
        const ct = request.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return json({ success: false, error: 'bad request' }, 400);
        const data = await request.json();

        // 蜜罐：正常访客看不到 website 隐藏字段，bot 填了则静默丢弃
        if (str(data.website, 100)) return json({ success: true });

        const clean = {
          name: str(data.name, 100),
          email: str(data.email, 150),
          country: str(data.country, 100),
          im: str(data.im, 100),
          product: str(data.product, 100),
          message: str(data.message, 3000)
        };
        if (!clean.name || !clean.message) return json({ success: false, error: 'missing fields' }, 400);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean.email)) return json({ success: false, error: 'invalid email' }, 400);

        const ip = request.headers.get('cf-connecting-ip') || 'unknown';
        const ua = str(request.headers.get('user-agent'), 300);
        const submissionId = str(data.submission_id, 64);
        const lang = str(data.lang, 10);

        // 限速：同 IP 10 分钟内超过 5 条拒绝（D1 的 datetime('now') 为 UTC）
        const recent = await env.DB.prepare(
          "SELECT COUNT(*) c FROM inquiries WHERE ip=?1 AND created_at > datetime('now','-10 minutes')"
        ).bind(ip).first();
        if (recent && recent.c > 5) return json({ success: false, error: 'too many requests, please try later' }, 429);

        const ref = 'KW-' + Date.now().toString(36).toUpperCase() + '-' +
          Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');

        await env.DB.prepare(
          'INSERT INTO inquiries (submission_id, ref, name, email, country, im, product, message, lang, ip, ua) ' +
          'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)'
        ).bind(submissionId || null, ref, clean.name, clean.email, clean.country, clean.im,
               clean.product, clean.message, lang, ip, ua).run();

        return json({ success: true, ref });
      } catch (e) {
        const msg = (e && e.message) || '';
        if (/UNIQUE/i.test(msg)) return json({ success: true, note: 'duplicate' }); // submission_id 幂等
        if (/no such table|D1/i.test(msg)) return json({ success: false, error: 'archive not ready' }, 503);
        return json({ success: false, error: 'server error' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

function str(v, max) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.slice(0, max);
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

// Muvyo 第三方插件示例（自写模板）
// 运行环境：QuickJS（ES2020），无 Node/浏览器 API、无 require/fetch/setTimeout。
// 全部外部能力挂在全局对象 mv 上：mv.fetch / mv.config / mv.service / mv.storage / mv.log / mv.crypto
// Muvyo 按 manifest 声明的能力调用下面的全局函数；抛异常 = 本次调用失败。

function _limit() {
  const n = Number(mv.config.size || 20);
  return Math.max(1, Math.min(isNaN(n) ? 20 : n, 50));
}

// ---------------------------------------------------------------- search 资源搜索
function search(q) {
  mv.log.info('搜索：' + (q.keyword || ('tmdb:' + q.tmdb_id)));
  const url = 'https://api.example.com/search?q=' + encodeURIComponent(q.keyword || '')
            + '&limit=' + _limit();
  const res = mv.fetch({
    url: url,
    headers: { 'Authorization': 'Bearer ' + (mv.config.token || '') }
  });
  if (res.status !== 200) throw new Error('接口返回 HTTP ' + res.status);
  const list = JSON.parse(res.body).list || [];
  return {
    items: list.map(function (it) {
      return {
        id: String(it.id),
        title: it.title,
        description: it.desc || '',
        link_type: '115',
        share_link: it.share_link || '',
        share_code: it.share_code || '',
        size_bytes: it.size || 0,
        tags: it.tags || [],
        poster: it.poster || ''
      };
    })
  };
}

// resolve（可选）：仅当 manifest 声明 search.resolve=true 时才会被调用
function resolve(p) {
  const res = mv.fetch('https://api.example.com/resolve?token=' + encodeURIComponent(p.token));
  if (res.status !== 200) throw new Error('换链失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return { share_link: d.share_link, share_code: d.share_code || '', magnets: d.magnets || [] };
}

// ---------------------------------------------------------------- vlib 虚拟库片单
function vlibItems(p) {
  const res = mv.fetch('https://api.example.com/vlib/' + p.list);
  if (res.status !== 200) throw new Error('片单失败 HTTP ' + res.status);
  return {
    items: (JSON.parse(res.body).items || []).map(function (it) {
      return it.tmdb_id ? { tmdb_id: it.tmdb_id, media_type: it.media_type || 'movie' }
                        : { title: it.title, year: it.year, media_type: it.media_type || 'movie' };
    })
  };
}

// ---------------------------------------------------------------- content 内容源
function contentCategories() {
  return { categories: [{ id: 'movie', title: '电影' }, { id: 'series', title: '剧集' }] };
}

function contentList(p) {
  const res = mv.fetch('https://api.example.com/list?cat=' + encodeURIComponent(p.category || '')
                     + '&page=' + (p.page || 1));
  if (res.status !== 200) throw new Error('列表失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return {
    items: (d.items || []).map(function (it) {
      return {
        id: String(it.id), title: it.title, poster: it.poster || '',
        description: it.desc || '', episode_count: it.episode_count || 0,
        remark: it.remark || '', tags: it.tags || [], rating: it.rating || 0
      };
    }),
    total: d.total,
    page_count: d.page_count
  };
}

function contentSearch(p) {
  const res = mv.fetch('https://api.example.com/list?kw=' + encodeURIComponent(p.keyword || '')
                     + '&page=' + (p.page || 1));
  if (res.status !== 200) throw new Error('搜索失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return { items: (d.items || []).map(function (it) {
      return { id: String(it.id), title: it.title, poster: it.poster || '', episode_count: it.episode_count || 0 };
    }) };
}

function contentDetail(p) {
  const res = mv.fetch('https://api.example.com/detail/' + encodeURIComponent(p.id));
  if (res.status !== 200) throw new Error('详情失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return {
    title: d.title, poster: d.poster || '', description: d.desc || '',
    episode_count: (d.episodes || []).length, tags: d.tags || [], rating: d.rating || 0,
    status: d.status || '',
    people: d.people || [],
    episodes: (d.episodes || []).map(function (e, i) {
      return { index: e.index || (i + 1), title: e.title || ('第 ' + (i + 1) + ' 集'), duration: e.duration || 0 };
    })
  };
}

function contentPlay(p) {
  const res = mv.fetch('https://api.example.com/play?id=' + encodeURIComponent(p.id)
                     + '&ep=' + (p.episode || 1));
  if (res.status !== 200) throw new Error('播放地址失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return { url: d.url, headers: d.headers || {} };
}

// ---------------------------------------------------------------- metadata 刮削来源
function metadataSearch(p) {
  const res = mv.fetch('https://api.example.com/meta?kw=' + encodeURIComponent(p.keyword || '')
                     + '&year=' + (p.year || 0) + '&type=' + (p.media_type || ''));
  if (res.status !== 200) throw new Error('刮削搜索失败 HTTP ' + res.status);
  return { items: (JSON.parse(res.body).items || []).map(function (it) {
      return { id: String(it.id), title: it.title, original_title: it.original_title || '',
               year: it.year || 0, media_type: it.media_type || 'movie',
               overview: it.overview || '', poster: it.poster || '', rating: it.rating || 0 };
    }) };
}

function metadataDetail(p) {
  const res = mv.fetch('https://api.example.com/meta/' + encodeURIComponent(p.id));
  if (res.status !== 200) throw new Error('刮削详情失败 HTTP ' + res.status);
  const d = JSON.parse(res.body);
  return {
    title: d.title, original_title: d.original_title || '', overview: d.overview || '',
    year: d.year || 0, premiere_date: d.premiere_date || '', runtime: d.runtime || 0,
    genres: d.genres || [], rating: d.rating || 0, vote_count: d.vote_count || 0,
    countries: d.countries || [], studios: d.studios || [], status: d.status || '',
    poster: d.poster || '', backdrop: d.backdrop || '',
    people: d.people || [], external_ids: d.external_ids || {}, seasons: d.seasons || []
  };
}

// Reference only: the component logic from the design prototype (DCLogic class).
// Holds Bit's conversation tree (nodes()), recommendation rules (reply()), keyword routing (classify()),
// themes (TH), packages, FAQ, audit checklist and all section data in renderVals().
// Port the DATA and BEHAVIOUR; do not copy the DCLogic plumbing.

class Component extends DCLogic {
  componentDidMount() {
    var self = this;
    this._on = function () {
      if (self._raf) return;
      self._raf = requestAnimationFrame(function () { self._raf = 0; self.track(); });
    };
    if (this.rootEl) this.rootEl.addEventListener('scroll', this._on, { passive: true });
    window.addEventListener('resize', this._on);
    this.track();
    this._kd = function (e) { var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return; if ((self.state || {}).heroVis === false) return; self.onKey(e); };
    window.addEventListener('keydown', this._kd);
    this._mc = setInterval(function () { var s = self.state || {}; if (!s.mcPlay) return; var nt = (s.mcT || 0) + 1; if (nt >= 56) self.setState({ mcT: 56, mcPlay: false }); else self.setState({ mcT: nt }); }, 220);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) this.setState({ stomp: 3, quest: 5, rscan: 3, rscanOn: true });
    else this._iv = setInterval(function () {
      self.setState(function (s) { return { stomp: ((s.stomp || 0) + 1) % 6, quest: ((s.quest || 0) + 1) % 8, rscan: s.rscanOn ? Math.min(3, (s.rscan || 0) + 1) : (s.rscan || 0) }; });
    }, 1300);
  }
  actKey(a, k) { return k === 0 ? '▶' : ''; }
  quests() {
    return [
      ['prod', 'FIX', 'App rescue', 'AUDIT $349 · FIX FROM $1,500', 'APPS THAT BREAK, LEAK OR SLOW DOWN', 'React, Node or Postgres — hand-coded or AI-built. Login, data, payments, deploys, speed.', 'I need app rescue'],
      ['prod', 'FIX', 'Launch readiness', 'SPRINT $1,500+', 'LAUNCH-DAY SURPRISES', 'Security, payments, monitoring and load — checked and fixed before real users arrive.', 'I need launch readiness'],
      ['ai', 'BUILD', 'Build with AI', 'FROM $1,500', 'AI THAT’S EXPENSIVE, SLOW OR WRONG', 'Assistants that answer from your data, smart search, agents and automations — with guardrails.', 'I want to add AI to my product'],
      ['free', 'FREE', 'Free tools', '$0', 'GETTING STARTED FOR FREE', 'A free review, the Wrapper Test and Anadi’s audit checklist.', 'Show me the free tools'],
      ['blog', 'READ', 'Blog', 'FIELD NOTES', 'LEARNING HOW IT ALL WORKS', 'Anadi’s field notes on what breaks in real apps, and how he fixes it.', 'Show me the blog']
    ];
  }
  stompBug(id) {
    var self = this, st = this.state || {};
    if ((st.dead || {})[id] || st.stomping) return;
    this.setState({ stomping: id, said: id });
    clearTimeout(this._sb);
    this._sb = setTimeout(function () { var d = Object.assign({}, (self.state || {}).dead || {}); d[id] = true; self.setState({ stomping: '', dead: d }); }, 600);
  }
  pickQuest(i) { var q = this.quests()[i]; this.setState({ amode: 'talk', asel: i }); this.go(q[0], q[6]); }
  onKey(e) {
    var st = this.state || {}, mode = st.amode || 'attract', K = this._keys || {};
    if (mode === 'attract') { if (e.key === 'Enter') { e.preventDefault(); this.setState({ amode: 'select' }); } return; }
    if (mode === 'select') {
      var s = st.asel || 0;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.setState({ asel: Math.min(4, s + 1) }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.setState({ asel: Math.max(0, s - 1) }); }
      if (e.key === 'Enter') { e.preventDefault(); this.pickQuest(s); }
      return;
    }
    if (e.key === 'Escape') { this.setState({ amode: 'select' }); return; }
    if (st.typing) return;
    if (K.rec && e.key === 'Enter') { e.preventDefault(); this.go(K.rec[0][0], K.rec[0][1]); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && K.opts && K.opts[n - 1]) { e.preventDefault(); K.opts[n - 1].fn(); }
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this._kd);
    clearInterval(this._mc);
    if (this.rootEl) this.rootEl.removeEventListener('scroll', this._on);
    window.removeEventListener('resize', this._on);
    clearTimeout(this._tt); clearInterval(this._iv);
  }
  componentDidUpdate() {
    var st = this.state || {};
    var key = (st.log ? st.log.length : 0) + ':' + (st.typing ? 1 : 0);
    if (this.logEl && key !== this._logKey) { this._logKey = key; this.logEl.scrollTop = this.logEl.scrollHeight; }
  }
  track() {
    var r = this.rootEl, h = this.heroEl;
    if (!r || !h) return;
    var heroVis = h.getBoundingClientRect().bottom > 160;
    var secs = r.querySelectorAll('[data-sec]');
    var lim = window.innerHeight * 0.45, sec = 'hero';
    for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top < lim) sec = secs[i].getAttribute('data-sec');
    var s = this.state || {};
    if (sec === 'quest' && !s.mcSeen) { var rdm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; this.setState({ mcSeen: true, mcPlay: !rdm, mcT: rdm ? 56 : 0 }); }
    if (sec === 'report' && !s.rscanOn) this.setState({ rscanOn: true, rscan: 0 });
    if (s.heroVis !== heroVis || s.sec !== sec) this.setState({ heroVis: heroVis, sec: sec, flip: s.sec !== sec ? !s.flip : s.flip });
  }
  nodes() {
    return {
      start: { say: 'Hi! I’m Bit, Anadi’s AI assistant. What’s going on with your app?', opts: [['hunt', 'Find my app’s first bug — free'], ['prod', 'Something’s breaking in my app'], ['prod', 'I’m about to launch'], ['ai', 'Add AI to my product'], ['care', 'Look after my live app'], ['build', 'Help me build a package'], ['free', 'Show me the free stuff'], ['tour', 'Just show me around']] },
      prod: { say: 'Got it. How was it built?', key: 'stack', opts: [['prod2', 'Hand-coded (React / Node)'], ['prod2', 'Cursor or Claude Code'], ['prod2', 'Lovable, Bolt or v0'], ['prod2', 'Replit'], ['prod2', 'Not sure']] },
      prod2: { say: 'Is it live with real users?', key: 'live', opts: [['prod3', 'Not yet — launching soon'], ['prod3', 'Yes, under 100 users'], ['prod3', 'Yes, 100+ users']] },
      prod3: { say: 'One known problem, or lots of small ones?', key: 'scope', opts: [['recProd', 'One specific thing'], ['recProd', 'Lots, or not sure']] },
      vis: { say: 'Have you asked an AI assistant for the best tool in your category?', key: 'asked', opts: [['vis2', 'Yes — we’re missing'], ['vis2', 'Not yet']] },
      vis2: { say: 'Is your site a JavaScript app (React, Next, Lovable…)?', key: 'js', opts: [['recVis', 'Yes'], ['recVis', 'No'], ['recVis', 'Not sure']] },
      dpdp: { say: 'Do you collect personal data — names, emails, payments?', key: 'pd', opts: [['dpdp2', 'Yes'], ['dpdp2', 'Not sure']] },
      dpdp2: { say: 'How do people give consent today?', key: 'consent', opts: [['recDpdp', 'Pre-ticked box, or no consent'], ['recDpdp', 'We ask properly'], ['recDpdp', 'Not sure']] },
      free: { say: 'Free stuff, coming up. Tap one:', cards: true, opts: [['start', 'Back to start'], ['tour', 'Show me around instead']] },
      teardown: { say: 'The recorded teardown is a paid add-on to the Wrapper Test: Anadi records a walkthrough of your product with the fixes. Take the free test first — then he knows where to look.', opts: [['link:test', 'Take the Wrapper Test'], ['contact', 'Book a teardown'], ['start', 'Back to start']] },
      kit: { say: 'The Production Kit has Anadi’s rules and checklists for Claude Code, Cursor, Lovable and Bolt. Which tool do you build with?', key: 'kitTool', opts: [['recKit', 'Cursor / Claude Code'], ['recKit', 'Lovable / Bolt'], ['recKit', 'A bit of everything']] },
      build: { say: 'Tick what you need. I’ll total it up and send it to Anadi.', ui: 'builder' },
      ask: { say: 'Type it below in your own words — your app, AI visibility, privacy, pricing, anything.', opts: [['start', 'Back to start']] },
      contact: { say: 'Where should Anadi reply? You’ll get a ticket number and every update in your inbox.', ui: 'contact' },
      done: { say: 'Anadi replies within 24 hours. Once work starts you get a written update every day. Want to see where your ticket goes next?', opts: [['board', 'Show me request tracking'], ['tour', 'Show me around'], ['start', 'Start over']] },
      touring: { say: 'Follow me! Use the bar at the bottom to move between stops. I’ll be right here when you’re back.', opts: [['start', 'Start over'], ['contact', 'Book the free review']] },
      recProd: { opts: [['tour', 'Walk me through the site'], ['start', 'Start over']] },
      recVis: { opts: [['tour', 'Walk me through the site'], ['start', 'Start over']] },
      recDpdp: { opts: [['tour', 'Walk me through the site'], ['start', 'Start over']] },
      blog: { say: 'Anadi writes up what he finds in real apps. Pick a topic and I’ll take you to those posts.', opts: [['blog:all', 'Show me everything'], ['blog:prod', 'Production'], ['blog:vis', 'AI visibility'], ['blog:dpdp', 'Privacy']] },
      blogDone: { opts: [['blog', 'Another topic'], ['start', 'Back to start']] },
      hunt: { say: 'Deal: Anadi finds the first bug in your app — free, on video, within 24 hours. Four quick taps so his time goes where it helps most.', opts: [['q1', 'Let’s go'], ['start', 'Maybe later']] },
      q1: { say: 'Is your app live, or launching within 30 days?', key: 'live', opts: [['q2', 'Live now'], ['q2', 'Launching within 30 days'], ['q2', 'Just an idea for now']] },
      q2: { say: 'Who uses it?', key: 'users', opts: [['q3', 'Paying customers'], ['q3', 'Real users or a client'], ['q3', 'Only me and friends']] },
      q3: { say: 'What happens if it breaks?', key: 'impact', opts: [['q4', 'We lose money or users'], ['q4', 'It’s embarrassing'], ['q4', 'Nothing much']] },
      q4: { say: 'When do you want it fixed?', key: 'when', opts: [['qcheck', 'This week'], ['qcheck', 'This month'], ['qcheck', 'Someday']] },
      qurl: { say: 'You qualify. Drop your app link and where Anadi should send the video.', ui: 'hunt' },
      notyet: { say: 'Honest answer: the free bug review is for apps with real users, so Anadi’s five weekly slots go where they help most. Here’s what fits you right now:', opts: [['link:test', 'Take the Wrapper Test'], ['kit', 'Do it myself with the Kit'], ['contact', 'Book a $349 audit anyway'], ['start', 'Back to start']] },
      huntDone: { say: 'Your request is in. He’ll email your first-bug video within 24 hours — with the fixed price to fix it.', opts: [['board', 'Show me request tracking'], ['tour', 'Show me around'], ['start', 'Start over']] },
      ai: { say: 'Nice. What do you want AI to do?', key: 'aiwant', opts: [['ai2', 'Answer questions from our data'], ['ai2', 'Automate a workflow or agent'], ['ai2', 'A Bit-style guide for our site'], ['ai2', 'Fix an AI feature we already have']] },
      ai2: { say: 'Is the product live?', key: 'aistage', opts: [['recAi', 'Live with users'], ['recAi', 'Still building']] },
      recAi: { opts: [['tour', 'Walk me through the site'], ['start', 'Start over']] },
      care: { say: 'Care keeps a live app healthy: monitoring, a monthly review and small fixes — $299/mo, month to month. Search visibility and privacy are re-checked every quarter.', opts: [['contact', 'Start Care'], ['hunt', 'Find my first bug first'], ['start', 'Back to start']] },
      recKit: { opts: [['start', 'Start over'], ['free', 'Show me the free stuff']] }
    };
  }
  initLog() { return [{ who: 'bit', text: this.nodes().start.say }]; }
  reply(id, ans) {
    var N = this.nodes(), n = N[id] || N.start;
    var acts = function (pk) { return [['hunt', 'Find my first bug — free'], ['build:' + pk, 'Customize package'], ['tour', 'Walk me through it']]; };
    if (id === 'recProd') {
      var one = ans.scope === 'One specific thing';
      var notes = ['Built with ' + (ans.stack || 'your stack') + ' — Anadi knows where those apps usually break.'];
      notes.push(one ? 'One specific issue usually lands at the lower end of the range.' : 'Several issues at once? The sprint covers up to three problem areas in a week.');
      if (ans.live === 'Yes, 100+ users') notes.push('With 100+ users live, add Care ($299/mo) so it stays fixed.');
      if (ans.live === 'Not yet — launching soon') notes.push('Launching soon — let’s catch the problems before your users do.');
      return [{ who: 'bit', text: 'Here’s what I’d do:' }, { who: 'rec', rec: { title: 'Launch-ready sprint', price: '$1,500–$2,500', notes: notes.concat(['Path: free first-bug video → $349 audit (credited) → fixed price, half paid when it’s live.']), acts: acts('sprint') } }];
    }
    if (id === 'recVis') {
      var vn = [];
      if (ans.js === 'Yes' || ans.js === 'Not sure') vn.push('JavaScript apps often show AI crawlers an empty page — first thing Anadi checks.');
      vn.push(ans.asked === 'Not yet' ? 'Not checked yet? The free review includes a quick AI-answer check.' : 'Missing from answers means models can’t find, read or trust you yet.');
      return [{ who: 'bit', text: 'Sounds like an AI visibility problem:' }, { who: 'rec', rec: { title: 'Production audit', price: '$349 · credited to the fix', notes: vn.concat(['Search & AI visibility is one of the three areas every audit covers.']), acts: acts('paudit') } }];
    }
    if (id === 'recDpdp') {
      var dn = [];
      if (ans.consent === 'Pre-ticked box, or no consent') dn.push('A pre-ticked box isn’t consent under GDPR, CCPA or DPDP — that’s the first thing to fix.');
      if (ans.pd === 'Not sure') dn.push('Not sure what you collect? The audit starts with a data inventory.');
      dn.push('Consent, notices, deletion requests and breach readiness — fixed in code, not a PDF.');
      return [{ who: 'bit', text: 'This one’s a privacy question:' }, { who: 'rec', rec: { title: 'Production audit', price: '$349 · credited to the fix', notes: dn.concat(['Privacy & compliance is one of the three areas every audit covers.']), acts: acts('paudit') } }];
    }
    if (id === 'recAi') {
      var aw = ans.aiwant || '', alive = ans.aistage === 'Live with users';
      var ar = /Fix an AI/.test(aw) ? ['Production audit', '$349 · AI checks included', 'paudit'] : ['AI build', '$2,000–$8,000', 'aifeat'];
      var anotes = ['Fixed price after a short scoping call — no hourly billing.', 'Guardrails, fallbacks and cost limits are built in, not extras.'];
      anotes.push(alive ? 'Live already? Anadi ships it behind a switch, so your users never see a half-built feature.' : 'Still building? Anadi shapes the AI part so it’s cheap to run from day one.');
      return [{ who: 'bit', text: 'Here’s what fits:' }, { who: 'rec', rec: { title: ar[0], price: ar[1], notes: anotes, acts: [['contact', 'Get a fixed quote'], ['build:' + ar[2], 'Customize package'], ['tour', 'Walk me through it']] } }];
    }
    if (id === 'recKit') {
      return [{ who: 'bit', text: 'For you, I’d start here:' }, { who: 'rec', rec: { title: ans.kitTool === 'A bit of everything' ? 'Production Kit — full bundle' : 'Production Kit — ' + ans.kitTool + ' pack', price: '[PRICE]', notes: ['The same rules and checklists Anadi uses on client apps.', 'Want him to do it instead? Start with the $349 audit, credited to the fix.'], acts: [['link:kit', 'See the packs'], ['prod', 'Have Anadi fix it'], ['tour', 'Walk me through it']] } }];
    }
    if (id === 'done' || id === 'huntDone') return [{ who: 'ticket' }, { who: 'bit', text: n.say }];
    var out = [{ who: 'bit', text: n.say }];
    if (n.cards) out.push({ who: 'cards' });
    return out;
  }
  classify(q) {
    var s = q.toLowerCase();
    var R = [
      [/tour|show me around|explore|look around/, 'tour', 'Sure — let’s take a walk.'],
      [/dpdp|consent|privacy|personal data|gdpr|complian|cookie|delete/, 'dpdp', 'That’s a privacy question — two quick taps and I’ll point you right.'],
      [/add ai|ai feature|chatbot|agent|automat|\brag\b|llm|assistant|openai|ai model|copilot/, 'ai', 'You want AI in your product — two quick questions:'],
      [/maintain|maintenance|retainer|monitor|care plan|ongoing|look after/, 'care', 'Ongoing care — here’s how it works:'],
      [/chatgpt|perplexity|gemini|claude|\bai\b|seo|cited|citation|visib|google|rank|llms/, 'vis', 'Sounds like AI visibility. Two quick questions:'],
      [/wrapper|teardown|defensib/, 'teardown', 'You’re after the Wrapper Test or the teardown:'],
      [/kit|rules|checklist|template|diy|myself/, 'kit', 'Doing it yourself? That’s what the Production Kit is for.'],
      [/price|cost|budget|package|quote|how much|cheap/, 'build', 'Let’s build a package and see the number.'],
      [/free|tool|test|try/, 'free', 'Free things first — smart.'],
      [/bug|broke|break|crash|auth|login|supabase|firebase|deploy|slow|launch|lovable|cursor|bolt|v0|error|leak|security|hack/, 'prod', 'Sounds like a production problem. A few quick taps:']
    ];
    for (var i = 0; i < R.length; i++) if (R[i][0].test(s)) return { node: R[i][1], say: R[i][2] };
    return { node: 'contact', say: 'Good question — that one’s for Anadi himself. Leave your details and he’ll answer personally.' };
  }
  toHero() {
    var h = this.heroEl;
    if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  push(youText, fn) {
    var self = this;
    var st = this.state || {};
    var log = (st.log || this.initLog()).slice();
    if (youText) log.push({ who: 'you', text: youText });
    this.setState({ log: log, typing: true, q: '', amode: 'talk' });
    if (st.heroVis === false) this.toHero();
    clearTimeout(this._tt);
    this._tt = setTimeout(function () {
      var res = fn();
      self.setState(function (s) { return { log: (s.log || []).concat(res.msgs), node: res.node, typing: false }; });
    }, 650);
  }
  go(id, label) {
    var self = this, st = this.state || {};
    if (id === 'link:test') { window.open('https://anadithakur.in/teardown', '_blank'); return; }
    if (id === 'link:kit') { window.open('https://anadithakur.in/products/production-kit', '_blank'); return; }
    if (id.indexOf('blog:') === 0) { var bt = id.slice(5); this.setState({ blogTopic: bt }); this.push(label, function () { return { msgs: [{ who: 'bit', text: bt === 'all' ? 'Here’s everything Anadi has written. Taking you there now.' : 'I filtered the blog to ' + label + ' posts. Taking you there now.' }], node: 'blogDone' }; }); setTimeout(function () { self.goSec('blog'); }, 1100); return; }
    if (id === 'board') { this.setState({ hl: 'board' }); this.goSec('board'); return; }
    if (id === 'done' && !st.ticket) this.setState({ ticket: { id: 'A-1048', url: 'your app', kind: 'audit' } });
    if (id === 'tour') { this.startTour(label); return; }
    var ans = Object.assign({}, st.ans || {});
    var cur = this.nodes()[st.node || 'start'];
    if (cur && cur.key && label) ans[cur.key] = label;
    var pkg = st.pkg || {}, pick = st.pick || '', topic = st.topic || '';
    if (id === 'qcheck') { var good = 0; if (/Live now|Launching/.test(ans.live || '')) good++; if (/Paying|Real users/.test(ans.users || '')) good++; if (/lose money|embarrassing/.test(ans.impact || '')) good++; if (/This week|This month/.test(ans.when || '')) good++; id = good >= 3 ? 'qurl' : 'notyet'; }
    if (id.indexOf('build:') === 0) { pkg = {}; pkg[id.slice(6)] = true; pick = id.slice(6); id = 'build'; }
    if (id === 'prod' || id === 'vis' || id === 'dpdp' || id === 'kit' || id === 'ai' || id === 'care') topic = id;
    if (id === 'care') pick = 'care';
    if (id === 'recAi') { var aw2 = ans.aiwant || ''; pick = /Fix an AI/.test(aw2) ? 'paudit' : 'aifeat'; }
    if (id === 'recProd') pick = 'sprint';
    if (id === 'recVis') pick = 'vis';
    if (id === 'recDpdp') pick = 'dpdp';
    if (id === 'start') { ans = {}; pick = ''; topic = ''; }
    var LEG = { fix: 'sprint', aiaudit: 'paudit', health: 'paudit', agent: 'aifeat', bitsite: 'aifeat', vis: 'paudit', dpdp: 'paudit', careplus: 'care', fract: 'care' };
    if (LEG[pick]) pick = LEG[pick];
    Object.keys(pkg).forEach(function (k) { if (LEG[k]) { pkg[LEG[k]] = pkg[k]; delete pkg[k]; } });
    this.setState({ ans: ans, pkg: pkg, pick: pick, topic: topic });
    this.push(label, function () { return { msgs: self.reply(id, ans), node: id }; });
  }
  ask(text) {
    var self = this;
    var q = (text || '').trim();
    if (!q) { if (this.qEl) this.qEl.focus(); return; }
    var c = this.classify(q);
    if (c.node === 'tour') { this.startTour(q); return; }
    if (c.node === 'prod' || c.node === 'vis' || c.node === 'dpdp' || c.node === 'kit' || c.node === 'ai' || c.node === 'care') this.setState({ topic: c.node });
    this.push(q, function () { return { msgs: [{ who: 'bit', text: c.say }].concat(c.node === 'contact' ? [] : self.reply(c.node, (self.state || {}).ans || {})), node: c.node }; });
  }
  route() {
    var st = this.state || {};
    var R = { prod: ['stomp', 'services', 'quest', 'pricing', 'free'], vis: ['stomp', 'services', 'checks', 'pricing', 'free'], dpdp: ['stomp', 'services', 'checks', 'pricing', 'free'] };
    var rr = (R[st.topic] || ['stomp', 'services', 'quest', 'pricing', 'free']).slice(); rr.splice(rr.indexOf('services') + 1, 0, 'report'); rr.splice(rr.indexOf('pricing') + 1, 0, 'board'); return rr.concat(['blog']);
  }
  startTour(label) {
    var self = this;
    var st = this.state || {};
    var log = (st.log || this.initLog()).concat(label ? [{ who: 'you', text: label }] : []).concat([{ who: 'bit', text: this.nodes().touring.say }]);
    var r = this.route();
    this.setState({ log: log, node: 'touring', tour: { route: r, i: 0 }, typing: false, amode: 'talk' });
    setTimeout(function () { self.goSec(r[0]); }, 250);
  }
  goSec(id) {
    var r = this.rootEl;
    var el = r && r.querySelector('#' + id);
    var pk = el && r.clientWidth < 860 && el.querySelector('[data-picked="true"]');
    if (pk) pk.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.setState({ hl: id });
  }
  tourStep(d) {
    var st = this.state || {};
    if (!st.tour) return;
    var i = st.tour.i + d;
    if (i < 0) i = 0;
    if (i >= st.tour.route.length) { this.endTour(true); return; }
    this.setState({ tour: { route: st.tour.route, i: i } });
    this.goSec(st.tour.route[i]);
  }
  endTour(back) {
    this.setState({ tour: null, hl: '' });
    if (back) this.toHero();
  }
  renderVals() {
    var self = this;
    var TH = {
      light: { bg: '#fafafa', grid: '#ededed', text: '#121212', muted: '#525252', acc: '#d42e24', accText: '#ffffff', shadow: '#121212', outline: '#121212', eye: '#ffffff', lens: '#d9e6f7', bug: '#d42e24', cardBg: '#121212', cardText: '#f5f5f5', cardLabel: '#ff7a70', cardShadow: '#d42e24', scr: '#121212', scrText: '#f5f5f5', line: '#3a3a3a', scrAcc: '#ff7a70', eyeBg: '#2a2a2a', soft: '#fdecea', panel: '#ffffff' },
      ink: { bg: '#121212', grid: '#1c1c1c', text: '#f2f0ea', muted: '#b9b4aa', acc: '#ff5247', accText: '#121212', shadow: '#000000', outline: '#4a4a4a', eye: '#ffffff', lens: '#d9e6f7', bug: '#ff7a70', cardBg: '#1c1c1c', cardText: '#f2f0ea', cardLabel: '#ff7a70', cardShadow: '#ff5247', scr: '#0c0c0c', scrText: '#f2f0ea', line: '#3a3a3a', scrAcc: '#ff7a70', eyeBg: '#2a2a2a', soft: '#2a1614', panel: '#1c1c1c' },
      paper: { bg: '#f2f0ea', grid: '#e6e2d8', text: '#121212', muted: '#4a4a4a', acc: '#d42e24', accText: '#ffffff', shadow: '#121212', outline: '#121212', eye: '#ffffff', lens: '#d9e6f7', bug: '#ff7a70', cardBg: '#121212', cardText: '#f2f0ea', cardLabel: '#ff7a70', cardShadow: '#d42e24', scr: '#121212', scrText: '#f2f0ea', line: '#3a3a3a', scrAcc: '#ff7a70', eyeBg: '#2a2a2a', soft: '#ffffff' },
      crt: { bg: '#0d0f14', grid: '#151922', text: '#f2e8d5', muted: '#c9bfae', acc: '#ffb000', accText: '#0d0f14', shadow: '#5a3e00', outline: '#3a2a00', eye: '#f2e8d5', lens: '#ffe6a8', bug: '#ff4d3d', cardBg: '#161a22', cardText: '#f2e8d5', cardLabel: '#ffb000', cardShadow: '#ffb000', scr: '#1a1300', scrText: '#f2e8d5', line: '#4a3a12', scrAcc: '#ffb000', eyeBg: '#3a2a00', soft: '#161a22' },
      arcade: { bg: '#2340ff', grid: '#3352ff', text: '#f4f1e8', muted: '#e1e4ff', acc: '#ffd60a', accText: '#0b0b14', shadow: '#0b0b14', outline: '#0b0b14', eye: '#f4f1e8', lens: '#cfe0ff', bug: '#ff3b30', cardBg: '#0b0b14', cardText: '#f4f1e8', cardLabel: '#ffd60a', cardShadow: '#ffd60a', scr: '#0b0b14', scrText: '#f4f1e8', line: '#2a2a3a', scrAcc: '#ffd60a', eyeBg: '#2a2a3a', soft: '#1c33cc' },
      ultra: { bg: '#0b1440', grid: '#121d55', text: '#eef2ff', muted: '#bcc5ea', acc: '#5cf2b5', accText: '#050a24', shadow: '#050a24', outline: '#050a24', eye: '#eef2ff', lens: '#cfe0ff', bug: '#ff5a5f', cardBg: '#050a24', cardText: '#eef2ff', cardLabel: '#5cf2b5', cardShadow: '#5cf2b5', scr: '#050a24', scrText: '#eef2ff', line: '#1c2a6a', scrAcc: '#5cf2b5', eyeBg: '#1c2a6a', soft: '#121d55' }
    };
    var t = TH[this.props.theme] || TH.light;
    var PR = this.props || {};
    function hx(h) { h = String(h || '').replace('#', '').trim(); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return /^[0-9a-f]{6}$/i.test(h) ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] : null; }
    function toHex(c) { return '#' + c.map(function (v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? '0' + s : s; }).join(''); }
    function mix(x, y, w) { return toHex([0, 1, 2].map(function (i) { return x[i] * (1 - w) + y[i] * w; })); }
    function lum(c) { var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
    var isLight = (this.props.theme || 'light') === 'light';
    var BGS = { 'Off-white': ['#fafafa', '#ededed', '#ffffff'], 'Pure white': ['#ffffff', '#f0f0f0', '#ffffff'], 'Cool grey': ['#f1f3f5', '#e1e5ea', '#ffffff'], 'Warm paper': ['#f4f1ea', '#e7e2d6', '#fffdf8'], 'Cream': ['#fbf6e9', '#eee5cc', '#fffdf6'], 'Mint': ['#eef7f2', '#d9eadf', '#ffffff'], 'Sky': ['#eef4fb', '#d8e4f2', '#ffffff'], 'Blush': ['#fbf0ee', '#f0dcd8', '#ffffff'] };
    var REDS = { 'Signal red': '#d42e24', 'Cherry': '#c8102e', 'Crimson': '#a4161a', 'Scarlet': '#e63322', 'Tomato': '#ff4b3e', 'Coral': '#f0544f', 'Raspberry': '#d6245c', 'Brick': '#b23a2a' };
    var YELS = { 'Arcade yellow': '#ffd60a', 'Lemon': '#ffe94d', 'Sunflower': '#ffcf33', 'Gold': '#ffc300', 'Amber': '#ffb000', 'Honey': '#f6b93b', 'Mustard': '#e1ad01', 'Butter': '#ffe7a3' };
    if (isLight) { var bgp = BGS[PR.background] || BGS['Off-white']; t = Object.assign({}, t, { bg: bgp[0], grid: bgp[1], panel: bgp[2] }); }
    var bPick = PR.redTone && PR.redTone !== 'Use colour picker' ? REDS[PR.redTone] : PR.brand;
    var sPick = PR.yellowTone && PR.yellowTone !== 'Use colour picker' ? YELS[PR.yellowTone] : PR.secondary;
    // on other themes, the untouched defaults mean “keep that theme’s own colours”
    var BR = !isLight && String(bPick || '').toLowerCase() === '#d42e24' ? null : hx(bPick), SE = !isLight && String(sPick || '').toLowerCase() === '#ffd60a' ? null : hx(sPick);
    // the declared defaults mean “use the theme’s own colours”
    if (BR || SE) t = Object.assign({}, t);
    if (BR) {
      t.acc = toHex(BR); t.cardShadow = t.acc; t.accText = lum(BR) > 0.42 ? '#121212' : '#ffffff';
      var BG = hx(t.bg) || [250, 250, 250]; t.soft = mix(BR, BG, lum(BG) > 0.5 ? 0.88 : 0.8);
      if (!SE) { t.scrAcc = mix(BR, [255, 255, 255], 0.35); t.cardLabel = t.scrAcc; }
    }
    if (SE) { t.scrAcc = toHex(SE); t.cardLabel = t.scrAcc; }
    var st = this.state || {};
    var N = this.nodes();
    var node = st.node || 'start';
    var log = st.log || this.initLog();
    var ans = st.ans || {};
    function spr(eyes, props, extra) {
      var base = ['.......kk.........', '.......ky.........', '.......kk.........', '...kkkkkkkkkk.....', '..kyyyyyyyyyyk....', '..kykkkkkkkkyk....', '..kykkkkkkkkyk....', '..kykkkkkkkkyk....', '..kykkkkkkkkyk....', '..kyyyykkyyyyk....', '...kkkkkkkkkk.....', '....kyyyyyyk......', '...kyykyykyyk.....', '...kyyyyyyyykk....', '....kkkkkkkk......', '....kk....kk......', '...kkk....kkk.....', '..................'];
      var g = base.map(function (r) { return r.split(''); });
      function set(x, y, c) { g[y][x] = c; }
      var E = { idle: [[5, 6], [6, 6], [9, 6], [10, 6], [5, 7], [9, 7]], happy: [[6, 6], [10, 6], [5, 7], [7, 7], [9, 7], [11, 7]], wide: [[5, 6], [6, 6], [9, 6], [10, 6], [5, 7], [6, 7], [9, 7], [10, 7]], up: [[6, 6], [7, 6], [10, 6], [11, 6]], shades: [[4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6]] };
      (E[eyes] || E.idle).forEach(function (p) { set(p[0], p[1], 'e'); });
      var P = {
        mag: [[15, 10, 'k'], [16, 10, 'k'], [17, 10, 'k'], [13, 11, 'k'], [14, 11, 'w'], [15, 11, 'r'], [16, 11, 'w'], [17, 11, 'k'], [14, 12, 'k'], [15, 12, 'k'], [16, 12, 'k']],
        clip: [[15, 8, 'r'], [16, 8, 'r'], [14, 9, 'k'], [15, 9, 'k'], [16, 9, 'k'], [17, 9, 'k'], [14, 10, 'k'], [15, 10, 'w'], [16, 10, 'w'], [17, 10, 'k'], [13, 11, 'k'], [14, 11, 'k'], [15, 11, 'w'], [16, 11, 'w'], [17, 11, 'k'], [14, 12, 'k'], [15, 12, 'k'], [16, 12, 'k'], [17, 12, 'k']],
        env: [[14, 9, 'k'], [15, 9, 'k'], [16, 9, 'k'], [17, 9, 'k'], [14, 10, 'k'], [15, 10, 'w'], [16, 10, 'w'], [17, 10, 'k'], [13, 11, 'k'], [14, 11, 'k'], [15, 11, 'r'], [16, 11, 'w'], [17, 11, 'k'], [14, 12, 'k'], [15, 12, 'k'], [16, 12, 'k'], [17, 12, 'k']],
        wave: [[13, 10, 'k'], [14, 9, 'k'], [15, 8, 'k'], [15, 7, 'y'], [16, 7, 'k'], [14, 7, 'k'], [15, 6, 'k']],
        point: [[13, 11, 'k'], [14, 11, 'y'], [15, 11, 'y'], [16, 11, 'y'], [17, 11, 'k'], [14, 10, 'k'], [15, 10, 'k'], [16, 10, 'k'], [14, 12, 'k'], [15, 12, 'k'], [16, 12, 'k']],
        thumb: [[13, 11, 'k'], [14, 11, 'y'], [15, 11, 'y'], [16, 11, 'k'], [14, 10, 'k'], [14, 9, 'y'], [15, 9, 'k'], [14, 12, 'k'], [15, 12, 'k']],
        wrench: [[0, 10, 'g'], [2, 10, 'g'], [0, 11, 'g'], [1, 11, 'g'], [2, 11, 'g'], [1, 12, 'g'], [1, 13, 'g'], [1, 14, 'g']],
        hat: [[4, 2, 'h'], [5, 2, 'h'], [6, 2, 'h'], [9, 2, 'h'], [10, 2, 'h'], [11, 2, 'h'], [2, 3, 'h'], [3, 3, 'h'], [4, 3, 'h'], [5, 3, 'h'], [6, 3, 'h'], [7, 3, 'h'], [8, 3, 'h'], [9, 3, 'h'], [10, 3, 'h'], [11, 3, 'h'], [12, 3, 'h'], [13, 3, 'h']],
        shield: [[0, 10, 'k'], [1, 10, 'k'], [2, 10, 'k'], [0, 11, 'k'], [1, 11, 'r'], [2, 11, 'k'], [0, 12, 'k'], [1, 12, 'r'], [2, 12, 'k'], [1, 13, 'k']],
        cape: [[3, 11, 'r'], [2, 12, 'r'], [2, 13, 'r'], [1, 14, 'r'], [2, 14, 'r'], [3, 14, 'r']]
      };
      (props || []).forEach(function (pr) { (P[pr] || []).forEach(function (p) { set(p[0], p[1], p[2]); }); });
      var X = { bang: [[15, 0, 'r'], [15, 1, 'r'], [15, 2, 'r'], [15, 4, 'r']], dots: [[13, 2, 'k'], [15, 1, 'k'], [17, 0, 'k']] };
      (X[extra] || []).forEach(function (p) { set(p[0], p[1], p[2]); });
      var o = { k: '', y: '', e: '', w: '', r: '', g: '', h: '' };
      for (var yy = 0; yy < 18; yy++) for (var xx = 0; xx < 18; xx++) { var ch = g[yy][xx]; if (o[ch] !== undefined) o[ch] += 'M' + xx + ' ' + yy + 'h1v1h-1z'; }
      return o;
    }
    var bp = spr('idle', ['mag']);
    var bugArt = ['..r...r..', '...r.r...', '.rrrrrrr.', 'rr.rrr.rr', '.rrrrrrr.', 'r.rrrrr.r', '.r.....r.'];
    var bugPath = '';
    for (var by = 0; by < bugArt.length; by++) for (var bx = 0; bx < 9; bx++) if (bugArt[by].charAt(bx) === 'r') bugPath += 'M' + bx + ' ' + by + 'h1v1h-1z';
    var cells = [];
    for (var i = 0; i < 96; i++) cells.push({ d: (1.1 + ((i * 37) % 23) / 23 * 0.5).toFixed(2) + 's' });
    if (!this._refs) this._refs = {
      root: function (el) { self.rootEl = el; },
      hero: function (el) { self.heroEl = el; },
      log: function (el) { self.logEl = el; },
      q: function (el) { self.qEl = el; }
    };
    var topic = st.topic || '', pick = st.pick || '';
    var stomp = st.stomp || 0, fixedN = Math.min(stomp, 3);
    var stompXs = ['4%', '21%', '52%', '83%', '83%', '83%'];
    var bugs = ['26%', '57%', '88%'].map(function (x, k) { return { x: x, alive: fixedN <= k, dead: fixedN > k }; });
    var IS = [['PRODUCTION', 'users table · public', 'locked down', 'prod'], ['AI VISIBILITY', 'not in AI answers', 'in AI answers', 'vis'], ['PRIVACY', 'consent pre-ticked', 'consent asked', 'dpdp']];
    var issues = IS.map(function (c, k) { var f = fixedN > k; return { k: c[0] + (topic === c[3] ? ' · YOURS' : ''), before: c[1], after: c[2], fixed: f, deco: f ? 'line-through' : 'none', status: f ? 'FIXED' : 'OPEN', chipBg: f ? t.acc : 'transparent', chipFg: f ? t.accText : t.bug, bg: topic === c[3] ? t.soft : 'transparent' }; });
    var appUrl = ans.stack && ans.stack !== 'Custom code' ? '[YOUR-APP].' + ans.stack.toUpperCase().replace(/\s/g, '') + '.APP' : '[YOUR-APP].COM';
    var done = node === 'done' || node === 'huntDone' || !!st.ticket || log.some(function (m) { return m.who === 'party'; });
    var QN = [['7%', '70%', 'START', 'Tell Bit', 'Four quick taps, about a minute.'], ['25%', '42%', 'FREE', 'First-bug video', 'Anadi films the biggest risk in your app — within 24h.'], ['44%', '62%', 'STEP 1', 'Audit', '$349 · credited toward the fix.'], ['62%', '28%', 'STEP 2', 'The fix', 'Fixed price. Daily written updates.'], ['80%', '52%', 'DONE', 'Live', 'Pay the second half once it works.'], ['93%', '24%', 'ONGOING', 'Care', 'Bit stays on guard · $299/mo']];
    var quest = done ? 1 : Math.min(st.quest || 0, 5);
    var questNodes = QN.map(function (n, k) { var last = k === 5; var you = done && k === 1; return { x: n[0], y: n[1], k: you ? 'YOU ARE HERE' : n[2], h: n[3], p: n[4], bg: k <= quest ? t.acc : t.bg, bd: last ? t.acc : t.text, ml: last ? '-158px' : '-22px', align: last ? 'right' : 'left' }; });
    var hopSpr = [spr('happy', ['wave']), spr('idle', ['clip']), spr('up', [], 'dots'), spr('idle', ['hat', 'wrench']), spr('happy', ['thumb']), spr('idle', ['shield'])][quest];
    var pickIdx = { fix: 0, rescue: 1, vis: 2, dpdp: 2, care: 3 }[pick];
    var light = { bg: t.bg, fg: t.text, ink: t.outline, eye: t.eye, lc: t.acc, line: t.grid, pc: t.text, btnBg: 'transparent', btnFg: t.text, btnBd: t.text };
    function card(o) { return Object.assign({}, light, o.dark ? { bg: t.cardBg, fg: t.cardText, ink: t.cardText, eye: t.cardBg, lc: t.cardLabel, line: '#3a3a3a', pc: t.cardText, btnBg: t.cardText, btnFg: t.cardBg, btnBd: t.cardText } : {}, o); }
    var loadout = [
      card({ k: 'TIER 1', h: 'Single fix', price: '$499', p: 'One problem: login, data security, deploys or speed.', s: spr('idle', ['wrench']), cta: 'START RUN', fn: function () { self.go('build:fix', 'Start a single fix'); } }),
      card({ k: 'TIER 2 · POPULAR', h: 'Production rescue', price: '$2,500+', pc: t.acc, p: 'Every problem area, made launch-ready.', s: spr('idle', ['hat', 'wrench']), cta: 'START RUN', btnBg: t.acc, btnFg: t.accText, btnBd: t.acc, fn: function () { self.go('build:rescue', 'Start a production rescue'); } }),
      card({ dark: true, k: 'AUDITS', h: 'AI visibility · Privacy', price: '[PRICE]', p: 'What AI search and privacy laws will flag — and how to fix it.', s: spr('wide', ['mag', 'cape'], 'bang'), cta: 'START RUN', fn: function () { self.go('build:' + (topic === 'dpdp' ? 'dpdp' : 'vis'), 'Start an audit'); } }),
      card({ k: 'ONGOING', h: 'Care', price: '$249/mo', p: 'Bit stands guard: reviews, monitoring and small fixes every month.', s: spr('idle', ['shield', 'mag']), cta: 'KEEP BIT ON GUARD', fn: function () { self.go('build:care', 'Keep Bit on guard'); } })
    ].map(function (c, k) { c.picked = pickIdx === k; c.ol = pickIdx === k ? '4px dashed ' + t.acc : '0 solid transparent'; return c; });
    var lvTopic = { prod: 0, vis: 1, dpdp: 2 }[topic];
    var levels = [
      { k: 'PRODUCTION RESCUE', h: 'Fix what’s broken in your app', p: 'Auth, data, deploys, speed — for apps built fast with Lovable, Cursor, Bolt and v0.', price: 'AUDIT $349 · FIX FROM $1,500', fn: function () { self.go('prod', 'Is production rescue right for me?'); } },
      { k: 'AI VISIBILITY AUDIT', h: 'Get recommended by AI search', p: 'Get found, read and cited when buyers ask AI for a tool like yours.', price: 'INCLUDED IN THE $349 AUDIT', fn: function () { self.go('vis', 'Do I need the AI Visibility Audit?'); } },
      { k: 'PRIVACY COMPLIANCE AUDIT', h: 'Handle user data the right way', p: 'GDPR, CCPA, DPDP and more — consent, notices, deletion and breach readiness, in code.', price: 'INCLUDED IN THE $349 AUDIT', fn: function () { self.go('dpdp', 'Do I need the privacy audit?'); } }
    ].map(function (l, k) { l.picked = lvTopic === k; l.ol = lvTopic === k ? '4px dashed ' + t.acc : '0 solid transparent'; return l; });
    var CC = [['RELIABILITY & SECURITY', [['Customer accounts & access', 'Sign-in, roles and permissions work exactly as intended.'], ['Customer data protection', 'Each customer can only ever see their own records.'], ['Passwords & credentials', 'No keys or secrets exposed in code or the browser.'], ['Uptime & safe releases', 'Updates ship without downtime and can be rolled back.'], ['Performance & error alerts', 'Slow pages and failures are caught before customers notice.']], 'prod', 'Protects revenue and customer trust.'], ['SEARCH & AI VISIBILITY', [['Search & AI access', 'Google and AI assistants can read your key pages.'], ['Business information', 'Services, pricing and contact details are clear to search engines.'], ['Consistent brand details', 'Your name, offer and locations match everywhere online.'], ['Answer-ready content', 'Pages answer the questions your buyers actually ask.'], ['Help & product docs', 'Public, current and easy for AI tools to reference.'], ['Reviews & mentions', 'Trusted third-party sites reference your business.']], 'vis', 'Helps new customers find and choose you.'], ['PRIVACY & COMPLIANCE', [['Clear consent', 'Customers opt in knowingly — nothing pre-ticked.'], ['Privacy notices', 'Plain-language policies that match what the app really does.'], ['Data map', 'What personal data you hold, where it lives, who can access it.'], ['Customer data requests', 'Access, export and deletion handled on time.'], ['Third-party vendors', 'Every tool that receives customer data is listed and covered.'], ['Incident readiness', 'A clear plan if data is ever exposed.']], 'dpdp', 'Aligned with GDPR, CCPA and India’s DPDP Act.']];
    var checkCols = CC.map(function (c) { var y = topic === c[2]; return { stamp: y ? 'on' : '', k: c[0] + (y ? ' · YOURS' : ''), items: c[1].map(function (x) { return { t: x[0], d: x[1] }; }), note: c[3], bd: y ? t.acc : t.text, bg: y ? t.soft : 'transparent' }; });
    function opt(o, i) { return { key: String(i + 1), label: o[1], fn: function () { self.go(o[0], o[1]); } }; }
    var freeCards = [
      { k: 'FREE · VIDEO', h: 'First-bug video', p: 'Anadi films the biggest risk in your app — within 24h.', fn: function () { self.go('hunt', 'Find my app’s first bug — free'); } },
      { k: 'FREE · TOOL', h: 'The Wrapper Test', p: '13 questions, ~3 min, no signup.', fn: function () { self.go('link:test'); } },
      { k: 'FREE · REFERENCE', h: 'The audit checklist', p: 'The exact checks Anadi runs.', fn: function () { self.goSec('checks'); } },
      { k: 'PAID · DIY', h: 'Production Kit', p: 'Anadi’s rules and checklists.', fn: function () { self.go('kit', 'Tell me about the Kit'); } }
    ];
    var TK = st.ticket || { id: 'A-1047', url: 'your app', kind: 'hunt' };
    var tkView = { id: TK.id, url: TK.url || 'your app', next: TK.kind === 'hunt' ? 'Anadi records your first-bug video' : 'Anadi reviews your request and confirms the audit', eta: 'within 24 hours, by email', track: function () { self.go('board'); } };
    var msgs = log.map(function (m) {
      var v = { isTicket: m.who === 'ticket', tk: tkView, isBit: m.who === 'bit', isYou: m.who === 'you', isRec: m.who === 'rec', isCards: m.who === 'cards', isParty: m.who === 'party', text: m.text || '', align: m.who === 'you' ? 'flex-end' : 'flex-start', cards: m.who === 'cards' ? freeCards : [] };
      v.rec = m.who === 'rec' ? { title: m.rec.title, price: m.rec.price, notes: m.rec.notes.map(function (n) { return { t: n }; }), acts: m.rec.acts.map(function (a, k) { return { key: self.actKey(a, k), label: a[1].toUpperCase(), bg: k === 0 ? t.acc : 'transparent', fg: k === 0 ? t.accText : t.text, fn: function () { self.go(a[0], a[1]); } }; }) } : { title: '', price: '', notes: [], acts: [] };
      return v;
    });
    var ui = (N[node] && N[node].ui) || '';
    var opts = ((N[node] && N[node].opts) || []).map(opt);
    var PK = [['paudit', 'Production audit', 349, '$349', 'a'], ['sprint', 'Launch-ready sprint', 1500, '$1,500–$2,500', 'f'], ['rescue', 'Full rescue', 3000, '$3,000–$6,000', 'f'], ['aifeat', 'AI build', 2000, '$2,000–$8,000', 'f'], ['mvp', 'MVP build', 6000, '$6,000–$20,000', 'f'], ['care', 'Care plan (monthly)', 299, '$299/mo', 'm']];
    var pkg = st.pkg || {};
    var aSum = 0, fSum = 0, mSum = 0, quoted = 0, chosen = [];
    var pkgItems = PK.map(function (p) {
      var on = !!pkg[p[0]];
      if (on) { chosen.push(p[1]); if (p[4] === 'a') aSum += p[2]; else if (p[4] === 'f') fSum += p[2]; else if (p[4] === 'm') mSum += p[2]; else quoted++; }
      return { name: p[1], price: p[3], on: on ? 'true' : 'false', box: on ? '[x]' : '[ ]', bg: on ? t.acc : 'transparent', fg: on ? t.accText : t.scrText, fn: function () { var nn = Object.assign({}, (self.state || {}).pkg || {}); nn[p[0]] = !nn[p[0]]; self.setState({ pkg: nn }); } };
    });
    var parts = [];
    if (fSum) parts.push('FROM $' + fSum.toLocaleString('en-US') + (aSum ? ' (AUDIT CREDITED)' : ''));
    else if (aSum) parts.push('$' + aSum.toLocaleString('en-US'));
    if (mSum) parts.push('$' + mSum + '/MO');
    if (quoted) parts.push(quoted + ' QUOTED');
    var qNodes = ['ai', 'ai2', 'care', 'hunt', 'q1', 'q2', 'q3', 'q4', 'qurl', 'notyet', 'prod', 'prod2', 'prod3', 'vis', 'vis2', 'dpdp', 'dpdp2', 'kit', 'ask', 'build', 'teardown'];
    var mood = st.typing ? ['THINKING…', spr('up', [], 'dots'), 'blink'] : node.indexOf('rec') === 0 ? ['FOUND IT', spr('wide', ['mag'], 'bang'), 'popA'] : node === 'contact' ? ['HANDING OFF TO ANADI', spr('happy', ['env']), 'popB'] : (node === 'done' || node === 'huntDone') ? ['DONE · ANADI NOTIFIED', spr('shades', ['thumb']), 'popA'] : node === 'touring' ? ['GIVING THE TOUR', spr('happy', ['point']), 'popB'] : qNodes.indexOf(node) >= 0 ? ['LISTENING', spr('idle', ['clip']), 'popA'] : ['HI THERE', spr('happy', ['wave']), 'popB'];
    var stage = node === 'start' ? 'STEP 1 · TELL BIT' : node.indexOf('rec') === 0 ? 'STEP 2 · BIT’S PICK' : (node === 'contact' || node === 'build') ? 'STEP 3 · HAND-OFF' : (node === 'done' || node === 'huntDone') ? 'TICKET OPEN · ANADI NOTIFIED' : node === 'touring' ? 'TOUR MODE' : 'STEP 1 · A FEW QUESTIONS';
    var confetti = [];
    for (var ci = 0; ci < 10; ci++) confetti.push({ x: (6 + ci * 9.5) + '%', c: [t.acc, t.text, t.bug][ci % 3], d: (ci * 0.11).toFixed(2) + 's' });
    var pickName = { paudit: 'the Production audit', sprint: 'the Launch-ready sprint', rescue: 'a Full rescue', aifeat: 'an AI build', mvp: 'an MVP build', care: 'the Care plan' }[pick];
    var TT = { board: 'REQUEST TRACKING', report: 'SAMPLE REPORT', blog: 'FIELD NOTES', stomp: 'WHAT I DO', services: 'YOUR SERVICE', quest: 'WHAT HAPPENS NEXT', checks: 'WHAT THE AUDIT COVERS', pricing: 'YOUR PACKAGE', free: 'FREE STUFF' };
    var TM = {
      stomp: topic === 'prod' ? 'The Peeker and the Spinner love apps built with ' + (ans.stack || 'AI tools') + '. Click one — I’ll fix it.' : topic === 'vis' ? 'See the Ghost in the AI answer box? That’s the issue. Click it.' : topic === 'dpdp' ? 'The Sneaky Tick hides in consent banners. Click it to see the fix.' : 'These are common issues I find. Click one and watch it get fixed; Anadi does the real fix.',
      services: lvTopic !== undefined ? 'I marked the one that fits you. That’s where Anadi starts.' : 'Three ways Anadi can help. Tell me what’s wrong and I’ll pick one.',
      quest: done ? 'You’re past step one. Anadi’s written review is next — I marked where you are.' : 'This is how a job runs. Watch me carry the ticket — Anadi does the work at every stop.',
      checks: topic === 'vis' || topic === 'dpdp' ? 'I marked your checklist. These are exactly what Anadi will look at.' : 'These are the exact checks Anadi runs.',
      pricing: pickName ? 'I marked my pick: ' + pickName + '. Anadi confirms the final price.' : 'Every run starts with a free review. Tell me about your app and I’ll pick one.',
      free: 'Not ready? Start free — the Wrapper Test takes 3 minutes.',
      board: st.ticket ? 'See the card marked YOU? That’s your request — every step shows up here.' : 'Every request lands on this board, so you always know where yours is.',
      report: 'This is what an audit report looks like. Yours is written by Anadi, for your app.',
      blog: { prod: 'Last stop: I filtered the blog to production posts for you.', vis: 'Last stop: I filtered the blog to AI-visibility posts for you.', dpdp: 'Last stop: I filtered the blog to privacy posts for you.' }[topic] || 'Last stop: Anadi’s field notes. Read before you decide.'
    };
    var tour = st.tour;
    var tourSec = tour ? tour.route[tour.i] : '';
    var hints = { board: st.ticket ? 'That card marked YOU is yours. I’ll keep it updated.' : 'Want a card on this board? I can start yours.', report: 'Want Anadi to find your first bug? It’s free.', blog: 'Want posts on your problem? I’ll filter them.', hero: 'Tell me what’s broken.', stomp: 'Want Anadi to check yours? Tap me.', services: 'Not sure which one? I’ll pick for you.', quest: 'Press play — I’ll carry the ticket.', checks: 'Reliability, visibility and privacy — in plain business terms.', pricing: 'Want a custom mix? I’ll build one.', free: 'Start free — the Wrapper Test takes 3 minutes.' };
    var sec = st.sec || 'hero';
    var hl = { stomp: '', services: '', quest: '', checks: '', pricing: '', free: '', blog: '', report: '', board: '' };
    if (st.hl && hl[st.hl] !== undefined) hl[st.hl] = 'hl';
    var heroVis = st.heroVis === undefined ? true : st.heroVis;
    var lastYou = -1; log.forEach(function (m, k) { if (m.who === 'you') lastYou = k; });
    var lastRec = null; for (var li = log.length - 1; li > lastYou; li--) if (log[li].who === 'rec') { lastRec = log[li]; break; }
    this._keys = { opts: st.typing ? [] : opts, rec: lastRec && !st.typing ? lastRec.rec.acts : null };
    var amode = st.amode || 'attract', asel = st.asel || 0, QS = this.quests();
    var carts = QS.map(function (q, i) {
      var on = i === asel;
      return { lv: q[1], name: q[2], price: q[3], on: on ? 'true' : 'false',
        bg: on ? t.acc : '#ffffff', fg: on ? t.accText : t.text, bd: on ? t.text : t.text, lab: on ? t.accText : t.acc,
        sh: on ? '6px 6px 0 ' + t.text : '4px 4px 0 ' + t.grid,
        fn: function () { if (i === ((self.state || {}).asel || 0)) self.pickQuest(i); else self.setState({ asel: i }); },
        hover: function () { if (((self.state || {}).asel || 0) !== i) self.setState({ asel: i }); } };
    });
    var msgsAll = msgs;
    var rscan = st.rscan || 0;
    function pix(rows, ch) { var d = ''; rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r.charAt(x) === ch) d += 'M' + x + ' ' + y + 'h1v1h-1z'; }); return d; }
    var ICON = { mag: ['.kkk.....', 'k...k....', 'k.r.k....', 'k...k....', '.kkk.....', '....k....', '.....k...', '......k..', '.......k.'], shield: ['.kkkkkkk.', '.k.....k.', '.k..r..k.', '.k..r..k.', '.k.....k.', '..k...k..', '...k.k...', '....k....'], spark: ['....k....', '....k....', '..k.r.k..', '...rrr...', 'kkrrrrrkk', '...rrr...', '..k.r.k..', '....k....', '....k....'], bug: ['..k...k..', '...k.k...', '.kkkkkkk.', 'kk.krk.kk', '.kkkkkkk.', 'k.kkkkk.k', '.k.....k.'], lock: ['...kkk...', '..k...k..', '..k...k..', '.kkkkkkk.', '.kkkrkkk.', '.kkkrkkk.', '.kkkkkkk.'] };
    function icon(n) { return { k: pix(ICON[n], 'k'), r: pix(ICON[n], 'r') }; }
    var BUGS = [
      { id: 'leak', topic: 'prod', name: 'The Peeker', plain: 'Other people’s orders show up on your account', tech: 'BROKEN ACCESS CONTROL', hides: 'database rules in apps built fast — one missing rule and everyone sees everything.', fix: 'Anadi locks every record to its owner, so people only ever see their own data.', danger: '★★★', svc: 'PRODUCTION RESCUE' },
      { id: 'crash', topic: 'prod', name: 'The Spinner', plain: 'The pay button spins forever', tech: 'UNHANDLED ERRORS · NO RETRIES', hides: 'payments and API calls that fail silently when something times out.', fix: 'Anadi adds error handling, retries and alerts, so checkout never hangs — and you hear about it first.', danger: '★★☆', svc: 'PRODUCTION RESCUE' },
      { id: 'ghost', topic: 'vis', name: 'The Ghost', plain: 'AI search recommends your competitors, not you', tech: 'INVISIBLE TO AI CRAWLERS', hides: 'JavaScript-only pages that look empty to the bots AI assistants read from.', fix: 'Anadi makes your pages readable to AI crawlers and gives them clear facts to quote.', danger: '★★☆', svc: 'AI VISIBILITY AUDIT' },
      { id: 'tick', topic: 'dpdp', name: 'The Sneaky Tick', plain: 'Your data is shared before you say yes', tech: 'PRE-TICKED CONSENT · GDPR · CCPA · DPDP', hides: 'signup forms and cookie banners that decide for the user.', fix: 'Anadi rebuilds consent so people choose first — and you can prove it to any regulator.', danger: '★★★', svc: 'PRIVACY COMPLIANCE AUDIT' }
    ];
    var faqOpen = st.faqOpen === undefined ? 0 : st.faqOpen;
    var FAQ = [
      ['What does it cost?', 'The first-bug video is free. The audit is $349 and credited in full toward the work. After that there are five fixed packages: Launch-ready sprint $1,500–$2,500, Full rescue $3,000–$6,000, AI build $2,000–$8,000, MVP build $6,000–$20,000 and the Care plan at $299/mo. No hourly billing.'],
      ['Why is the audit paid when the first bug is free?', 'The video shows you one real problem. The audit checks everything and gives you a ranked plan — that takes a day or two of Anadi’s time. Book the fix within 30 days and every dollar is credited.'],
      ['What if the audit finds nothing?', 'If there are no real, fixable issues, you get a full refund.'],
      ['How does “pay when it’s live” work?', 'You pay half to start. The second half is due only once the fix is live and you’ve confirmed it works.'],
      ['How will I know what’s happening?', 'You get a ticket number the moment you send your request. Every step shows in request tracking and in your inbox, with a written update every day while work is in progress.'],
      ['What if you can’t fix it?', 'The price is fixed. If something wasn’t in the quote, you’re not billed for it.'],
      ['Do you rebuild my app from scratch?', 'No. Only the broken parts get rewritten, so your features and design stay as they are.'],
      ['What if my app is too far gone?', 'The audit will say so plainly. Sometimes a partial rebuild is cheaper than patching — you’ll know before you pay for anything.'],
      ['Is my code safe with you?', 'An NDA is available on request, and you can revoke repo access as soon as the project ends.'],
      ['Which tools and stacks do you support?', 'React, Next.js, React Native, Node.js and PostgreSQL products (plus Supabase and Firebase) — hand-written or built with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit.'],
      ['What do you need to start?', 'A link to your app. Repo access helps if you have it, but it isn’t required for the free audit.'],
      ['Is Bit a real person?', 'No — Bit is an AI assistant that helps you find the right fix. Anadi, a real engineer, reads every request and does the work himself.']
    ];
    var slots = st.slots === undefined ? 3 : st.slots;
    function shopCard(o) {
      var pk = pick && (o.id === pick || (o.also || []).indexOf(pick) >= 0);
      var dark = !!o.dark;
      return { k: o.k, h: o.h, price: o.price, p: o.p, cta: o.cta || 'ADD TO PACKAGE',
        picked: pk ? 'true' : 'false', ol: pk ? '4px dashed ' + t.acc : '0 solid transparent',
        badge: pk || !!o.star, badgeText: pk ? 'BIT’S PICK' : o.star, badgeBg: pk ? t.acc : t.text, badgeFg: pk ? t.accText : t.bg,
        bg: dark ? t.cardBg : (t.panel || t.bg), fg: dark ? t.cardText : t.text, lc: dark ? t.cardLabel : t.acc, pc: o.hot ? t.acc : (dark ? t.cardText : t.text),
        sh: o.hot ? t.acc : t.text, btnBg: o.hot ? t.acc : 'transparent', btnFg: o.hot ? t.accText : (dark ? t.cardText : t.text), btnBd: o.hot ? t.acc : (dark ? t.cardText : t.text),
        fn: function () { self.go('build:' + o.id, 'Add ' + o.h + ' to my package'); } };
    }
    var shopRows = [
      { h: '1 · Start here', sub: 'FIRST BUG FREE · AUDITS CREDITED 100% TOWARD THE WORK · NOTHING FOUND = FULL REFUND', items: [
        shopCard({ id: 'paudit', also: ['fix', 'sprint', 'rescue'], k: '48 HOURS', h: 'Production audit', price: '$349', p: 'Login, data, security, payments, deploys and speed — ranked Fix now / Risky / Can wait, with a video walkthrough.' }),
        shopCard({ id: 'aiaudit', also: ['aifeat', 'agent', 'bitsite'], k: '3 DAYS', h: 'AI reliability & cost audit', price: '$499', p: 'For products already using AI: model costs, fallbacks, wrong answers and prompt quality.' }),
        shopCard({ id: 'health', dark: true, star: 'SAVE $298', k: '4 DAYS · BUNDLE', h: 'Full health check', price: '$899', p: 'Production audit plus AI-visibility and privacy checks, in one prioritised plan.' }) ] },
      { h: '2 · Fix', sub: 'ONE FIXED PRICE · HALF NOW, HALF WHEN IT’S LIVE', items: [
        shopCard({ id: 'fix', k: '3–5 DAYS', h: 'Single fix', price: '$499–$799', p: 'One known problem — a login bug, a data leak, a broken deploy.' }),
        shopCard({ id: 'sprint', hot: true, star: '★ MOST POPULAR', k: '1 WEEK', h: 'Launch-ready sprint', price: '$1,500–$2,500', p: 'Fix two or three problem areas — or get a new app launch-ready — in a week.' }),
        shopCard({ id: 'rescue', k: '2–3 WEEKS', h: 'Full rescue', price: '$3,000–$6,000', p: 'Every area, plus tests and monitoring so it stays fixed.' }) ] },
      { h: '3 · Build with AI', sub: 'FIXED QUOTE AFTER A SHORT SCOPING CALL · GUARDRAILS AND COST LIMITS INCLUDED', items: [
        shopCard({ id: 'aifeat', k: '1–3 WEEKS', h: 'AI feature', price: '$2,000–$8,000', p: 'Assistants that answer from your data, smart search, document reading and summaries.' }),
        shopCard({ id: 'agent', k: '1–3 WEEKS', h: 'AI agent or automation', price: '$1,500–$6,000', p: 'Lead qualification, support replies, internal workflows — running on their own.' }),
        shopCard({ id: 'bitsite', star: 'LIVE DEMO: THIS SITE', k: '1–2 WEEKS', h: 'A Bit for your site', price: '$1,500–$4,000', p: 'An AI guide like Bit that answers from your services, qualifies leads and books calls.' }),
        shopCard({ id: 'mvp', dark: true, k: '4–6 WEEKS', h: 'MVP build', price: '$6,000–$20,000', p: 'Web and mobile (React Native) for founders starting from zero.' }) ] },
      { h: '4 · Keep it running', sub: 'MONTH TO MONTH · CANCEL ANYTIME', items: [
        shopCard({ id: 'care', k: 'MONTHLY', h: 'Care', price: '$299/mo', p: 'Monitoring, a monthly health review and up to 4 hours of small fixes.' }),
        shopCard({ id: 'careplus', dark: true, k: 'MONTHLY', h: 'Care+', price: '$599/mo', p: 'Up to 10 hours, quarterly AI-visibility re-check and privacy watch.' }),
        shopCard({ id: 'fract', k: 'MONTHLY', h: 'Fractional tech lead', price: '$1,000–$2,500/mo', p: 'Senior hours every month: architecture, code reviews, hiring help.' }),
        shopCard({ id: 'vis', k: 'ADD-ON', h: 'AI visibility', price: 'From $399', p: 'Get found, read and quoted when buyers ask AI search.' }),
        shopCard({ id: 'dpdp', k: 'ADD-ON', h: 'Privacy engineering', price: 'From $449', p: 'GDPR · CCPA · DPDP handled in code, alongside your lawyer.' }) ] }
    ];
    var PLD = [
      { k: 'STEP 1 · DIAGNOSE', h: 'Start here', p: 'Not sure what’s wrong? Get a clear, ranked diagnosis first.', dark: true,
        pk: [['paudit', 'Production audit', '48 hours', '$349', 'Reliability, search visibility and privacy — one plain-English report, ranked by business impact.']],
        inc: ['Your biggest risk found free, on video, in 24h', 'Credited 100% toward any package', 'Nothing found? Full refund'], cta: '▶ FIND MY FIRST BUG — FREE', go: null, alt: 'Or book the $349 audit', altGo: ['prod', 'Book the production audit'] },
      { k: 'STEP 2 · FIX', h: 'Fix', p: 'Make a broken or risky app stable, secure and launch-ready.', hot: true,
        pk: [['sprint', 'Launch-ready sprint', '1 week', '$1,500–$2,500', 'Up to three problem areas fixed, tested and shipped.', '★ MOST POPULAR'], ['rescue', 'Full rescue', '2–3 weeks', '$3,000–$6,000', 'Everything the audit found, plus tests and monitoring.']],
        inc: ['One fixed price — no hourly billing', 'Daily written updates', 'Pay the second half when it’s live'], cta: '▶ GET MY EXACT PRICE', go: ['prod', 'Get my exact price for a fix'] },
      { k: 'BUILD', h: 'Build with AI', p: 'Add AI to your product, or build a new one from zero.',
        pk: [['aifeat', 'AI build', '1–4 weeks', '$2,000–$8,000', 'An assistant, smart search or automation — with guardrails and cost limits.'], ['mvp', 'MVP build', '4–8 weeks', '$6,000–$20,000', 'A complete web or mobile product, ready for real users.']],
        inc: ['Fixed quote after a short scoping call', 'Weekly demos as it’s built', 'Pay in milestones'], cta: '▶ GET MY EXACT PRICE', go: ['ai', 'Get my exact price for an AI build'] },
      { k: 'ONGOING', h: 'Keep it running', p: 'A senior engineer looking after your live product.',
        pk: [['care', 'Care plan', 'Monthly', '$299/mo', 'Monitoring, a monthly health review and small fixes included.']],
        inc: ['Quarterly visibility and privacy re-check', 'Priority response when something breaks', 'Cancel anytime'], cta: '▶ START CARE', go: ['care', 'Tell me about the Care plan'] }
    ];
    var plans = PLD.map(function (o) {
      var ids = o.pk.map(function (x) { return x[0]; }), pk = !!pick && ids.indexOf(pick) >= 0, dark = !!o.dark;
      var fg = dark ? t.cardText : t.text, lc = dark ? t.cardLabel : t.acc;
      return { k: o.k, h: o.h, p: o.p, inc: o.inc.map(function (x) { return { t: x }; }), cta: o.cta,
        pk: o.pk.map(function (x) { var me = pick === x[0]; return { n: x[1], d: x[2], price: x[3], p: x[4], hasTag: me || !!x[5], tag: me ? 'BIT’S PICK' : (x[5] || ''), tagBg: me ? t.acc : (dark ? t.cardLabel : t.text), tagFg: me ? t.accText : (dark ? t.cardBg : t.bg), bd: me ? t.acc : (dark ? t.cardLabel : t.text), bg: me ? (dark ? 'transparent' : t.soft) : 'transparent', pc: x[5] || me ? t.acc : fg }; }),
        picked: pk ? 'true' : 'false', ol: pk ? '4px dashed ' + t.acc : '0 solid transparent',
        badge: pk, badgeText: 'BIT’S PICK', badgeBg: t.acc, badgeFg: t.accText,
        bg: dark ? t.cardBg : (t.panel || t.bg), fg: fg, lc: lc,
        sh: o.hot ? t.acc : t.text, btnBg: o.hot || dark ? t.acc : 'transparent', btnFg: o.hot || dark ? t.accText : t.text, btnBd: o.hot || dark ? t.acc : t.text,
        hasAlt: !!o.alt, alt: o.alt || '', altFn: function () { if (o.altGo) { self.setState({ amode: 'talk' }); self.go(o.altGo[0], o.altGo[1]); } },
        fn: function () { self.setState({ amode: 'talk' }); if (o.go) self.go(o.go[0], o.go[1]); else self.go('hunt', 'Find my app’s first bug — free'); } };
    });
    var hasT = !!st.ticket, TKk = st.ticket || {};
    function bcard(id, txt, meta, you) { return { id: id, txt: txt, meta: meta, you: !!you, cls: you ? 'youpulse' : '', bd: you ? t.acc : t.text, bg: you ? t.soft : (t.panel || t.bg) }; }
    var colsDef = [
      ['INBOX', [bcard('A-1046', 'Invoicing app · React + Node', 'Received today')].concat(hasT && TKk.kind === 'hunt' ? [bcard(TKk.id, TKk.url, 'Anadi reviewing · video within 24h', true)] : [])],
      ['BUG REVIEW', [bcard('A-1044', 'Booking app · Bolt', 'First-bug video sent ✓')]],
      ['AUDIT', [bcard('A-1041', 'Marketplace · Next.js + Postgres', 'Report due in 1 day')].concat(hasT && TKk.kind === 'audit' ? [bcard(TKk.id, TKk.url || 'your app', 'Audit being confirmed', true)] : [])],
      ['FIXING', [bcard('A-1038', 'CRM · Next.js', 'Day 4 of 7 · update posted today'), bcard('A-1036', 'Support bot · AI feature', 'Day 2 of 5 · answers from docs')]],
      ['LIVE ✓', [bcard('A-1033', 'SaaS dashboard', 'Access leak + checkout fixed'), bcard('A-1029', 'Course platform', 'Ghost cleared · now in AI answers')]]
    ];
    var boardCols = colsDef.map(function (c, k) { return { h: c[0], n: String(c[1].length), cards: c[1], hbg: k === 4 ? t.acc : t.text, hfg: k === 4 ? t.accText : t.bg }; });
    var STEPS = hasT && TKk.kind === 'hunt' ? [['Request received', 'Ticket opened'], ['Anadi reviewing your app', 'Happening now'], ['First-bug video', 'Within 24 hours, by email'], ['Fix booked', 'Audit or fix — your call'], ['Fixing', 'Written update every day'], ['Live', 'Pay the second half once it works'], ['Care', 'Optional · $299/mo']]
      : hasT ? [['Request received', 'Ticket opened'], ['Audit confirmed', 'Happening now'], ['Audit report', 'Within 48 hours'], ['Fix booked', 'Fixed price, audit credited'], ['Fixing', 'Written update every day'], ['Live', 'Pay the second half once it works'], ['Care', 'Optional · $299/mo']]
      : [['Request received', 'Mon'], ['First-bug video', 'Tue · sent ✓'], ['Audit', 'Wed–Thu · report ✓'], ['Fix booked', 'Fri · Launch-ready sprint'], ['Fixing', 'Day 4 of 7 · update posted today'], ['Live', 'Pay the second half once it works'], ['Care', 'Optional']];
    var nowI = hasT ? 1 : 4;
    var trk = { id: hasT ? TKk.id : 'A-1038', url: hasT ? (TKk.url || 'your app') : 'CRM · Next.js', label: hasT ? 'YOUR TICKET · LIVE' : 'EXAMPLE TICKET',
      steps: STEPS.map(function (s, k) { var dn = k < nowI, nw = k === nowI; return { t: s[0], note: s[1], mark: dn ? '✓' : nw ? '▶' : String(k + 1), cls: nw ? 'blink' : '', dbg: dn ? t.text : nw ? t.acc : 'transparent', dfg: dn ? t.bg : nw ? t.accText : t.text, line: k === STEPS.length - 1 ? 'transparent' : (dn ? t.text : t.grid), fw: nw ? 700 : 500 }; }) };
    var LOOP = [{ n: '01', h: 'A ticket number', p: 'the second you hit send — no account needed.' }, { n: '02', h: 'Your first-bug video', p: 'within 24 hours, with the fixed price to fix it.' }, { n: '03', h: 'A written update every day', p: 'while work is in progress. No chasing.' }, { n: '04', h: 'You confirm it’s live', p: 'before the second half is due.' }];
    var MCA = {
      mail: ['............', '....kkkk....', '...krrrrk...', '..krrrrrrk..', '..krrrrrrk.r', '..kkkkkkkkrr', '.....kk....r', '.....kk.....', '.....kk.....', '.....kk.....', '.....kk.....', '...kkkkkk...'],
      cam: ['............', '..kkk.......', '.kkkkkkkkk..', '.k......rkk.', '.k..kkk..k.k', '.k.k...k.k.k', '.k.k...k.kk.', '.k..kkk..k..', '.k.......k..', '.kkkkkkkkk..', '....k..k....', '...k....k...'],
      tower: ['....kkkk....', '...k....k...', '...k.rr.k...', '...k.rr.k...', '....kkkk....', '.....kk.....', '....kkkk....', '....k..k....', '....k..k....', '...kkkkkk...', '...k....k...', '..kkkkkkkk..'],
      shop: ['............', '.kk.......k.', '.k.k.....k..', '..k.k...k...', '.....k.k....', '......r.....', '.kkkkkkkkkk.', '..kkkkkkkk..', '....kkkk....', '....kkkk....', '...kkkkkk...', '..kkkkkkkk..'],
      castle: ['.....krr....', '.....krrr...', '.....k......', '.....k......', '.k.k.k.k.k..', '.kkkkkkkkk..', '.kkkkkkkkk..', '.kk.kkk.kk..', '.kk.kkk.kk..', '.kkkkkkkkk..', '.kkk...kkk..', '.kkk...kkk..'],
      shield: ['..kkkkkkkk..', '..krrrrrrk..', '..krrkkrrk..', '..krkrrkrk..', '..krrrrrrk..', '..krrkkrrk..', '...krrrrk...', '...krrrrk...', '....krrk....', '.....kk.....', '............', '............']
    };
    var mT = st.mcT === undefined ? 0 : st.mcT, mPlay = !!st.mcPlay;
    var MX = [6, 23, 40, 57, 74, 91], MDAY = [0, 1, 2, 4, 11, 12];
    var MS = [
      ['mail', 'Tell Bit', 'DAY 0', 'Four quick taps. You get a ticket number.', '$0', 'TICKET ✓', '', 'INBOX', 'Bit'],
      ['cam', 'First-bug video', 'DAY 1', 'Anadi films the biggest risk in your app.', '$0 · FREE', 'REC ✓', '', 'BUG REVIEW', 'Anadi'],
      ['tower', 'Audit', 'DAY 2–3', 'Everything checked, ranked Fix now / Risky / Can wait.', '$349 · CREDITED', 'AUDITED ✓', '$349', 'AUDIT', 'Anadi'],
      ['shop', 'The fix', 'DAY 4–10', 'Fixed price. A written update every day.', '50% TO START', 'FIXED ✓', '50%', 'FIXING', 'Anadi'],
      ['castle', 'Live', 'DAY 11', 'You confirm it works. Then the rest is due.', '50% WHEN LIVE', 'LIVE ✓', '50%', 'LIVE ✓', 'You + Anadi'],
      ['shield', 'Care', 'DAY 12+', 'Optional. Bit stays on guard every month.', '$299/MO · OPTIONAL', 'GUARDED ✓', '$299/mo', 'LIVE ✓', 'Bit + Anadi']
    ];
    var seg = Math.min(5, Math.floor(mT / 10)), loc = mT - seg * 10;
    var mx = seg >= 5 ? MX[5] : (loc < 4 ? MX[seg] : MX[seg] + (MX[seg + 1] - MX[seg]) * (loc - 4) / 6);
    var moving = seg < 5 && loc >= 4 && mPlay;
    var reachedN = seg + 1;
    var mDay = seg >= 5 ? 12 : (loc < 4 ? MDAY[seg] : Math.round(MDAY[seg] + (MDAY[seg + 1] - MDAY[seg]) * (loc - 4) / 6));
    var mTid = st.ticket ? st.ticket.id : 'A-1047', mUrl = st.ticket ? (st.ticket.url || 'your app') : 'example-app.com';
    var youAt = st.ticket ? (st.ticket.kind === 'audit' ? 2 : 1) : -1;
    var LOGS = [[0, 'DAY 00', 'Ticket #' + mTid + ' opened for ' + mUrl + '. Anadi notified.'], [10, 'DAY 01', 'First-bug video sent: “Anyone can see other people’s orders.” Fixed price attached.'], [20, 'DAY 02', 'Audit started — $349, credited toward the fix.'], [23, 'DAY 03', 'Report: 2 fix now · 3 risky · 4 can wait.'], [30, 'DAY 04', 'Launch-ready sprint booked. 50% paid. Work starts.'], [34, 'DAY 06', 'Update: login and sessions fixed.'], [37, 'DAY 08', 'Update: orders locked to their owners. Checkout retries added.'], [40, 'DAY 11', 'Live ✓ — you confirmed it works. Second 50% due.'], [50, 'DAY 12', 'Care on. First monthly review booked.']];
    var mcLog = LOGS.filter(function (l) { return l[0] <= mT; }).slice(-5).map(function (l) { return { d: l[1], t: l[2] }; });
    var colIdx = [0, 1, 2, 3, 4, 4][seg];
    var mc = {
      title: st.ticket ? 'Your project’s route.' : 'How a project runs.',
      sub: st.ticket ? 'This is the route ticket #' + mTid + ' takes. Press play to watch it run.' : 'A typical Launch-ready sprint, from first message to live — played in 12 seconds. Press play, or tap any stop.',
      playLabel: mPlay ? '❚❚ PAUSE' : (mT >= 56 ? '▶ PLAY AGAIN' : '▶ PLAY'),
      toggle: function () { var s = self.state || {}; if (s.mcPlay) self.setState({ mcPlay: false }); else self.setState({ mcPlay: true, mcSeen: true, mcT: (s.mcT || 0) >= 56 ? 0 : (s.mcT || 0) }); },
      replay: function () { self.setState({ mcT: 0, mcPlay: true, mcSeen: true }); },
      toBoard: function () { self.go('board'); },
      day: 'DAY ' + (mDay < 10 ? '0' : '') + mDay + (seg >= 5 ? '+' : ''),
      x: mx + '%', trail: Math.max(0, mx - 6) + '%', moving: moving ? 'moving' : '',
      s: seg >= 4 && loc >= 0 && !moving ? spr('shades', ['thumb']) : moving ? spr('wide', ['env']) : [spr('happy', ['wave']), spr('wide', ['mag']), spr('up', ['clip']), spr('idle', ['hat', 'wrench']), spr('happy', ['thumb']), spr('idle', ['shield'])][seg],
      tid: mTid, stampCount: reachedN,
      now: 'NOW: ' + MS[seg][1].toUpperCase(), who: 'DOING IT: ' + MS[seg][8].toUpperCase(),
      liveCls: mPlay ? 'blink' : '', liveLabel: mPlay ? 'RUNNING' : (mT >= 56 ? 'COMPLETE' : 'PAUSED'),
      log: mcLog,
      coins: [['$0', 0], ['$349', 2], ['50%', 3], ['50%', 4], ['$299/mo', 5]].map(function (c) { var on = reachedN > c[1]; return { t: c[0], cls: on ? 'lit' : '', bd: on ? t.text : t.grid, bg: on ? '#f5c518' : 'transparent', fg: on ? '#121212' : t.muted, dot: on ? '#121212' : t.grid }; }),
      cols: ['INBOX', 'BUG REVIEW', 'AUDIT', 'FIXING', 'LIVE ✓'].map(function (h, k) { var on = k === colIdx, dn = k < colIdx; return { h: h, bd: on ? t.acc : t.text, bg: on ? t.soft : 'transparent', fg: t.text, dot: on ? t.acc : dn ? t.text : t.grid }; }),
      marks: MS.map(function (m, k) { var art = MCA[m[0]]; var reached = k < reachedN; var cur = k === seg;
        return { k: pix(art, 'k'), r: pix(art, 'r'), rc: reached ? t.acc : t.grid, x: MX[k] + '%', h: m[1], d: m[2], p: m[3], money: m[4], stamp: m[5], coin: m[6],
          stampOn: reached, coinOn: reached && !!m[6], cls: cur ? 'bob' : '', lc: reached ? t.text : t.muted, fw: cur ? 700 : 500, you: youAt === k,
          sbd: cur ? t.acc : t.text, sbg: cur ? t.soft : (reached ? (t.panel || t.bg) : 'transparent'),
          fn: function () { self.setState({ mcT: k * 10, mcPlay: false, mcSeen: true }); } }; })
    };
    var dead = st.dead || {}, stomping = st.stomping || '';
    var nDead = BUGS.filter(function (b) { return dead[b.id]; }).length;
    function bst(b) { var d = !!dead[b.id], sm = stomping === b.id; return { alive: !d && !sm, dead: d, notFixed: !d, stomping: sm, plain: b.plain, yours: topic === b.topic && !d && !sm, fn: function () { self.stompBug(b.id); } }; }
    var saidB = BUGS.filter(function (b) { return b.id === st.said; })[0];
    var introSay = { prod: 'Your app sounds like Peeker-and-Spinner territory. I tagged them YOURS — click one and I’ll stomp it.', vis: 'See the Ghost in the AI answer box? That’s yours. Click it.', dpdp: 'The Sneaky Tick hides in consent banners — that one’s yours. Click it.' }[topic] || 'Four bugs are hiding in this app. Click one and I’ll stomp it.';
    var bitSay = nDead === 4 ? 'All four stomped! Your app has its own bugs — want Anadi to find them?' : saidB ? (dead[saidB.id] ? 'Got ' + saidB.name + '! ' + saidB.fix : 'Stomping ' + saidB.name + '…') : introSay;
    var flips = st.flips || {};
    var monsters = BUGS.map(function (b, k) { var dd = !!dead[b.id]; return { num: '#0' + (k + 1), name: b.name, plain: b.plain, tech: b.tech, hides: b.hides, fix: b.fix, danger: b.danger, svc: '▶ FIXED IN: ' + b.svc, status: dd ? 'FIXED ✓' : 'AT LARGE', stc: dd ? t.acc : t.muted, flip: flips[b.id] ? 'flip' : '', fn: function () { var f = Object.assign({}, (self.state || {}).flips || {}); f[b.id] = !f[b.id]; self.setState({ flips: f }); } }; });
    var BP = [['prod', 'PRODUCTION', 'Your Lovable app’s users table is probably public', 'How row-level security gets skipped when apps are built fast — and the ten-minute check.'], ['vis', 'AI VISIBILITY', 'Why AI search can’t see your JavaScript site', 'AI crawlers often get an empty page. What they actually read, and how to fix it.'], ['dpdp', 'PRIVACY', 'A pre-ticked box isn’t consent', 'What GDPR, CCPA and DPDP ask of your signup form, in plain English.'], ['prod', 'PRODUCTION', 'Five things to check before launch day', 'Auth, keys, deploys, speed and error tracking — the launch checklist.'], ['vis', 'AI VISIBILITY', 'What llms.txt does, and what it doesn’t', 'Where it helps AI tools find you, and where it’s just a file.'], ['dpdp', 'PRIVACY', 'Privacy compliance for small teams: where to start', 'Data inventory first. Then consent, notices and deletion.']];
    var bTopic = st.blogTopic || (topic === 'prod' || topic === 'vis' || topic === 'dpdp' ? topic : 'all');
    var posts = BP.filter(function (b) { return bTopic === 'all' || b[0] === bTopic; }).map(function (b) { return { tag: b[1] + (topic === b[0] ? ' · YOURS' : ''), h: b[2], p: b[3], meta: '[DATE] · [N] MIN' }; });
    var blogChips = [['all', 'ALL'], ['prod', 'PRODUCTION'], ['vis', 'AI VISIBILITY'], ['dpdp', 'PRIVACY']].map(function (c) { var on = c[0] === bTopic; return { label: c[1], on: on ? 'true' : 'false', bg: on ? t.text : 'transparent', fg: on ? t.bg : t.text, fn: function () { self.setState({ blogTopic: c[0] }); } }; });
    return {
      bL: bst(BUGS[0]), bC: bst(BUGS[1]), bG: bst(BUGS[2]), bT: bst(BUGS[3]), nDead: nDead, bitSay: bitSay, allClear: nDead === 4, monsters: monsters,
      sStomp: nDead === 4 ? spr('shades', ['thumb']) : stomping ? spr('wide', ['mag'], 'bang') : spr('happy', ['point']), sDrop: spr('wide', []),
      resetBugs: function () { self.setState({ dead: {}, said: '', stomping: '' }); },
      aboutStats: [{ k: 'XP', v: '4+ years shipping' }, { k: 'RELEASES', v: '18 in production' }, { k: 'BASE', v: 'India · remote' }, { k: 'ONLINE', v: '8am–12pm EST' }],
      faqs: FAQ.map(function (f, k) { var o = faqOpen === k; return { n: (k < 9 ? '0' : '') + (k + 1), q: f[0], a: f[1], open: o ? 'true' : 'false', isOpen: o, sign: o ? '−' : '+', bg: o ? t.soft : 'transparent', fn: function () { self.setState({ faqOpen: o ? -1 : k }); } }; }),
      askBitFaq: function () { self.go('ask', 'I have another question'); },
      slots: slots, showHunt: ui === 'hunt' && !st.typing,
      startHunt: function () { self.setState({ amode: 'talk' }); self.go('hunt', 'Find my app’s first bug — free'); },
      sendHunt: function () { var r = self.rootEl; var u = r && r.querySelector('#hunt-url'); var url = ((u && u.value) || '').replace(/^https?:[/][/]/, '') || 'your-app.com'; self.setState({ ticket: { id: 'A-1047', url: url, kind: 'hunt' }, slots: Math.max(0, slots - 1) }); self.go('huntDone', 'Sent my app link'); },
      guarantees: [{ h: 'First bug free', p: 'A real issue in your app, on video, in 24h.' }, { h: 'Audit credited 100%', p: 'Every dollar counts toward the fix.' }, { h: 'Nothing found? Full refund', p: 'No real issues means you pay nothing.' }, { h: 'Pay the rest when it’s live', p: 'Half to start, half once it works.' }],
      shopRows: shopRows, plans: plans, allOpen: !!st.allP, allLabel: st.allP ? '▲ HIDE THE FULL PRICE LIST' : '▼ SEE EVERY SERVICE & PRICE', toggleAll: function () { self.setState({ allP: !st.allP }); }, boardCols: boardCols, trk: trk, loop: LOOP,
      boardCta: function () { self.go(st.ticket ? 'tour' : 'hunt', st.ticket ? 'Show me around' : 'Find my app’s first bug — free'); }, boardCtaLabel: st.ticket ? '▶ SHOW ME AROUND' : '▶ START MY REQUEST',
      svcCards: [
        ['bug', ['prod'], 'FIX · RESCUE & LAUNCH', 'Fix it — or get it launch-ready', 'Something’s breaking — login, data, payments, deploys, speed — or you’re about to launch and need it to hold up.', ['Login, accounts and permissions', 'Data security and access rules', 'Payments, deploys and error tracking', 'Speed, crashes and stability'], [['AUDIT', '$349'], ['FIX', '$1,500–$6,000'], ['TIME', 'From 1 week']], 'prod', 'Is App Rescue right for me?'],
        ['spark', ['ai'], 'BUILD WITH AI', 'Add AI that actually works', 'You want AI in your product or workflow — without runaway costs, wrong answers or a demo that breaks in real use.', ['Assistants that answer from your data', 'Smart search and document reading', 'Agents and workflow automations', 'Guardrails, fallbacks and cost limits'], [['AI BUILD', '$2,000–$8,000'], ['MVP', '$6,000–$20,000'], ['QUOTE', 'Fixed']], 'ai', 'I want to add AI to my product'],
        ['shield', ['care', 'vis', 'dpdp'], 'KEEP IT RUNNING', 'Keep it fast, safe and found', 'Your product is live and you want a senior engineer watching it — and buyers and AI search finding it.', ['Monitoring and a monthly health review', 'Small fixes and upgrades every month', 'Quarterly search-visibility re-check', 'Quarterly privacy check (GDPR · CCPA · DPDP)'], [['CARE', '$299/mo'], ['TERM', 'Monthly'], ['CANCEL', 'Anytime']], 'care', 'Keep my live app healthy']
      ].map(function (c) { var ic = icon(c[0]), pk = c[1].indexOf(topic) >= 0; return { ik: ic.k, ir: ic.r, k: c[2], h: c[3], forYou: c[4], items: c[5].map(function (x) { return { t: x }; }), stats: c[6].map(function (x) { return { k: x[0], v: x[1] }; }), isPick: pk, picked: pk ? 'true' : 'false', ol: pk ? '4px dashed ' + t.acc : '0 solid transparent', fn: function () { self.go(c[7], c[8]); }, prices: function () { self.goSec('pricing'); } }; }),
      mc: mc,
      posts: posts, blogChips: blogChips, panel: t.panel || t.bg,
      sBoard: spr('happy', ['point']), sScan: spr('wide', ['mag']), sBed: spr('up', []),
      boardRows: [['bug', 'FIX · SOMETHING’S BREAKING', '0.6s', 'prod', 'Something’s breaking in my app'], ['lock', 'FIX · GET LAUNCH-READY', '0.95s', 'prod', 'I’m about to launch'], ['spark', 'BUILD · ADD AI TO MY PRODUCT', '1.3s', 'ai', 'I want to add AI to my product'], ['shield', 'KEEP · LOOK AFTER MY LIVE APP', '1.65s', 'care', 'Keep my live app healthy']].map(function (b) { var ic = icon(b[0]); return { ik: ic.k, ir: ic.r, label: b[1], d: b[2], aria: 'Start: ' + b[1].toLowerCase(), fn: function () { self.setState({ amode: 'talk' }); self.go(b[3], b[4]); } }; }),
      reportRows: [['mag', 'AI SEARCH VISIBILITY', 'Mentioned in 3 of 5 test questions asked to AI assistants.', 'PASS'], ['shield', 'PRIVACY COMPLIANCE', 'Consent box is pre-ticked. No data-retention policy.', 'AT RISK'], ['lock', 'PRODUCTION READINESS', '2 security headers missing. 1 endpoint open to the public.', 'NEEDS ATTENTION']].map(function (r, k) { var ic = icon(r[0]), on = rscan > k, now = rscan === k && st.rscanOn; return { ik: ic.k, ir: ic.r, h: r[1], p: r[2], chip: on ? r[3] : now ? 'SCANNING…' : '—', cls: on ? 'chipin' : now ? 'blink' : '', cbg: on && r[3] !== 'PASS' ? t.acc : 'transparent', cfg: on && r[3] !== 'PASS' ? t.accText : t.cardText, bd: now ? t.cardLabel : '#3a3a3a', op: on || now ? 1 : 0.55 }; }),
      reportFoot: rscan >= 3 ? 'sample ready. yours is free — anadi writes it.' : st.rscanOn ? 'scanning example-app.com …' : 'scroll here and bit runs the sample scan',
      rerun: function () { self.setState({ rscanOn: true, rscan: 0 }); },
      attract: amode === 'attract', selecting: amode === 'select', talking: amode === 'talk', notTalk: amode !== 'talk',
      heroTitle: amode === 'talk' ? 'BIT’S QUEST' : 'Your app, made production-ready.',
      titleSize: amode === 'talk' ? 'clamp(30px, 3.6vw, 46px)' : 'clamp(40px, 5.2vw, 74px)',
      carts: carts, cur: { boss: QS[asel][4], bit: QS[asel][5] }, hopLeft: (10 + asel * 20) + '%',
      sWave: spr('happy', ['wave']), sPoint: spr('wide', ['point']),
      pressStart: function () { self.setState({ amode: 'select' }); },
      choose: function () { self.pickQuest((self.state || {}).asel || 0); },
      ownQuest: function () { self.setState({ amode: 'talk' }); self.go('ask', 'Something else'); },
      backSelect: function () { self.setState({ amode: 'select' }); },
      msgsNow: msgsAll.slice(lastYou + 1), hasYou: lastYou >= 0, youNow: lastYou >= 0 ? log[lastYou].text : '',
      t: t, bp: bp, cells: cells, bugPath: bugPath,
      rootRef: this._refs.root, heroRef: this._refs.hero, logRef: this._refs.log, qRef: this._refs.q,
      q: st.q || '',
      onQ: function (e) { self.setState({ q: e.target.value }); },
      qKey: function (e) { if (e.key === 'Enter') self.ask(e.target.value); },
      askQ: function () { self.ask((self.state || {}).q || ''); },
      toHero: function () { self.toHero(); },
      tourNow: function () { self.go('tour', 'Show me around'); },
      restart: function () { self.setState({ amode: 'select', log: self.initLog(), node: 'start', ans: {}, pkg: {}, pick: '', topic: '', typing: false, tour: null, hl: '' }); },
      msgs: msgs, typing: !!st.typing,
      sMood: mood[1], moodLabel: mood[0], moodCls: mood[2], stageLabel: stage,
      sDone: spr('shades', ['thumb']), confetti: confetti,
      showOpts: !ui && !st.typing && opts.length > 0, opts: opts,
      showBuilder: ui === 'builder' && !st.typing, pkgItems: pkgItems, pkgTotal: parts.length ? parts.join(' + ') : '$0',
      sendPkg: function () { self.go('contact', chosen.length ? 'Package: ' + chosen.join(' + ') : 'I’m not sure yet — help me choose'); },
      showContact: ui === 'contact' && !st.typing,
      sendContact: function () { self.go('done', 'Sent my details'); },
      bugs: bugs, issues: issues, fixedN: fixedN, stompX: stompXs[stomp], sWalk: spr(fixedN >= 3 ? 'happy' : 'wide', ['mag']), appUrl: appUrl,
      levels: levels, questNodes: questNodes, hopX: QN[quest][0], hopY: QN[quest][1], sHop: hopSpr,
      questSub: done ? 'You’re here: step one done. Anadi’s written review comes next.' : 'Every job follows the same map — so you always know which step we’re on.',
      checkCols: checkCols, loadout: loadout, hl: hl,
      showDock: !heroVis && !tour, hint: hints[sec] || hints.hero, hintCls: st.flip ? 'popA' : 'popB', sMini: spr('happy', ['wave']),
      tourOn: !!tour, tourN: tour ? tour.i + 1 : 0, tourT: tour ? tour.route.length : 0, tourTitle: TT[tourSec] || '', tourMsg: TM[tourSec] || '', tourCls: tour && tour.i % 2 ? 'popA' : 'popB',
      tourPips: tour ? tour.route.map(function (r, k) { return { bg: k <= tour.i ? t.acc : t.line }; }) : [],
      tourNextLabel: tour && tour.i === tour.route.length - 1 ? 'BACK TO BIT ▶' : 'NEXT STOP ▶',
      sTour: spr(tourSec === 'pricing' && pickName ? 'wide' : 'happy', [tourSec === 'pricing' ? 'mag' : 'point'], tourSec === 'pricing' && pickName ? 'bang' : ''),
      tourNext: function () { self.tourStep(1); }, tourPrev: function () { self.tourStep(-1); }, tourEnd: function () { self.endTour(false); },
      freeReview: function () { self.go('hunt', 'Find my app’s first bug — free'); },
      askTeardown: function () { self.go('teardown', 'What’s the recorded teardown?'); },
      askKit: function () { self.go('kit', 'Which Kit pack is right for me?'); },
      openBuilder: function () { self.go('build', 'Help me build a package'); }
    };
  }
}

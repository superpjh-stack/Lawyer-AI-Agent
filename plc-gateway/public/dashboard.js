/**
 * =====================================================================
 *  PLC Data Gateway 대시보드 렌더러 (index.html / replay.html 공용)
 * =====================================================================
 *
 *  서버의 태그 정의(publicTag 형식)를 받아 화면을 **데이터 기반으로** 구성합니다.
 *  태그를 추가/변경해도 이 파일을 고칠 필요가 없습니다.
 *
 *   - KPI 카드 : 태그마다 1장. 공정(process) 별로 묶어 표시
 *                analog → 값+단위, digital → 상태 pill, counter → 누적 수량
 *   - 차트     : 태그의 group 별로 1개. 같은 group 의 analog/counter 태그를 한 차트에
 *                (최대 4 시리즈, 직접 라벨 + 범례). digital 은 차트 대신 pill 로만 표시
 *   - 알람 로그: 발생/해제 이벤트 (최신이 위)
 *   - 샘플 표  : 최근 N행, 열 = 모든 태그
 *
 *  사용법
 *    const dash = PlcDashboard.create({ root: document, tags, maxPoints: 300 });
 *    dash.setHistory(samples);      // 이력 전체 교체 (오래된 → 최신)
 *    dash.push(sample);             // 샘플 1건 추가
 *    dash.setAlarms(events, active) // 알람 이력/활성 교체
 *    dash.pushAlarm(alarm);         // 알람 이벤트 추가
 *    dash.render();                 // 전체 다시 그림
 *
 *  알람 재계산이 필요한 경우(리플레이) AlarmTracker 를 사용합니다:
 *    const tr = PlcDashboard.AlarmTracker(tags); tr.evaluate(sample) → 이벤트 배열
 * =====================================================================
 */
(function (global) {
  'use strict';

  var SERIES_VARS = ['--s1', '--s2', '--s3', '--s4'];
  var TABLE_ROWS = 100;

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function fmtTime(iso) { return iso.slice(11, 19); }
  function fmt(v, d) { return v === null || v === undefined ? '--' : Number(v).toFixed(d); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ------------------------------------------------------------------
   *  AlarmTracker: 게이트웨이 AlarmEngine 과 동일한 히스테리시스 규칙
   * ------------------------------------------------------------------ */
  function AlarmTracker(tags) {
    var active = {}; // key tag:level → alarm
    function transition(events, tag, level, value, threshold, ts, raise, clear) {
      var key = tag + ':' + level, ex = active[key];
      if (!ex && raise) {
        active[key] = { tag: tag, level: level, state: 'ACTIVE', value: value, threshold: threshold, raisedAt: ts };
        events.push(active[key]);
      } else if (ex && clear) {
        delete active[key];
        events.push({ tag: tag, level: level, state: 'CLEARED', value: value, threshold: threshold, raisedAt: ex.raisedAt, clearedAt: ts });
      }
    }
    return {
      /** 샘플 1건 평가 → 발생/해제 이벤트 배열 */
      evaluate: function (s) {
        var events = [];
        if (s.quality !== 'GOOD') return events;
        tags.forEach(function (t) {
          var v = s.values[t.name]; if (v === null || v === undefined || !t.alarm) return;
          var a = t.alarm;
          if (a.high !== null && a.high !== undefined) transition(events, t.name, 'HIGH', v, a.high, s.ts, v > a.high, v <= a.high - a.hysteresis);
          if (a.low !== null && a.low !== undefined) transition(events, t.name, 'LOW', v, a.low, s.ts, v < a.low, v >= a.low + a.hysteresis);
        });
        return events;
      },
      getActive: function () { return Object.keys(active).map(function (k) { return active[k]; }); },
      reset: function () { active = {}; },
    };
  }

  /* ------------------------------------------------------------------
   *  대시보드 생성
   * ------------------------------------------------------------------ */
  function create(opts) {
    var root = opts.root || document;
    var tags = opts.tags || [];
    var MAX = opts.maxPoints || 300;
    var history = [];       // 표시 대상 샘플 (오래된 → 최신)
    var events = [];        // 알람 이벤트 (최신이 앞)
    var active = {};        // key → alarm
    var tagMap = {};
    tags.forEach(function (t) { tagMap[t.name] = t; });

    var $ = function (id) { return root.getElementById ? root.getElementById(id) : document.getElementById(id); };

    // ---- 그룹(차트) 계산: analog + counter, group 순서 유지 ----
    var groups = [];
    var gmap = {};
    tags.forEach(function (t) {
      if (t.kind === 'digital') return;
      if (!gmap[t.group]) { gmap[t.group] = { name: t.group, unit: t.unit, kind: t.kind, tags: [] }; groups.push(gmap[t.group]); }
      gmap[t.group].tags.push(t);
    });
    // 태그별 시리즈 색상 (그룹 내 순서)
    var colorOf = {};
    groups.forEach(function (g) { g.tags.forEach(function (t, i) { colorOf[t.name] = SERIES_VARS[i % SERIES_VARS.length]; }); });

    // ---- 공정(process) 순서 ----
    var processes = [];
    tags.forEach(function (t) { if (processes.indexOf(t.process) < 0) processes.push(t.process); });

    /* ---------- 정적 DOM 생성 (최초 1회) ---------- */
    function buildSkeleton() {
      var kp = $('kpiRoot');
      kp.innerHTML = processes.map(function (p) {
        return '<div class="process-block"><div class="process-name">' + esc(p) + '</div><div class="kpis">' +
          tags.filter(function (t) { return t.process === p; }).map(function (t) {
            return '<div class="kpi" id="kpi-' + t.name + '" style="border-left-color: var(' + (colorOf[t.name] || '--line') + ')">' +
              '<div class="label"><i style="background: var(' + (colorOf[t.name] || '--ink-3') + ')"></i>' + esc(t.label) + '</div>' +
              '<div class="num mono" id="kv-' + t.name + '">--</div>' +
              '<div class="foot" id="kf-' + t.name + '">' + footText(t) + '</div></div>';
          }).join('') + '</div></div>';
      }).join('');

      var ch = $('chartRoot');
      ch.innerHTML = groups.map(function (g, gi) {
        return '<section class="chart" id="chart-' + gi + '"><header><h2>' + esc(g.name) + '</h2><span class="unit">' + esc(g.unit) + '</span>' +
          '<span class="legend">' + g.tags.map(function (t) { return '<span><i style="background: var(' + colorOf[t.name] + ')"></i>' + esc(t.label) + '</span>'; }).join('') + '</span></header>' +
          '<svg viewBox="0 0 1000 190" aria-label="' + esc(g.name) + ' 추이"></svg></section>';
      }).join('');
      groups.forEach(function (g, gi) { attachHover(g, ch.querySelector('#chart-' + gi + ' svg')); });

      var th = $('tableHead');
      th.innerHTML = '<tr><th class="n">seq</th><th>시각</th>' + tags.map(function (t) { return '<th class="n">' + esc(t.label) + (t.unit && t.unit !== 'ON/OFF' ? ' (' + esc(t.unit) + ')' : '') + '</th>'; }).join('') + '<th>품질</th></tr>';
    }

    function footText(t) {
      var a = t.alarm;
      if (t.kind === 'digital') return t.description ? esc(t.description) : '상태';
      if (t.kind === 'counter') return '누적 · ' + esc(t.unit);
      if (!a) return esc(t.unit);
      var parts = [];
      if (a.low !== null && a.low !== undefined) parts.push('LOW ' + a.low);
      if (a.high !== null && a.high !== undefined) parts.push('HIGH ' + a.high);
      return parts.join(' / ') + ' ' + esc(t.unit) + (a.hysteresis ? ' · ±' + a.hysteresis : '');
    }

    /* ---------- KPI ---------- */
    function renderKpis() {
      var s = history[history.length - 1];
      tags.forEach(function (t) {
        var card = $('kpi-' + t.name), el = $('kv-' + t.name);
        if (!s) { el.textContent = '--'; return; }
        var v = s.values[t.name];
        var isAlarm = active[t.name + ':HIGH'] || active[t.name + ':LOW'];
        card.classList.toggle('alarm-active', !!isAlarm);
        card.classList.toggle('bad', s.quality !== 'GOOD');
        if (v === null || v === undefined) { el.textContent = '--'; return; }
        if (t.kind === 'digital') {
          var on = v >= 0.5;
          var alarmish = !!t.alarm; // 알람 임계값이 있는 digital 은 ON = 이상
          el.innerHTML = '<span class="pill ' + (on ? (alarmish ? 'crit' : 'good') : 'off') + '"><span class="dot"></span>' + (on ? (alarmish ? '발생' : '가동') : (alarmish ? '정상' : '정지')) + '</span>';
        } else if (t.kind === 'counter') {
          el.innerHTML = Math.round(v).toLocaleString('ko-KR') + '<small>' + esc(t.unit) + '</small>';
        } else {
          el.innerHTML = fmt(v, t.decimals) + '<small>' + esc(t.unit) + '</small>';
        }
      });
    }

    /* ---------- 차트 ---------- */
    var W = 1000, H = 190, PL = 52, PR = 16, PT = 12, PB = 26, narrow = false;
    function measure(svg, g) {
      var r = svg.getBoundingClientRect();
      var w = Math.max(280, Math.round(r.width || 1000)), h = Math.round(r.height || 190);
      narrow = w < 520; W = w; H = h > 0 ? h : 190; PL = narrow ? 42 : 52;
      // 다중 시리즈는 선 끝 직접 라벨 공간을 오른쪽에 확보
      PR = (narrow ? 10 : 16) + (g && g.tags.length > 1 ? (narrow ? 56 : 72) : 0);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }
    /** i 번째 샘플의 X 좌표. 표시 중인 샘플 수(history.length) 기준으로 항상 차트 폭을 채움 */
    function xOf(i) { return PL + (i / Math.max(1, history.length - 1)) * (W - PL - PR); }
    function yOf(v, dom) { return PT + (1 - (v - dom[0]) / (dom[1] - dom[0])) * (H - PT - PB); }
    function niceDomain(min, max) {
      if (!isFinite(min) || !isFinite(max)) return [0, 1];
      var span = max - min; if (span < 1e-9) span = Math.abs(max) > 1 ? Math.abs(max) * 0.1 : 1;
      var step = Math.pow(10, Math.floor(Math.log10(span)));
      if (span / step < 2) step /= 5; else if (span / step < 5) step /= 2;
      return [Math.floor(min / step) * step - step, Math.ceil(max / step) * step + step];
    }
    function groupDomain(g) {
      var lo = Infinity, hi = -Infinity;
      history.forEach(function (s) { g.tags.forEach(function (t) { var v = s.values[t.name]; if (v !== null && v !== undefined) { if (v < lo) lo = v; if (v > hi) hi = v; } }); });
      g.tags.forEach(function (t) { if (t.alarm) { if (t.alarm.high !== null && t.alarm.high !== undefined) { if (t.alarm.high > hi) hi = t.alarm.high; if (t.alarm.high < lo) lo = t.alarm.high; } if (t.alarm.low !== null && t.alarm.low !== undefined) { if (t.alarm.low < lo) lo = t.alarm.low; if (t.alarm.low > hi) hi = t.alarm.low; } } });
      if (lo === Infinity) return [0, 1];
      return niceDomain(lo, hi);
    }
    function drawChart(g, gi) {
      var svg = $('chart-' + gi).querySelector('svg');
      measure(svg, g);
      var n = history.length, dom = g.domain = groupDomain(g), out = '';
      var dec = g.tags[0].decimals;

      // 단일 시리즈면 알람 구간 음영
      if (g.tags.length === 1) {
        alarmBands(g.tags[0]).forEach(function (b) {
          out += '<rect class="alarm-band" x="' + xOf(b[0]) + '" y="' + PT + '" width="' + Math.max(1, xOf(b[1]) - xOf(b[0])) + '" height="' + (H - PT - PB) + '"/>';
        });
      }
      // 그리드 + Y 라벨
      out += '<g class="grid axis">';
      for (var k = 0; k <= 4; k++) { var v = dom[0] + (dom[1] - dom[0]) * k / 4, y = yOf(v, dom); out += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (PL - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + v.toFixed(dec) + '</text>'; }
      out += '</g>';
      // X 라벨
      if (n > 1) {
        var ticks = narrow ? 2 : 4; out += '<g class="axis">';
        for (var j = 0; j <= ticks; j++) { var idx = Math.round((n - 1) * j / ticks); out += '<text x="' + xOf(idx) + '" y="' + (H - 8) + '" text-anchor="' + (j === 0 ? 'start' : j === ticks ? 'end' : 'middle') + '">' + fmtTime(history[idx].ts) + '</text>'; }
        out += '</g>';
      }
      // 임계값 선 (그룹 내 고유값별 1개, 여러 태그가 다른 값을 가지면 태그 라벨 병기)
      var thr = {};
      g.tags.forEach(function (t) { if (!t.alarm) return; ['high', 'low'].forEach(function (k2) { var tv = t.alarm[k2]; if (tv === null || tv === undefined) return; var key = k2 + ':' + tv; (thr[key] = thr[key] || { level: k2, value: tv, tags: [] }).tags.push(t.label); }); });
      Object.keys(thr).forEach(function (key) {
        var th = thr[key]; if (th.value < dom[0] || th.value > dom[1]) return;
        var ty = yOf(th.value, dom);
        var who = th.tags.length < g.tags.length ? ' (' + shortLabel(th.tags[0]) + (th.tags.length > 1 ? ' 외 ' + (th.tags.length - 1) : '') + ')' : '';
        var label = th.level.toUpperCase() + ' ' + th.value + who;
        out += '<g class="thr"><line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + ty + '" y2="' + ty + '"/><text x="' + (W - PR) + '" y="' + (ty - 3) + '" text-anchor="end">' + esc(label) + '</text></g>';
      });
      // 시리즈
      var ends = []; // 직접 라벨 배치용 [{t, x, y, color}]
      g.tags.forEach(function (t) {
        var color = 'var(' + colorOf[t.name] + ')', path = '', open = false, lastX = 0, lastY = 0;
        history.forEach(function (s, i) {
          var v = s.values[t.name];
          if (v === null || v === undefined) { open = false; return; }
          var x = xOf(i), y = yOf(v, dom);
          path += (open ? ' L' : ' M') + x + ' ' + y; open = true; lastX = x; lastY = y;
        });
        if (!path) return;
        out += '<path class="line" d="' + path + '" stroke="' + color + '"/>';
        out += '<circle class="end" cx="' + lastX + '" cy="' + lastY + '" r="4" fill="' + color + '"/>';
        ends.push({ t: t, x: lastX, y: lastY, color: color });
      });
      // 직접 라벨 (2개 이상 시리즈일 때). 겹치지 않도록 y 를 11px 간격으로 조정
      if (ends.length > 1) {
        ends.sort(function (a, b) { return a.y - b.y; });
        for (var e = 1; e < ends.length; e++) if (ends[e].y - ends[e - 1].y < 11) ends[e].y = ends[e - 1].y + 11;
        ends.forEach(function (en) { out += '<text class="dlabel" x="' + (en.x + 6) + '" y="' + (en.y + 3) + '" fill="' + en.color + '">' + esc(shortLabel(en.t.label)) + '</text>'; });
      }
      out += '<g class="cross" data-cross></g>';
      svg.innerHTML = out;
    }
    function shortLabel(l) { return l.length > 8 ? l.slice(0, 8) + '…' : l; }
    /** 단일 태그의 알람 활성 구간 [시작 idx, 끝 idx] (표시 이력 범위) */
    function alarmBands(t) {
      var out = [], start = null, a = t.alarm; if (!a) return out;
      for (var i = 0; i < history.length; i++) {
        var v = history[i].values[t.name]; if (v === null || v === undefined) continue;
        var over = (a.high !== null && a.high !== undefined && v > a.high) || (a.low !== null && a.low !== undefined && v < a.low);
        var back = (a.high === null || a.high === undefined || v <= a.high - a.hysteresis) && (a.low === null || a.low === undefined || v >= a.low + a.hysteresis);
        if (start === null && over) start = i; else if (start !== null && back) { out.push([start, i]); start = null; }
      }
      if (start !== null) out.push([start, history.length - 1]);
      return out;
    }
    function attachHover(g, svg) {
      var tip = $('tip');
      function show(cx, cy) {
        measure(svg, g);
        var r = svg.getBoundingClientRect(), px = (cx - r.left) / r.width * W;
        var i = Math.round((px - PL) / (W - PL - PR) * (history.length - 1)); i = Math.max(0, Math.min(history.length - 1, i));
        var s = history[i]; if (!s) return;
        var cross = svg.querySelector('[data-cross]'), x = xOf(i), html = '';
        html = '<line x1="' + x + '" x2="' + x + '" y1="' + PT + '" y2="' + (H - PB) + '"/>';
        var lines = [fmtTime(s.ts) + ' · seq ' + s.seq];
        g.tags.forEach(function (t) { var v = s.values[t.name]; if (v === null || v === undefined) return; html += '<circle cx="' + x + '" cy="' + yOf(v, g.domain) + '" r="4.5" fill="var(' + colorOf[t.name] + ')"/>'; lines.push(t.label + ' ' + fmt(v, t.decimals) + ' ' + t.unit); });
        cross.innerHTML = html; tip.hidden = false; tip.innerHTML = lines.map(esc).join('<br>');
        var tw = tip.offsetWidth || 160, left = cx + 14; if (left + tw > window.innerWidth - 8) left = cx - tw - 14;
        tip.style.left = Math.max(8, left) + 'px'; tip.style.top = (cy - 36) + 'px';
      }
      function hide() { var c = svg.querySelector('[data-cross]'); if (c) c.innerHTML = ''; tip.hidden = true; }
      svg.addEventListener('mousemove', function (e) { show(e.clientX, e.clientY); });
      svg.addEventListener('mouseleave', hide);
      svg.addEventListener('touchstart', function (e) { var t = e.touches[0]; show(t.clientX, t.clientY); }, { passive: true });
      svg.addEventListener('touchmove', function (e) { var t = e.touches[0]; show(t.clientX, t.clientY); }, { passive: true });
      svg.addEventListener('touchend', function () { setTimeout(hide, 1500); }, { passive: true });
    }

    /* ---------- 알람 표 ---------- */
    function renderAlarms() {
      $('alarmCount').textContent = events.length + '건' + (Object.keys(active).length ? ' · 활성 ' + Object.keys(active).length : '');
      $('alarmEmpty').hidden = events.length > 0;
      $('alarmBody').innerHTML = events.slice(0, 200).map(function (a) {
        var t = tagMap[a.tag] || { label: a.tag, unit: '', decimals: 1, kind: 'analog' };
        var val = t.kind === 'digital' ? (a.value >= 0.5 ? 'ON' : 'OFF') : fmt(a.value, t.decimals) + ' ' + t.unit;
        return '<tr class="ev-' + a.state + '"><td class="mono">' + fmtTime(a.state === 'CLEARED' && a.clearedAt ? a.clearedAt : a.raisedAt) + '</td><td>' + esc(t.label) + '</td><td class="lvl ' + a.level + '">' + a.level + '</td><td>' + (a.state === 'ACTIVE' ? '발생' : '해제') + '</td><td class="n mono">' + esc(val) + '</td></tr>';
      }).join('');
    }

    /* ---------- 샘플 표 ---------- */
    function renderTable() {
      var n = history.length, rows = [];
      for (var i = n - 1; i >= Math.max(0, n - TABLE_ROWS); i--) {
        var s = history[i];
        rows.push('<tr class="' + (i === n - 1 ? 'current' : '') + (s.quality !== 'GOOD' ? ' bad' : '') + '"><td class="n mono">' + s.seq + '</td><td class="mono">' + s.ts.slice(11, 23) + '</td>' +
          tags.map(function (t) { var v = s.values[t.name]; return '<td class="n mono">' + (v === null || v === undefined ? '--' : t.kind === 'analog' ? fmt(v, t.decimals) : Math.round(v)) + '</td>'; }).join('') +
          '<td>' + s.quality + '</td></tr>');
      }
      $('tableBody').innerHTML = rows.join('');
      $('tableCount').textContent = (n > TABLE_ROWS ? '최근 ' + TABLE_ROWS + '건 표시 · ' : '') + n + '건';
    }

    /* ---------- 공개 API ---------- */
    var api = {
      tags: tags, groups: groups,
      setHistory: function (samples) { history = samples.slice(-MAX); },
      push: function (s) { history.push(s); if (history.length > MAX) history.shift(); },
      setAlarms: function (evts, act) { events = evts.slice(); active = {}; (act || []).forEach(function (a) { active[a.tag + ':' + a.level] = a; }); },
      pushAlarm: function (a) { var key = a.tag + ':' + a.level; if (a.state === 'ACTIVE') active[key] = a; else delete active[key]; events.unshift(a); if (events.length > 500) events.pop(); },
      latest: function () { return history[history.length - 1] || null; },
      render: function () { renderKpis(); groups.forEach(drawChart); renderAlarms(); renderTable(); },
      renderCharts: function () { groups.forEach(drawChart); },
    };

    buildSkeleton();
    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(api.renderCharts, 120); });
    return api;
  }

  global.PlcDashboard = { create: create, AlarmTracker: AlarmTracker, fmtTime: fmtTime };
})(window);

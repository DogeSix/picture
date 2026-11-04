/**
 * 🎨 彩虹魔法畫布 Rainbow Magic Canvas Pro - 主互動核心與5大創意藝術小遊戲引擎
 * 採用與《數感奇幻島》一致的「自然文檔流 (Natural Document Flow)」平板優化架構：
 * 不鎖定視窗高度，全頁可自然順暢上下捲動，按鈕永遠清晰分明、絕不重疊或遮擋！
 */

class RainbowArtApp {
  constructor() {
    this.currentTab = 'studio';
    this.currentTemplateIdx = 0;
    this.isBlankMode = false;
    this.activeTool = 'bucket'; // bucket, smartbrush, crayon, watercolor, neon, rainbow, stamp, eraser
    this.activeColor = window.COLOR_PALETTE[0].hex;
    this.activeColorName = window.COLOR_PALETTE[0].name;
    this.activeColorNote = 0;
    this.activeGradientId = null;
    this.brushSize = 20;
    this.activeStamp = window.STAMP_LIBRARY[0];
    this.rainbowHue = 0;

    // 畫布與歷史復原紀錄
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.lockedClipPath = null; // Stay-Inside-the-Lines 防出界鎖定的 SVG Path2D
    this.undoStack = [];
    this.numberGuideVisible = false;
    this.aliveDancing = false;

    // 玩家統計與狀態
    this.stars = 30;
    this.galleryWorks = [];
    this.leftHanded = false;
    this.ipadFrameMode = false;
    this.portraitMode = false;

    // 小遊戲狀態
    this.currentMiniGame = 'number';
    this.numGameMode = 'number';
    this.numGameTplIdx = 0;
    this.numGameSelectedNum = 1;
    this.mandalaAxes = 8;
    this.mandalaColor = '#00F2FE';
    this.pixelColor = '#FF3B30';
    this.mixerPicked = [];
    this.mixerCurrentQuest = null;
    this.mixerSolved = 0;
    this.scratchCurrentIdx = 0;
  }

  init() {
    this.loadSavedState();
    this.canvas = document.getElementById('drawingCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.renderPaletteSidebar();
    this.renderStampSelector();
    this.renderCategoryFilter('all');
    this.renderTemplatesGallery('all');
    this.renderTop10Apps();
    this.renderGalleryWorks();

    this.bindStudioCanvasEvents();
    this.loadTemplate(0);

    // 初始化 5 大創意小遊戲
    this.initNumberMiniGame();
    this.initMandalaMiniGame();
    this.initPixelMiniGame();
    this.initMixerMiniGame();
    this.initScratchMiniGame();

    this.updateStatsUI();
  }

  loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem('rainbow_magic_canvas_v1') || '{}');
      if (typeof saved.stars === 'number') this.stars = saved.stars;
      if (Array.isArray(saved.galleryWorks)) this.galleryWorks = saved.galleryWorks;
    } catch (e) {}
  }

  saveState() {
    try {
      localStorage.setItem('rainbow_magic_canvas_v1', JSON.stringify({
        stars: this.stars,
        galleryWorks: this.galleryWorks.slice(0, 24)
      }));
    } catch (e) {}
  }

  updateStatsUI() {
    document.getElementById('statStars').textContent = this.stars;
    document.getElementById('statWorks').textContent = this.galleryWorks.length;
    const gLabel = document.getElementById('galleryCountLabel');
    if (gLabel) gLabel.textContent = this.galleryWorks.length;
  }

  addStars(amount, reasonText = '') {
    this.stars += amount;
    this.updateStatsUI();
    this.saveState();
    this.fireConfetti();
    window.soundEngine.playFanfare();
    if (reasonText) {
      window.soundEngine.speak(reasonText);
    }
  }

  // ==================== 頂部快速切換與 iPad mini 7 預覽模式 ====================
  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    window.soundEngine.playColorNote(3);
  }

  toggleVoice() {
    const enabled = !window.soundEngine.voiceEnabled;
    window.soundEngine.voiceEnabled = enabled;
    const btn = document.getElementById('btnVoice');
    btn.classList.toggle('active', enabled);
    if (enabled) window.soundEngine.speak('雙語語音小老師已開啟！');
  }

  toggleSfx() {
    const enabled = !window.soundEngine.sfxEnabled;
    window.soundEngine.sfxEnabled = enabled;
    document.getElementById('btnSfx').classList.toggle('active', enabled);
    if (enabled) window.soundEngine.playColorNote(7);
  }

  toggleBgm() {
    const enabled = window.soundEngine.toggleBgm();
    document.getElementById('btnBgm').classList.toggle('active', enabled);
  }

  toggleLeftHand() {
    this.leftHanded = !this.leftHanded;
    document.getElementById('studioLayout').classList.toggle('left-handed', this.leftHanded);
    const btn = document.getElementById('btnHand');
    btn.classList.toggle('active', this.leftHanded);
    btn.textContent = this.leftHanded ? '🤚 左手版面' : '🤚 右手版面';
    window.soundEngine.playColorNote(5);
  }

  toggleIpadFrame(forceState) {
    this.ipadFrameMode = typeof forceState === 'boolean' ? forceState : !this.ipadFrameMode;
    const wrapper = document.getElementById('deviceWrapper');
    wrapper.classList.toggle('ipad-frame-mode', this.ipadFrameMode);
    document.getElementById('btnIpadMode').classList.toggle('active', this.ipadFrameMode);
  }

  toggleOrientation() {
    this.portraitMode = !this.portraitMode;
    document.getElementById('deviceWrapper').classList.toggle('portrait-mode', this.portraitMode);
  }

  // ==================== 色盤、漸層漆與印章選擇器 ====================
  renderPaletteSidebar() {
    const grid = document.getElementById('colorPaletteGrid');
    grid.innerHTML = window.COLOR_PALETTE.map((c, idx) => `
      <button class="color-swatch-btn ${idx === 0 ? 'active' : ''}"
        style="background:${c.hex};"
        title="${c.name}"
        onclick="app.selectColor('${c.hex}', '${c.name}', ${c.note}, this)">
      </button>
    `).join('');

    const gradGrid = document.getElementById('gradientPaletteGrid');
    gradGrid.innerHTML = window.MAGIC_GRADIENTS.map(g => `
      <button class="gradient-swatch-btn"
        style="background: linear-gradient(135deg, ${g.stops.join(',')});"
        onclick="app.selectGradient('${g.id}', '${g.name}', '${g.stops[0]}', this)">
        ${g.name}
      </button>
    `).join('');
  }

  selectColor(hex, name, noteIdx, btnEl) {
    this.activeColor = hex;
    this.activeColorName = name;
    this.activeColorNote = noteIdx;
    this.activeGradientId = null;

    document.querySelectorAll('.color-swatch-btn, .gradient-swatch-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const swatch = document.getElementById('activeColorSwatch');
    swatch.style.background = hex;
    document.getElementById('activeColorName').textContent = `${name}`;

    if (this.activeTool === 'eraser') {
      this.selectTool('bucket');
    }
    window.soundEngine.playColorNote(noteIdx);
  }

  selectGradient(gradId, name, fallbackHex, btnEl) {
    this.activeGradientId = gradId;
    this.activeColor = fallbackHex;
    this.activeColorName = name;

    document.querySelectorAll('.color-swatch-btn, .gradient-swatch-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const gradObj = window.MAGIC_GRADIENTS.find(g => g.id === gradId);
    const swatch = document.getElementById('activeColorSwatch');
    swatch.style.background = `linear-gradient(135deg, ${gradObj.stops.join(',')})`;
    document.getElementById('activeColorName').textContent = name;

    this.selectTool('bucket');
    window.soundEngine.playSparkle();
  }

  renderStampSelector() {
    const grid = document.getElementById('stampSelectorGrid');
    grid.innerHTML = window.STAMP_LIBRARY.map((emoji, idx) => `
      <button class="stamp-item-btn ${idx === 0 ? 'active' : ''}"
        onclick="app.selectStamp('${emoji}', this)">${emoji}</button>
    `).join('');
  }

  selectStamp(emoji, btnEl) {
    this.activeStamp = emoji;
    document.querySelectorAll('.stamp-item-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    this.selectTool('stamp');
    window.soundEngine.playStampBoing();
  }

  selectTool(toolName) {
    this.activeTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    if (toolName === 'bucket' && !this.isBlankMode) {
      this.canvas.classList.add('pass-through');
    } else {
      this.canvas.classList.remove('pass-through');
    }
    window.soundEngine.playColorNote(2);
  }

  updateBrushSize(val) {
    this.brushSize = Number(val);
    document.getElementById('brushSizeLabel').textContent = val;
  }

  // ==================== 載入 54 款公版與 SVG 智慧分區填色 ====================
  loadTemplate(idx) {
    this.isBlankMode = false;
    this.currentTemplateIdx = (idx + window.TEMPLATES_DB.length) % window.TEMPLATES_DB.length;
    const tpl = window.TEMPLATES_DB[this.currentTemplateIdx];

    document.getElementById('currentTplIcon').textContent = tpl.icon;
    document.getElementById('currentTplTitle').textContent = tpl.title;
    document.getElementById('currentTplEn').textContent = tpl.en;
    document.getElementById('currentTplFact').textContent = tpl.fact;
    document.getElementById('currentTplIndex').textContent = tpl.index;

    const holder = document.getElementById('svgTemplateHolder');
    holder.innerHTML = tpl.svg;

    holder.querySelectorAll('.color-zone').forEach(zone => {
      zone.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pushUndoState();
        const fillVal = this.activeGradientId ? `url(#${this.activeGradientId})` : this.activeColor;
        zone.setAttribute('fill', fillVal);
        window.soundEngine.playFillPop(this.activeColorNote);
      });
    });

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack = [];
    this.renderNumberGuideBadges();
    this.selectTool(this.activeTool);
  }

  loadBlankCanvas() {
    this.isBlankMode = true;
    document.getElementById('currentTplIcon').textContent = '📄';
    document.getElementById('currentTplTitle').textContent = '自由創作空白畫布';
    document.getElementById('currentTplEn').textContent = 'Free Drawing Paper';
    document.getElementById('currentTplFact').textContent = '盡情使用粉彩蠟筆、水彩、霓虹筆、七彩彩虹筆與 40 款貼紙印章自由創作吧！';
    document.getElementById('svgTemplateHolder').innerHTML = `
      <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="500" height="500" fill="#FFFFFF"/>
      </svg>
    `;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack = [];
    document.getElementById('numberGuideOverlay').classList.add('hidden');
    if (this.activeTool === 'bucket' || this.activeTool === 'smartbrush') {
      this.selectTool('crayon');
    } else {
      this.selectTool(this.activeTool);
    }
    window.soundEngine.speak('已切換為空白畫紙，開始自由畫畫吧！');
  }

  prevTemplate() {
    this.loadTemplate(this.currentTemplateIdx - 1);
  }

  nextTemplate() {
    this.loadTemplate(this.currentTemplateIdx + 1);
  }

  pickRandomTemplate() {
    const rnd = Math.floor(Math.random() * window.TEMPLATES_DB.length);
    this.loadTemplate(rnd);
    this.switchTab('studio');
    window.soundEngine.playSparkle();
  }

  speakCurrentTemplate() {
    if (this.isBlankMode) {
      window.soundEngine.speak('這是自由創作空白畫布，可以用各種魔法畫筆和貼紙畫出你心中的故事喔！');
      return;
    }
    const tpl = window.TEMPLATES_DB[this.currentTemplateIdx];
    window.soundEngine.speak(`${tpl.title}，英文叫做 ${tpl.en}。${tpl.fact}`);
  }

  // 數字密碼提示浮層
  toggleNumberGuide() {
    if (this.isBlankMode) return;
    this.numberGuideVisible = !this.numberGuideVisible;
    document.getElementById('btnNumberGuide').classList.toggle('active', this.numberGuideVisible);
    const overlay = document.getElementById('numberGuideOverlay');
    overlay.classList.toggle('hidden', !this.numberGuideVisible);
    this.renderNumberGuideBadges();
  }

  renderNumberGuideBadges() {
    const overlay = document.getElementById('numberGuideOverlay');
    if (!this.numberGuideVisible || this.isBlankMode) {
      overlay.innerHTML = '';
      return;
    }
    const zones = document.querySelectorAll('#svgTemplateHolder .color-zone');
    let html = '';
    zones.forEach(z => {
      const cx = z.getAttribute('data-cx');
      const cy = z.getAttribute('data-cy');
      const num = z.getAttribute('data-num') || '1';
      if (cx && cy) {
        const leftPct = (Number(cx) / 500) * 100;
        const topPct = (Number(cy) / 500) * 100;
        html += `<div class="num-badge-dot" style="left:${leftPct}%;top:${topPct}%;">${num}</div>`;
      }
    });
    overlay.innerHTML = html;
  }

  toggleAliveAnimation() {
    this.aliveDancing = !this.aliveDancing;
    document.getElementById('artboardContainer').classList.toggle('alive-dancing', this.aliveDancing);
    document.getElementById('btnAliveDance').classList.toggle('active', this.aliveDancing);
    if (this.aliveDancing) {
      window.soundEngine.playFanfare();
      window.soundEngine.speak('哇！你的畫作活起來跳舞了！');
    }
  }

  autoRainbowFill() {
    this.pushUndoState();
    const zones = document.querySelectorAll('#svgTemplateHolder .color-zone');
    const niceColors = [
      '#E0F2FE', '#DCFCE7', '#FFCC00', '#FFFFFF',
      '#FF6B6B', '#FFB340', '#34C759', '#32ADE6',
      '#AF52DE', '#FF9AA2', '#FFD3B6', '#A8E6CF'
    ];
    zones.forEach((z, idx) => {
      if (idx === 0) {
        z.setAttribute('fill', '#E0F7FA');
      } else if (idx === 1) {
        z.setAttribute('fill', '#A8E6CF');
      } else {
        const pick = niceColors[(idx * 3 + Math.floor(Math.random() * 5)) % niceColors.length];
        z.setAttribute('fill', pick);
      }
    });
    window.soundEngine.playSparkle();
  }

  // ==================== HTML5 Canvas 手繪、防出界塗刷與貼紙印章引擎 ====================
  bindStudioCanvasEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * 500,
        y: ((clientY - rect.top) / rect.height) * 500,
        clientX,
        clientY
      };
    };

    const startDraw = (e) => {
      if (this.activeTool === 'bucket' && !this.isBlankMode) return;
      e.preventDefault();
      const pos = getPos(e);
      this.pushUndoState();

      if (this.activeTool === 'stamp') {
        this.ctx.save();
        this.ctx.font = `${this.brushSize * 1.9}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.activeStamp, pos.x, pos.y);
        this.ctx.restore();
        window.soundEngine.playStampBoing();
        return;
      }

      this.isDrawing = true;
      this.lastX = pos.x;
      this.lastY = pos.y;

      this.lockedClipPath = null;
      if (this.activeTool === 'smartbrush' && !this.isBlankMode) {
        this.canvas.style.pointerEvents = 'none';
        const hitEl = document.elementFromPoint(pos.clientX, pos.clientY);
        this.canvas.style.pointerEvents = 'auto';
        if (hitEl && hitEl.classList && hitEl.classList.contains('color-zone')) {
          this.lockedClipPath = this.svgElementToPath2D(hitEl);
        }
      }

      this.drawStrokeSegment(pos.x, pos.y, pos.x + 0.1, pos.y + 0.1);
    };

    const moveDraw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.drawStrokeSegment(this.lastX, this.lastY, pos.x, pos.y);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const endDraw = () => {
      this.isDrawing = false;
      this.lockedClipPath = null;
    };

    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    this.canvas.addEventListener('touchstart', startDraw, { passive: false });
    this.canvas.addEventListener('touchmove', moveDraw, { passive: false });
    window.addEventListener('touchend', endDraw);
  }

  svgElementToPath2D(el) {
    try {
      const tag = el.tagName.toLowerCase();
      if (tag === 'path') {
        return new Path2D(el.getAttribute('d'));
      }
      const p = new Path2D();
      if (tag === 'circle') {
        const cx = parseFloat(el.getAttribute('cx'));
        const cy = parseFloat(el.getAttribute('cy'));
        const r = parseFloat(el.getAttribute('r'));
        p.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (tag === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx'));
        const cy = parseFloat(el.getAttribute('cy'));
        const rx = parseFloat(el.getAttribute('rx'));
        const ry = parseFloat(el.getAttribute('ry'));
        p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x'));
        const y = parseFloat(el.getAttribute('y'));
        const w = parseFloat(el.getAttribute('width'));
        const h = parseFloat(el.getAttribute('height'));
        p.rect(x, y, w, h);
      } else if (tag === 'polygon') {
        const pts = el.getAttribute('points').trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < pts.length; i += 2) {
          if (i === 0) p.moveTo(pts[i], pts[i + 1]);
          else p.lineTo(pts[i], pts[i + 1]);
        }
        p.closePath();
      }
      return p;
    } catch (e) {
      return null;
    }
  }

  drawStrokeSegment(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.save();

    if (this.lockedClipPath) {
      ctx.clip(this.lockedClipPath);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushSize;

    if (this.activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (this.activeTool === 'watercolor') {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = this.activeColor;
      ctx.lineWidth = this.brushSize * 1.45;
    } else if (this.activeTool === 'neon') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowColor = this.activeColor;
      ctx.shadowBlur = 16;
      ctx.lineWidth = this.brushSize * 0.7;
    } else if (this.activeTool === 'rainbow') {
      this.rainbowHue = (this.rainbowHue + 6) % 360;
      ctx.strokeStyle = `hsl(${this.rainbowHue}, 92%, 58%)`;
    } else if (this.activeTool === 'crayon') {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = this.activeColor;
      ctx.shadowColor = this.activeColor;
      ctx.shadowBlur = 2;
    } else {
      ctx.strokeStyle = this.activeColor;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // ==================== 復原上一步與清空重畫 ====================
  pushUndoState() {
    const svgEl = document.querySelector('#svgTemplateHolder svg');
    const svgFills = [];
    if (svgEl) {
      svgEl.querySelectorAll('.color-zone').forEach(z => svgFills.push(z.getAttribute('fill')));
    }
    this.undoStack.push({
      svgFills,
      canvasData: this.canvas.toDataURL()
    });
    if (this.undoStack.length > 15) this.undoStack.shift();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const prev = this.undoStack.pop();
    const svgEl = document.querySelector('#svgTemplateHolder svg');
    if (svgEl && prev.svgFills) {
      const zones = svgEl.querySelectorAll('.color-zone');
      zones.forEach((z, i) => {
        if (prev.svgFills[i]) z.setAttribute('fill', prev.svgFills[i]);
      });
    }
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, 500, 500);
      this.ctx.drawImage(img, 0, 0);
    };
    img.src = prev.canvasData;
    window.soundEngine.playGentleHint();
  }

  clearCanvasConfirm() {
    this.pushUndoState();
    const svgEl = document.querySelector('#svgTemplateHolder svg');
    if (svgEl) {
      svgEl.querySelectorAll('.color-zone').forEach(z => z.setAttribute('fill', '#FFFFFF'));
    }
    this.ctx.clearRect(0, 0, 500, 500);
    window.soundEngine.playGentleHint();
  }

  // ==================== 雙層合成匯出高清畫作至美術館 ====================
  saveToGallery() {
    const svgEl = document.querySelector('#svgTemplateHolder svg');
    if (!svgEl) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 500;
    exportCanvas.height = 500;
    const eCtx = exportCanvas.getContext('2d');

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      eCtx.fillStyle = '#FFFFFF';
      eCtx.fillRect(0, 0, 500, 500);
      eCtx.drawImage(img, 0, 0, 500, 500);
      eCtx.drawImage(this.canvas, 0, 0, 500, 500);
      URL.revokeObjectURL(url);

      const finalDataUrl = exportCanvas.toDataURL('image/png');
      const tplTitle = this.isBlankMode
        ? '自由創意畫作'
        : window.TEMPLATES_DB[this.currentTemplateIdx].title;

      this.galleryWorks.unshift({
        id: Date.now(),
        title: tplTitle,
        date: new Date().toLocaleDateString('zh-TW'),
        dataUrl: finalDataUrl
      });

      window.soundEngine.playShutter();
      this.addStars(20, `太棒了！《${tplTitle}》已裝裱收藏到你的美術館，獎勵二十顆彩虹星星！`);
      this.renderGalleryWorks();
    };
    img.src = url;
  }

  renderGalleryWorks() {
    const grid = document.getElementById('savedGalleryGrid');
    if (this.galleryWorks.length === 0) {
      grid.innerHTML = `
        <div class="framed-art-card" style="grid-column: 1 / -1; padding: 24px;">
          <p style="font-size:14px;font-weight:800;color:#64748B;">🎨 目前美術館還沒有掛上畫作喔！快去「魔法填色畫室」或「5大藝術小遊戲」完成作品並點擊【📸 裝裱收藏】吧！</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.galleryWorks.map((w, idx) => `
      <div class="framed-art-card">
        <img src="${w.dataUrl}" alt="${w.title}" />
        <strong>👑 ${w.title}</strong>
        <small style="color:#64748B;">創作日期：${w.date}</small>
        <div style="display:flex;gap:6px;width:100%;margin-top:4px;">
          <a href="${w.dataUrl}" download="彩虹魔法畫布_${w.title}.png" class="primary-pill-btn" style="flex:1;text-align:center;text-decoration:none;font-size:12px;padding:6px;">💾 下載 PNG</a>
          <button class="secondary-pill-btn" style="padding:6px 10px;font-size:12px;" onclick="app.deleteGalleryWork(${idx})">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  deleteGalleryWork(idx) {
    this.galleryWorks.splice(idx, 1);
    this.saveState();
    this.updateStatsUI();
    this.renderGalleryWorks();
  }

  // ==================== 分頁 2：54 款塗鴉公版分類瀏覽器 ====================
  renderCategoryFilter(activeCat) {
    const bar = document.getElementById('categoryFilterBar');
    bar.innerHTML = window.TEMPLATE_CATEGORIES.map(c => `
      <button class="cat-pill-btn ${c.id === activeCat ? 'active' : ''}"
        onclick="app.filterTemplatesByCategory('${c.id}')">
        ${c.name}
      </button>
    `).join('');
  }

  filterTemplatesByCategory(catId) {
    this.renderCategoryFilter(catId);
    this.renderTemplatesGallery(catId);
    window.soundEngine.playColorNote(4);
  }

  renderTemplatesGallery(catId) {
    const grid = document.getElementById('templatesGalleryGrid');
    const list = catId === 'all'
      ? window.TEMPLATES_DB
      : window.TEMPLATES_DB.filter(t => t.cat === catId);

    grid.innerHTML = list.map(t => `
      <div class="tpl-card" onclick="app.selectTemplateFromGallery(${t.index - 1})">
        <div class="tpl-thumb-box">${t.svg}</div>
        <div class="tpl-card-title">#${t.index} ${t.icon} ${t.title}</div>
        <div class="tpl-card-en">${t.en}</div>
        <button class="primary-pill-btn" style="width:100%;font-size:12px;padding:6px 10px;">🖌️ 開始填色</button>
      </div>
    `).join('');
  }

  selectTemplateFromGallery(idx) {
    this.loadTemplate(idx);
    this.switchTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.soundEngine.playColorNote(6);
  }

  // ==================== 分頁 3：5 大創意藝術小遊戲引擎 ====================
  switchMiniGame(gameId) {
    this.currentMiniGame = gameId;
    document.querySelectorAll('.game-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.game === gameId);
    });
    document.querySelectorAll('.minigame-stage').forEach(s => {
      s.classList.toggle('active', s.id === `minigame-${gameId}`);
    });
    window.soundEngine.playColorNote(5);
  }

  // --- 小遊戲 1：數字與算式密碼填色 ---
  initNumberMiniGame() {
    this.numGameColors = [
      { num: 1, hex: '#87CEEB', name: '晴空藍' },
      { num: 2, hex: '#69DB7C', name: '嫩草綠' },
      { num: 3, hex: '#FFD43B', name: '太陽黃' },
      { num: 4, hex: '#F1F5F9', name: '雲朵白' },
      { num: 5, hex: '#FF6B6B', name: '珊瑚紅' },
      { num: 6, hex: '#FFA94D', name: '活力橘' },
      { num: 7, hex: '#FFE066', name: '奶油黃' },
      { num: 8, hex: '#B197FC', name: '魔幻紫' }
    ];
    this.renderNumberGamePalette();
    this.loadNumberGameTemplate(0);
  }

  setNumberGameMode(mode) {
    this.numGameMode = mode;
    document.getElementById('btnNumModeSimple').classList.toggle('active', mode === 'number');
    document.getElementById('btnNumModeMath').classList.toggle('active', mode === 'math');
    this.loadNumberGameTemplate(this.numGameTplIdx);
  }

  nextNumberGameTemplate() {
    this.numGameTplIdx = (this.numGameTplIdx + 1) % window.TEMPLATES_DB.length;
    this.loadNumberGameTemplate(this.numGameTplIdx);
  }

  renderNumberGamePalette() {
    const pal = document.getElementById('numGamePalette');
    pal.innerHTML = this.numGameColors.map(c => `
      <button class="num-ball-btn ${c.num === this.numGameSelectedNum ? 'active' : ''}"
        style="background:${c.hex}; color:${c.num === 4 ? '#2C3E50' : '#FFFFFF'};"
        onclick="app.selectNumberBall(${c.num})">
        <span>#${c.num}</span>
        <small>${c.name}</small>
      </button>
    `).join('');
  }

  selectNumberBall(num) {
    this.numGameSelectedNum = num;
    this.renderNumberGamePalette();
    window.soundEngine.playColorNote(num);
  }

  loadNumberGameTemplate(idx) {
    const tpl = window.TEMPLATES_DB[idx];
    const board = document.getElementById('numGameBoard');
    board.innerHTML = tpl.svg;

    const mathClues = {
      1: '0+1', 2: '1+1', 3: '1+2', 4: '2+2',
      5: '3+2', 6: '4+2', 7: '5+2', 8: '4+4'
    };

    const zones = board.querySelectorAll('.color-zone');
    this.numGameTotalZones = zones.length;
    this.numGameSolvedZones = 0;
    this.updateNumberGameProgress();

    zones.forEach((z, zIdx) => {
      const targetNum = Number(z.getAttribute('data-num') || ((zIdx % 8) + 1));
      z.setAttribute('data-target-num', targetNum);
      z.setAttribute('fill', '#F8FAFC');

      const cx = z.getAttribute('data-cx');
      const cy = z.getAttribute('data-cy');
      if (cx && cy) {
        const badge = document.createElement('div');
        badge.className = 'num-badge-dot';
        badge.dataset.badgeZone = zIdx;
        badge.style.left = `${(Number(cx) / 500) * 100}%`;
        badge.style.top = `${(Number(cy) / 500) * 100}%`;
        badge.style.width = this.numGameMode === 'math' ? '36px' : '24px';
        badge.style.borderRadius = '99px';
        badge.textContent = this.numGameMode === 'math' ? mathClues[targetNum] : targetNum;
        board.appendChild(badge);
      }

      z.addEventListener('click', () => {
        if (z.getAttribute('data-solved') === 'true') return;
        if (this.numGameSelectedNum === targetNum) {
          const colorObj = this.numGameColors.find(c => c.num === targetNum);
          z.setAttribute('fill', colorObj.hex);
          z.setAttribute('data-solved', 'true');
          const bEl = board.querySelector(`[data-badge-zone="${zIdx}"]`);
          if (bEl) bEl.remove();
          this.numGameSolvedZones++;
          window.soundEngine.playFillPop(targetNum);
          this.updateNumberGameProgress();

          if (this.numGameSolvedZones >= this.numGameTotalZones) {
            this.addStars(25, `太神啦！你完成了數字密碼填色挑戰，獲得二十五顆星星！`);
          }
        } else {
          window.soundEngine.playGentleHint();
        }
      });
    });
  }

  updateNumberGameProgress() {
    document.getElementById('numGameProgressText').textContent = `${this.numGameSolvedZones} / ${this.numGameTotalZones}`;
    const pct = Math.round((this.numGameSolvedZones / Math.max(1, this.numGameTotalZones)) * 100);
    document.getElementById('numGameProgressBar').style.width = `${pct}%`;
  }

  // --- 小遊戲 2：魔法萬花筒對稱光繪室 ---
  initMandalaMiniGame() {
    const mCanvas = document.getElementById('mandalaCanvas');
    const mCtx = mCanvas.getContext('2d');
    this.mCanvas = mCanvas;
    this.mCtx = mCtx;
    this.clearMandala();

    const neonColors = ['#00F2FE', '#FF5E7E', '#FFBE0B', '#38F9D7', '#A855F7', '#FF9E00', '#FFFFFF'];
    const bar = document.getElementById('mandalaColorBar');
    bar.innerHTML = neonColors.map((c, i) => `
      <button class="mini-color-dot ${i === 0 ? 'active' : ''}"
        style="background:${c};"
        onclick="app.selectMandalaColor('${c}', this)"></button>
    `).join('');

    let drawing = false;
    let lx = 0, ly = 0;

    const getPos = (e) => {
      const r = mCanvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((cx - r.left) / r.width) * mCanvas.width,
        y: ((cy - r.top) / r.height) * mCanvas.height
      };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const p = getPos(e);
      lx = p.x;
      ly = p.y;
      window.soundEngine.playColorNote(6);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      this.drawMandalaSymmetric(lx, ly, p.x, p.y);
      lx = p.x;
      ly = p.y;
    };

    const end = () => { drawing = false; };

    mCanvas.addEventListener('mousedown', start);
    mCanvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    mCanvas.addEventListener('touchstart', start, { passive: false });
    mCanvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  }

  selectMandalaColor(hex, btn) {
    this.mandalaColor = hex;
    document.querySelectorAll('#mandalaColorBar .mini-color-dot').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.soundEngine.playColorNote(8);
  }

  setMandalaAxes(axes, btn) {
    this.mandalaAxes = axes;
    btn.parentElement.querySelectorAll('.mg-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.soundEngine.playSparkle();
  }

  drawMandalaSymmetric(x1, y1, x2, y2) {
    const ctx = this.mCtx;
    const cx = this.mCanvas.width / 2;
    const cy = this.mCanvas.height / 2;
    const step = (Math.PI * 2) / this.mandalaAxes;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = this.mandalaColor;
    ctx.shadowColor = this.mandalaColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i < this.mandalaAxes; i++) {
      ctx.save();
      ctx.rotate(i * step);
      ctx.beginPath();
      ctx.moveTo(x1 - cx, y1 - cy);
      ctx.lineTo(x2 - cx, y2 - cy);
      ctx.stroke();

      ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(x1 - cx, y1 - cy);
      ctx.lineTo(x2 - cx, y2 - cy);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  clearMandala() {
    if (!this.mCtx) return;
    this.mCtx.fillStyle = '#0F172A';
    this.mCtx.fillRect(0, 0, this.mCanvas.width, this.mCanvas.height);
  }

  saveMandalaToGallery() {
    const dataUrl = this.mCanvas.toDataURL('image/png');
    this.galleryWorks.unshift({
      id: Date.now(),
      title: '萬花筒霓虹曼陀羅',
      date: new Date().toLocaleDateString('zh-TW'),
      dataUrl
    });
    this.renderGalleryWorks();
    this.addStars(15, '萬花筒光繪作品已收藏至美術館！');
  }

  // --- 小遊戲 3：12x12 點陣像素拼豆大師 ---
  initPixelMiniGame() {
    const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#32ADE6', '#5856D6', '#AF52DE', '#795548', '#2C3E50', '#FFFFFF'];
    const bar = document.getElementById('pixelColorBar');
    bar.innerHTML = colors.map((c, i) => `
      <button class="mini-color-dot ${i === 0 ? 'active' : ''}"
        style="background:${c};"
        onclick="app.selectPixelColor('${c}', this)"></button>
    `).join('');

    this.loadPixelPreset('heart');
  }

  selectPixelColor(hex, btn) {
    this.pixelColor = hex;
    document.querySelectorAll('#pixelColorBar .mini-color-dot').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.soundEngine.playColorNote(4);
  }

  loadPixelPreset(type, btnEl) {
    if (btnEl && btnEl.parentElement) {
      btnEl.parentElement.querySelectorAll('.mg-chip').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    const presets = {
      heart: [
        "............",
        "..RR....RR..",
        ".RRRR..RRRR.",
        "RRRRRRRRRRRR",
        "RRRRRRRRRRRR",
        "RRRRRRRRRRRR",
        ".RRRRRRRRRR.",
        "..RRRRRRRR..",
        "...RRRRRR...",
        "....RRRR....",
        ".....RR.....",
        "............"
      ],
      duck: [
        "............",
        "....YYYY....",
        "...YYYYYY...",
        "...YYKYYY...",
        "...YYYYYYOO.",
        "....YYYYY...",
        "..YYYYYYYY..",
        ".YYYYYYYYYY.",
        ".YYYYYYYYYY.",
        "..YYYYYYYY..",
        "....OO..OO..",
        "............"
      ],
      mushroom: [
        "............",
        "....RRRR....",
        "..RRRRRRRR..",
        ".RRWWRRRRWWR",
        ".RRWWRRRRWWR",
        ".RRRRRRRRRR.",
        "..WWWWWWWW..",
        "...WKWWKW...",
        "...WWWWWW...",
        "...WWWWWW...",
        "............",
        "............"
      ],
      boba: [
        "......BB....",
        "......BB....",
        "...BBBBBBBB.",
        "..OOOOOOOOOO",
        "..WWWWWWWWWW",
        "..OOOOOOOOOO",
        "..OOOOOOOOOO",
        "..OOKOKOOKOO",
        "..OKOKOKOKOO",
        "...KKKKKKKK.",
        "............",
        "............"
      ]
    };

    const mapColor = {
      R: '#FF3B30', Y: '#FFCC00', O: '#FF9500',
      W: '#FFFFFF', K: '#2C3E50', B: '#32ADE6', '.': '#FFFFFF'
    };

    const grid = document.getElementById('pixelGridBoard');
    grid.innerHTML = '';
    const rows = presets[type] || Array(12).fill('............');

    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const ch = rows[r][c] || '.';
        const cell = document.createElement('div');
        cell.className = 'pixel-cell';
        cell.style.backgroundColor = mapColor[ch] || '#FFFFFF';
        cell.addEventListener('pointerdown', () => {
          cell.style.backgroundColor = this.pixelColor;
          window.soundEngine.playColorNote((r + c) % 8);
        });
        grid.appendChild(cell);
      }
    }
  }

  savePixelToGallery() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 480;
    pCanvas.height = 480;
    const pCtx = pCanvas.getContext('2d');
    const cells = document.querySelectorAll('#pixelGridBoard .pixel-cell');
    cells.forEach((cell, idx) => {
      const r = Math.floor(idx / 12);
      const c = idx % 12;
      pCtx.fillStyle = cell.style.backgroundColor || '#FFFFFF';
      pCtx.fillRect(c * 40, r * 40, 40, 40);
      pCtx.strokeStyle = '#E2E8F0';
      pCtx.strokeRect(c * 40, r * 40, 40, 40);
    });

    this.galleryWorks.unshift({
      id: Date.now(),
      title: '12×12 像素拼豆創作',
      date: new Date().toLocaleDateString('zh-TW'),
      dataUrl: pCanvas.toDataURL('image/png')
    });
    this.renderGalleryWorks();
    this.addStars(15, '像素拼豆熨燙完成！已存入美術館！');
  }

  // --- 小遊戲 4：STEAM 色彩魔法調色實驗室 ---
  initMixerMiniGame() {
    this.mixerQuests = [
      { pair: ['red', 'yellow'], hex: '#FF9500', name: '🍊 活力橘色 (紅 + 黃)', icon: '🍊', monsterSay: '怪獸客人想喝「活力橘色」柳橙果昔！' },
      { pair: ['yellow', 'blue'], hex: '#34C759', name: '🍏 青蘋翠綠 (黃 + 藍)', icon: '🍏', monsterSay: '精靈客人想喝「青蘋翠綠」奇異果昔！' },
      { pair: ['red', 'blue'], hex: '#AF52DE', name: '🍇 葡萄亮紫 (紅 + 藍)', icon: '🍇', monsterSay: '怪獸客人想喝「葡萄亮紫」魔法果昔！' },
      { pair: ['red', 'white'], hex: '#FF9AA2', name: '🌸 櫻花粉紅 (紅 + 白)', icon: '🌸', monsterSay: '獨角獸想喝「櫻花粉紅」草莓牛奶！' },
      { pair: ['blue', 'white'], hex: '#32ADE6', name: '☁️ 晴空淺藍 (藍 + 白)', icon: '☁️', monsterSay: '雲朵精靈想喝「晴空淺藍」蘇打冰沙！' }
    ];
    this.mixerQuestIndex = 0;
    this.loadMixerQuest();
  }

  loadMixerQuest() {
    const q = this.mixerQuests[this.mixerQuestIndex % this.mixerQuests.length];
    this.mixerCurrentQuest = q;
    this.mixerPicked = [];
    document.getElementById('mixerQuestTitle').textContent = `色彩煉金術任務：${q.monsterSay}`;
    const targetCup = document.getElementById('mixerTargetCup');
    targetCup.style.background = q.hex;
    targetCup.textContent = q.icon;
    document.getElementById('mixerTargetName').textContent = q.name;
    this.resetMixerCup();
  }

  addMixerColor(id, label, hex) {
    if (this.mixerPicked.length >= 2) return;
    this.mixerPicked.push({ id, label, hex });
    window.soundEngine.playFillPop(this.mixerPicked.length * 2);

    const resCup = document.getElementById('mixerResultCup');
    if (this.mixerPicked.length === 1) {
      resCup.classList.remove('empty-cup');
      resCup.style.background = hex;
      resCup.textContent = '🥄';
      document.getElementById('mixerPickStatus').textContent = '已選 1 色，請再加 1 色';
      document.getElementById('mixerResultName').textContent = `已倒入：${label}`;
    } else if (this.mixerPicked.length === 2) {
      const ids = this.mixerPicked.map(p => p.id).sort().join('+');
      const targetIds = [...this.mixerCurrentQuest.pair].sort().join('+');

      if (ids === targetIds) {
        resCup.style.background = this.mixerCurrentQuest.hex;
        resCup.textContent = this.mixerCurrentQuest.icon;
        document.getElementById('mixerResultName').textContent = `🎉 調配成功：${this.mixerCurrentQuest.name}`;
        this.mixerSolved++;
        document.getElementById('mixerSolvedCount').textContent = this.mixerSolved;
        this.addStars(15, `調色大成功！原來這兩種顏色加在一起會變成${this.mixerCurrentQuest.name}！`);
        setTimeout(() => {
          this.mixerQuestIndex++;
          this.loadMixerQuest();
        }, 1800);
      } else {
        resCup.style.background = '#795548';
        resCup.textContent = '🫧';
        document.getElementById('mixerResultName').textContent = '咦？變成了神祕可可色，按「洗杯子」再試一次吧！';
        window.soundEngine.playGentleHint();
      }
    }
  }

  resetMixerCup() {
    this.mixerPicked = [];
    const resCup = document.getElementById('mixerResultCup');
    resCup.classList.add('empty-cup');
    resCup.style.background = '#E2E8F0';
    resCup.textContent = '❓';
    document.getElementById('mixerPickStatus').textContent = '請選 2 色';
    document.getElementById('mixerResultName').textContent = '尚未倒入顏料';
  }

  // --- 小遊戲 5：彩虹魔術刮刮畫尋寶 ---
  initScratchMiniGame() {
    this.initScratchCard(0);
    const sCanvas = document.getElementById('scratchOverlayCanvas');
    let scratching = false;

    const scratchAt = (e) => {
      const r = sCanvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((cx - r.left) / r.width) * sCanvas.width;
      const y = ((cy - r.top) / r.height) * sCanvas.height;

      const ctx = sCanvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.updateScratchProgress();
    };

    sCanvas.addEventListener('mousedown', (e) => { scratching = true; scratchAt(e); });
    sCanvas.addEventListener('mousemove', (e) => { if (scratching) scratchAt(e); });
    window.addEventListener('mouseup', () => { scratching = false; });

    sCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); scratching = true; scratchAt(e); }, { passive: false });
    sCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (scratching) scratchAt(e); }, { passive: false });
    window.addEventListener('touchend', () => { scratching = false; });
  }

  initScratchCard(presetIdx, btnEl) {
    if (btnEl && btnEl.parentElement) {
      btnEl.parentElement.querySelectorAll('.mg-chip').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    if (typeof presetIdx === 'number') this.scratchCurrentIdx = presetIdx;
    const tplIndices = [45, 9, 27];
    const tpl = window.TEMPLATES_DB[tplIndices[this.scratchCurrentIdx % tplIndices.length]];
    document.getElementById('scratchUnderlay').innerHTML = tpl.svg;

    const sCanvas = document.getElementById('scratchOverlayCanvas');
    const ctx = sCanvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, sCanvas.width, sCanvas.height);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ 用手指或畫筆刮開黑色魔法塗層 ✨', 210, 210);

    document.getElementById('scratchPercentText').textContent = '0%';
    document.getElementById('scratchProgressBar').style.width = '0%';
  }

  updateScratchProgress() {
    const sCanvas = document.getElementById('scratchOverlayCanvas');
    const ctx = sCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, sCanvas.width, sCanvas.height).data;
    let cleared = 0;
    const total = data.length / 4;
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] === 0) cleared++;
    }
    const pct = Math.min(100, Math.round((cleared / (total / 16)) * 100));
    document.getElementById('scratchPercentText').textContent = `${pct}%`;
    document.getElementById('scratchProgressBar').style.width = `${pct}%`;
  }

  revealAllScratch() {
    const sCanvas = document.getElementById('scratchOverlayCanvas');
    const ctx = sCanvas.getContext('2d');
    ctx.clearRect(0, 0, sCanvas.width, sCanvas.height);
    document.getElementById('scratchPercentText').textContent = '100%';
    document.getElementById('scratchProgressBar').style.width = '100%';
    this.addStars(10, '哇！彩虹刮刮畫的隱藏驚喜全部現身囉！');
  }

  // ==================== 分頁 5：全球最熱門十大兒童塗鴉 APP 總結渲染 ====================
  renderTop10Apps() {
    const grid = document.getElementById('top10CardsGrid');
    grid.innerHTML = window.TOP10_APPS_DATA.map(appItem => `
      <article class="app-review-card">
        <div class="app-rank-header">
          <span class="rank-badge">TOP ${appItem.rank}</span>
          <span class="app-origin">${appItem.origin}</span>
        </div>
        <h3 style="font-size:15px;font-weight:900;">${appItem.name}</h3>
        <small style="color:#6366F1;font-weight:800;">📊 ${appItem.downloads}</small>
        <div class="app-box-point pro"><strong>👍 核心強項：</strong>${appItem.coreStrengths}</div>
        <div class="app-box-point con"><strong>⚠️ 常見痛點：</strong>${appItem.painPoints}</div>
        <div class="app-box-point our"><strong>🚀 本系統如何超越：</strong>${appItem.ourUpgrade}</div>
      </article>
    `).join('');
  }

  // ==================== 榮譽獎狀彈窗與全螢幕煙火 ====================
  openCertificateModal() {
    document.getElementById('certStarsCount').textContent = this.stars;
    document.getElementById('certWorksCount').textContent = Math.max(1, this.galleryWorks.length);
    document.getElementById('certificateModal').classList.remove('hidden');
    this.fireConfetti();
    window.soundEngine.playFanfare();
    window.soundEngine.speak(`恭喜小小畢卡索榮獲皇家彩虹藝術學院榮譽獎狀！你已經累積獲得 ${this.stars} 顆彩虹星星，創造力滿分！`);
  }

  closeCertificateModal() {
    document.getElementById('certificateModal').classList.add('hidden');
  }

  fireConfetti() {
    const c = document.getElementById('confettiCanvas');
    const ctx = c.getContext('2d');
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const pieces = Array.from({ length: 65 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * 100,
      size: 7 + Math.random() * 7,
      vy: 3 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      color: ['#FF5E7E', '#FFBE0B', '#06D6A0', '#3A86FF', '#8338EC'][Math.floor(Math.random() * 5)]
    }));

    let frame = 0;
    const step = () => {
      frame++;
      ctx.clearRect(0, 0, c.width, c.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      if (frame < 90) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    requestAnimationFrame(step);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new RainbowArtApp();
  window.app.init();
});

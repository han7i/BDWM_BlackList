// ==UserScript==
// @name         未名BBS用户屏蔽
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  屏蔽指定用户的帖子，折叠为窄条并可展开
// @author       lkcmj
// @match        https://bbs.pku.edu.cn/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      GNU GPLv3
// ==/UserScript==

(function () {
  'use strict';

  // ── 默认名单（uid 列表） ──────────────────────────────────────────
  const DEFAULT_BLOCKED = [];

  function getBlockedList() {
    return GM_getValue('blockedUids', DEFAULT_BLOCKED);
  }

  function saveBlockedList(list) {
    GM_setValue('blockedUids', list);
  }

  // ── 名单管理 UI ───────────────────────────────────────────────────
  function openManagerUI() {
    // 防止重复打开
    if (document.getElementById('bdwm-block-manager')) return;

    const overlay = document.createElement('div');
    overlay.id = 'bdwm-block-manager';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #fff; border-radius: 8px; padding: 24px 28px;
      width: 380px; max-height: 80vh; display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,.25);
    `;

    const title = document.createElement('h3');
    title.textContent = '🚫 屏蔽用户名单';
    title.style.cssText = 'margin: 0 0 16px; font-size: 16px; color: #333;';

    const hint = document.createElement('p');
    hint.textContent = '每行填写一个 UID（纯数字）。保存后刷新页面生效。';
    hint.style.cssText = 'margin: 0 0 10px; font-size: 12px; color: #888;';

    const textarea = document.createElement('textarea');
    textarea.value = getBlockedList().join('\n');
    textarea.style.cssText = `
      flex: 1; min-height: 200px; resize: vertical; padding: 8px;
      border: 1px solid #ccc; border-radius: 4px;
      font-size: 13px; font-family: monospace; color: #222;
      outline: none; box-sizing: border-box; width: 100%;
    `;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;';

    const btnSave = document.createElement('button');
    btnSave.textContent = '💾 保存';
    btnSave.style.cssText = `
      padding: 7px 20px; background: #d63031; color: #fff;
      border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
    `;
    btnSave.onmouseenter = () => btnSave.style.background = '#b71c1c';
    btnSave.onmouseleave = () => btnSave.style.background = '#d63031';
    btnSave.onclick = () => {
      const uids = textarea.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => /^\d+$/.test(s));
      saveBlockedList(uids);
      alert(`已保存 ${uids.length} 个 UID。刷新页面后生效。`);
      document.body.removeChild(overlay);
    };

    const btnCancel = document.createElement('button');
    btnCancel.textContent = '取消';
    btnCancel.style.cssText = `
      padding: 7px 20px; background: #eee; color: #444;
      border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
    `;
    btnCancel.onmouseenter = () => btnCancel.style.background = '#ddd';
    btnCancel.onmouseleave = () => btnCancel.style.background = '#eee';
    btnCancel.onclick = () => document.body.removeChild(overlay);

    btnRow.append(btnCancel, btnSave);
    box.append(title, hint, textarea, btnRow);
    overlay.appendChild(box);

    // 点击遮罩关闭
    overlay.addEventListener('click', e => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    document.body.appendChild(overlay);
    textarea.focus();
  }

// GM_registerMenuCommand('管理屏蔽名单', openManagerUI);  // 备用

    function injectFloatButton() {
        const btn = document.createElement('button');
        btn.id = 'bdwm-manager-btn';
        btn.textContent = '🚫';
        btn.title = '管理屏蔽名单';
        btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99998;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #d63031;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
    transition: transform .15s, background .15s;
    line-height: 1;
  `;
        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.12)';
            btn.style.background = '#b71c1c';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.background = '#d63031';
        };
        btn.onclick = openManagerUI;
        document.body.appendChild(btn);
    }

  // ── 折叠逻辑 ─────────────────────────────────────────────────────
  const STYLE_ID = 'bdwm-block-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .bdwm-collapsed {
        height: 32px !important;
        overflow: hidden !important;
        opacity: .15;
        transition: opacity .15s;
        position: relative;
        cursor: default;
        background: repeating-linear-gradient(
          135deg,
          transparent,
          transparent 6px,
          rgba(0,0,0,.03) 6px,
          rgba(0,0,0,.03) 12px
        ) !important;
      }
      .bdwm-collapsed:hover { opacity: .75; }

      .bdwm-expand-btn {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        padding: 2px 14px;
        font-size: 11px;
        background: #fff;
        border: 1px solid #bbb;
        border-radius: 10px;
        cursor: pointer;
        white-space: nowrap;
        color: #555;
        z-index: 10;
        box-shadow: 0 1px 4px rgba(0,0,0,.12);
        transition: background .12s, color .12s;
      }
      .bdwm-expand-btn:hover {
        background: #d63031;
        color: #fff;
        border-color: #d63031;
      }
    `;
    document.head.appendChild(s);
  }

    function collapseCard(card, uid, username) {
        card.dataset.bdwmCollapsed = 'true';

        const inner = document.createElement('div');
        inner.className = 'bdwm-collapse-inner';

        while (card.firstChild) inner.appendChild(card.firstChild);
        card.appendChild(inner);

        // 动态计算 post-vote-container 距离 card 顶部的偏移
        const voteContainer = inner.querySelector('.post-vote-container');
        if (voteContainer) {
            const cardRect = card.getBoundingClientRect();
            const voteRect = voteContainer.getBoundingClientRect();
            const offset = voteRect.top - cardRect.top;
            inner.style.transform = `translateY(-${offset}px)`;
        }

        card.classList.add('bdwm-collapsed');

        const btn = document.createElement('button');
        btn.className = 'bdwm-expand-btn';
        btn.textContent = `👤 ${username || 'UID:' + uid}（已屏蔽）— 点击展开`;

        btn.addEventListener('click', e => {
            e.stopPropagation();
            card.classList.remove('bdwm-collapsed');
            card.dataset.bdwmCollapsed = 'false';
            inner.style.transform = '';
            btn.remove();
        });

        card.style.position = 'relative';
        card.appendChild(btn);
    }

  function processCards() {
    const blockedUids = getBlockedList();
    if (!blockedUids.length) return;

    const blockedSet = new Set(blockedUids.map(String));

    // CSS 路径：div.post-card
    const cards = document.querySelectorAll(
      'div#page-content div#page-post div#post-read.post-body div.card-list div.post-card'
    );

    cards.forEach(card => {
      // 已处理过则跳过
      if (card.dataset.bdwmCollapsed !== undefined) return;

      // 找到 <a href="user.php?uid=XXXX">
      const ownerLink = card.querySelector('a[href^="user.php?uid="]');
      if (!ownerLink) return;

      const match = ownerLink.getAttribute('href').match(/uid=(\d+)/);
      if (!match) return;

      const uid = match[1];
      if (!blockedSet.has(uid)) return;

      // 取用户名（优先取 .username a 文本）
      const usernameEl = card.querySelector('.username a') || ownerLink;
      const username = usernameEl.textContent.trim();

      collapseCard(card, uid, username);
    });
  }

  // ── 主入口 ────────────────────────────────────────────────────────
  function init() {
    injectStyle();
    processCards();
    injectFloatButton();

    // 修复：直接监听 document.body，应对异步渲染和 SPA 页面跳转
    // 只要页面 DOM 发生变化，就尝试执行 processCards
    // processCards 内部已有 dataset 判断，不会重复渲染
    const observer = new MutationObserver(() => processCards());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
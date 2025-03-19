// ==UserScript==
// @name         星月写作
// @namespace    http://tampermonkey.net/
// @version      2025-03-19
// @description  try to take over the world!
// @author       You
// @match        https://xingyuexiezuo.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=n.cn
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        KEY: CryptoJS.enc.Utf8.parse("chloefuckityoall"),
        IV: CryptoJS.enc.Utf8.parse("9311019310287172"),
        API_PATTERNS: [/\/api\//]
    };
    // 初始化拦截器
    initInterceptor();

    // 在initInterceptor后添加
    createDebuggerUI();

    function createDebuggerUI() {
        // 容器样式
        const style = document.createElement('style');
        style.textContent = `
        .xhr-debugger {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .toggle-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #4f46e5;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            transition: transform 0.2s;
        }
        .toggle-btn:hover { transform: scale(1.1) }
        .data-panel {
            width: 480px;
            max-height: 70vh;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            padding: 16px;
            display: none;
            margin-top: 12px;
            overflow: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        .data-item {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .action-bar {
            position: sticky;
            top: 0;
            background: linear-gradient(90deg, #f8fafc 0%, rgba(255,255,255,0.95) 100%);
            padding: 8px 0;
            z-index: 1;
            backdrop-filter: blur(4px);
        }

        .clear-btn {
            border: none;
            background: #ef444410;
            color: #ef4444;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.2s;
            float: right;
            margin: -4px 0 12px 0;
        }

        .clear-btn:hover {
            background: #ef4444;
            color: white;
            box-shadow: 0 2px 8px rgba(239,68,68,0.2);
        }

        .data-list {
            clear: both;
        }
    `;
        document.head.appendChild(style);

        // DOM结构
        const container = document.createElement('div');
        container.className = 'xhr-debugger';
        container.innerHTML = `
        <div class="toggle-btn">📡</div>
        <div class="data-panel">
            <div class="action-bar">
                <button class="clear-btn">🗑️ 清空记录</button>
            </div>
            <div class="data-list"></div>
        </div>
        `;

        document.body.appendChild(container);

        // 交互逻辑
        let isOpen = false;
        container.querySelector('.toggle-btn').addEventListener('click', () => {
            isOpen = !isOpen;
            container.querySelector('.data-panel').style.display = isOpen ? 'block' : 'none';
        });
        // 在交互逻辑部分新增
        container.querySelector('.data-panel').addEventListener('click', (e) => {
            if (e.target.closest('.clear-btn')) {
                if (confirm('确认清除所有调试记录？')) {
                    DATA_STORE.records = [];
                    DATA_STORE.updatePanel();
                }
            }
        });
    }

    const DATA_STORE = {
        records: [],
        maxRecords: 50,
        addRecord(responseData) {
            this.records.unshift({
                id: performance.now().toString(36),
                timestamp: new Date().toLocaleTimeString(),
                url: responseData.url,
                data: responseData.data
            });
            if (this.records.length > this.maxRecords) {
                this.records.pop();
            }
            this.updatePanel();
        },
        updatePanel() {
            const panel = document.querySelector('.data-list');
            panel.innerHTML = this.records.map(item => `
            <div class="data-item">
                <div style="color:#666;font-size:0.9em">[${item.timestamp}] [${item.url}]</div>
                <pre style="white-space:pre-wrap">${JSON.stringify(item.data, null, 2)}</pre>
            </div>
        `).join('');
        }
    };

    function initInterceptor() {
        const nativeXHROpen = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open = function () {
            this._requestURL = arguments[1];
            const isTargetAPI = CONFIG.API_PATTERNS.some(p => p.test(this._requestURL));
            // console.log(this._requestURL)
            // console.log(isTargetAPI)
            if (isTargetAPI) {
                this.addEventListener('readystatechange', () => {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            console.log('[捕获数据]', this.responseText);
                            const response = JSON.parse(this.responseText);
                            if (response.code == 200) {
                                const decrypted = CryptoJS.AES.decrypt(response.data.encoded, CONFIG.KEY, {
                                    iv: CONFIG.IV,
                                    mode: CryptoJS.mode.CBC,
                                    padding: CryptoJS.pad.Pkcs7
                                }).toString(CryptoJS.enc.Utf8);
                                console.log('[解密数据]', decrypted);
                                DATA_STORE.addRecord({ url: this._requestURL, data: JSON.parse(decrypted) });
                            }
                        } catch (e) {
                            console.error('[解析失败]', e);
                        }
                    }
                });
            }
            return nativeXHROpen.apply(this, arguments);
        };
    }



})();
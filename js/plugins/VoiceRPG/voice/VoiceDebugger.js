/**
 * VoiceDebugger.js - 语音调试工具
 * 
 * 功能说明：
 * 1. 可视化调试面板
 * 2. 实时状态显示
 * 3. 命令历史记录
 * 4. 性能监控
 * 
 * @author 不想做工-接桀桀
 * @version 1.0.0
 */

class VoiceDebugger {
    constructor(options = {}) {
        this.options = {
            position: 'top-right',
            width: 280,
            maxHistory: 20,
            showStats: true,
            showWaveform: false,
            theme: 'dark',
            ...options
        };
        
        this.debugUI = null;
        this.isVisible = false;
        this.history = [];
        this.stats = {
            startTime: Date.now(),
            commandCount: 0,
            errorCount: 0,
            successRate: 0
        };
        
        this.createDebugUI();
    }
    
    /**
     * 创建调试UI
     */
    createDebugUI() {
        this.debugUI = document.createElement('div');
        this.debugUI.id = 'voice-debugger';
        this.debugUI.className = `voice-debugger theme-${this.options.theme}`;
        
        // 设置样式
        this.applyStyles();
        
        // 创建内容
        this.debugUI.innerHTML = this.generateHTML();
        
        // 添加到页面
        document.body.appendChild(this.debugUI);
        
        // 绑定事件
        this.bindEvents();
        
        // 默认隐藏
        this.hide();
    }
    
    /**
     * 应用样式
     * @private
     */
    applyStyles() {
        const positions = {
            'top-left': { top: '10px', left: '10px', right: 'auto', bottom: 'auto' },
            'top-right': { top: '10px', right: '10px', left: 'auto', bottom: 'auto' },
            'bottom-left': { bottom: '10px', left: '10px', top: 'auto', right: 'auto' },
            'bottom-right': { bottom: '10px', right: '10px', top: 'auto', left: 'auto' }
        };
        
        const pos = positions[this.options.position] || positions['top-right'];
        
        this.debugUI.style.cssText = `
            position: fixed;
            ${Object.entries(pos).map(([k, v]) => `${k}: ${v}`).join('; ')};
            width: ${this.options.width}px;
            max-height: 600px;
            background: ${this.options.theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
            color: ${this.options.theme === 'dark' ? '#fff' : '#333'};
            border: 2px solid ${this.options.theme === 'dark' ? '#4CAF50' : '#2196F3'};
            border-radius: 8px;
            padding: 0;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            transition: all 0.3s ease;
        `;
    }
    
    /**
     * 生成HTML内容
     * @private
     */
    generateHTML() {
        return `
            <!-- 标题栏 -->
            <div class="vd-header" style="
                background: ${this.options.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
                padding: 10px 15px;
                border-bottom: 1px solid ${this.options.theme === 'dark' ? '#333' : '#ddd'};
                cursor: move;
                user-select: none;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 14px; color: #4CAF50;">
                        🎤 语音调试器
                    </h3>
                    <div>
                        <button class="vd-btn vd-minimize" style="
                            background: none;
                            border: none;
                            color: inherit;
                            cursor: pointer;
                            padding: 4px 8px;
                            margin-left: 5px;
                        ">_</button>
                        <button class="vd-btn vd-close" style="
                            background: none;
                            border: none;
                            color: #f44336;
                            cursor: pointer;
                            padding: 4px 8px;
                        ">✕</button>
                    </div>
                </div>
            </div>
            
            <!-- 内容区域 -->
            <div class="vd-content" style="padding: 15px; max-height: 500px; overflow-y: auto;">
                <!-- 状态信息 -->
                <div class="vd-section vd-status" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 12px; opacity: 0.8;">状态</h4>
                    <div class="vd-status-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 10px;
                        border-radius: 4px;
                    ">
                        <div class="vd-status-item">
                            <span style="opacity: 0.7;">服务状态:</span>
                            <span class="vd-service-status" style="color: #4CAF50; font-weight: bold;">未连接</span>
                        </div>
                        <div class="vd-status-item" style="margin-top: 5px;">
                            <span style="opacity: 0.7;">识别状态:</span>
                            <span class="vd-recognition-status" style="color: #ff9800;">空闲</span>
                        </div>
                        <div class="vd-status-item" style="margin-top: 5px;">
                            <span style="opacity: 0.7;">当前上下文:</span>
                            <span class="vd-context" style="color: #2196F3;">game</span>
                        </div>
                    </div>
                </div>
                
                <!-- 实时识别结果 -->
                <div class="vd-section vd-realtime" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 12px; opacity: 0.8;">实时识别</h4>
                    <div class="vd-realtime-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 10px;
                        border-radius: 4px;
                        min-height: 40px;
                    ">
                        <div class="vd-partial-result" style="color: #999; font-style: italic;">
                            等待语音输入...
                        </div>
                        <div class="vd-final-result" style="color: #4CAF50; font-weight: bold; margin-top: 5px;">
                            
                        </div>
                    </div>
                </div>
                
                <!-- 命令历史 -->
                <div class="vd-section vd-history" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 12px; opacity: 0.8;">
                        命令历史 
                        <button class="vd-clear-history" style="
                            float: right;
                            background: none;
                            border: 1px solid;
                            border-radius: 3px;
                            padding: 2px 8px;
                            font-size: 10px;
                            cursor: pointer;
                            opacity: 0.7;
                        ">清空</button>
                    </h4>
                    <div class="vd-history-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 10px;
                        border-radius: 4px;
                        max-height: 150px;
                        overflow-y: auto;
                    ">
                        <div class="vd-history-list" style="font-size: 11px;">
                            <div style="opacity: 0.5;">暂无命令记录</div>
                        </div>
                    </div>
                </div>
                
                <!-- 统计信息 -->
                ${this.options.showStats ? `
                <div class="vd-section vd-stats" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 12px; opacity: 0.8;">统计</h4>
                    <div class="vd-stats-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 10px;
                        border-radius: 4px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    ">
                        <div>
                            <div style="opacity: 0.7; font-size: 10px;">总命令数</div>
                            <div class="vd-stat-commands" style="font-size: 16px; font-weight: bold;">0</div>
                        </div>
                        <div>
                            <div style="opacity: 0.7; font-size: 10px;">成功率</div>
                            <div class="vd-stat-success" style="font-size: 16px; font-weight: bold; color: #4CAF50;">0%</div>
                        </div>
                        <div>
                            <div style="opacity: 0.7; font-size: 10px;">错误数</div>
                            <div class="vd-stat-errors" style="font-size: 16px; font-weight: bold; color: #f44336;">0</div>
                        </div>
                        <div>
                            <div style="opacity: 0.7; font-size: 10px;">运行时间</div>
                            <div class="vd-stat-uptime" style="font-size: 16px; font-weight: bold;">00:00</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 控制按钮 -->
                <div class="vd-section vd-controls" style="text-align: center;">
                    <button class="vd-control-toggle" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        margin: 0 5px;
                    ">开始识别</button>
                    <button class="vd-control-config" style="
                        background: #2196F3;
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        margin: 0 5px;
                    ">配置</button>
                </div>
            </div>
            
            <!-- 提示信息 -->
            <div class="vd-footer" style="
                background: ${this.options.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
                padding: 8px 15px;
                border-top: 1px solid ${this.options.theme === 'dark' ? '#333' : '#ddd'};
                font-size: 11px;
                opacity: 0.7;
                text-align: center;
            ">
                按 Tab 键显示/隐藏调试器
            </div>
        `;
    }
    
    /**
     * 绑定事件
     * @private
     */
    bindEvents() {
        // 关闭按钮
        this.debugUI.querySelector('.vd-close').addEventListener('click', () => {
            this.hide();
        });
        
        // 最小化按钮
        this.debugUI.querySelector('.vd-minimize').addEventListener('click', () => {
            this.minimize();
        });
        
        // 清空历史
        this.debugUI.querySelector('.vd-clear-history').addEventListener('click', () => {
            this.clearHistory();
        });
        
        // 控制按钮
        this.debugUI.querySelector('.vd-control-toggle').addEventListener('click', () => {
            this.onControlToggle();
        });
        
        this.debugUI.querySelector('.vd-control-config').addEventListener('click', () => {
            this.onControlConfig();
        });
        
        // 拖拽功能
        this.enableDragging();
        
        // 更新定时器
        this.startUpdateTimer();
    }
    
    /**
     * 启用拖拽
     * @private
     */
    enableDragging() {
        const header = this.debugUI.querySelector('.vd-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.debugUI.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.debugUI.style.left = `${initialX + deltaX}px`;
            this.debugUI.style.top = `${initialY + deltaY}px`;
            this.debugUI.style.right = 'auto';
            this.debugUI.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.userSelect = '';
        });
    }
    
    /**
     * 显示调试器
     */
    show() {
        this.debugUI.style.display = 'block';
        this.isVisible = true;
    }
    
    /**
     * 隐藏调试器
     */
    hide() {
        this.debugUI.style.display = 'none';
        this.isVisible = false;
    }
    
    /**
     * 切换显示/隐藏
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * 最小化
     */
    minimize() {
        const content = this.debugUI.querySelector('.vd-content');
        const footer = this.debugUI.querySelector('.vd-footer');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            footer.style.display = 'block';
        } else {
            content.style.display = 'none';
            footer.style.display = 'none';
        }
    }
    
    /**
     * 更新部分识别结果
     */
    updatePartialResult(text) {
        const el = this.debugUI.querySelector('.vd-partial-result');
        if (el) {
            el.textContent = text || '等待语音输入...';
        }
    }
    
    /**
     * 更新最终识别结果
     */
    updateFinalResult(text, command = null) {
        const el = this.debugUI.querySelector('.vd-final-result');
        if (el) {
            if (command) {
                el.innerHTML = `<span style="color: #4CAF50;">${text}</span> → <span style="color: #FFD700;">${command}</span>`;
            } else {
                el.textContent = text;
            }
        }
        
        // 添加到历史
        if (text) {
            this.addToHistory(text, command);
        }
    }
    
    /**
     * 添加到历史记录
     */
    addToHistory(text, command = null) {
        const timestamp = new Date().toLocaleTimeString();
        
        this.history.unshift({
            text: text,
            command: command,
            timestamp: timestamp,
            success: !!command
        });
        
        // 限制历史记录数量
        if (this.history.length > this.options.maxHistory) {
            this.history.pop();
        }
        
        // 更新显示
        this.updateHistoryDisplay();
        
        // 更新统计
        this.stats.commandCount++;
        if (command) {
            this.stats.successRate = 
                ((this.stats.commandCount - this.stats.errorCount) / this.stats.commandCount * 100).toFixed(1);
        } else {
            this.stats.errorCount++;
        }
        
        this.updateStats();
    }
    
    /**
     * 更新历史显示
     * @private
     */
    updateHistoryDisplay() {
        const listEl = this.debugUI.querySelector('.vd-history-list');
        if (!listEl) return;
        
        if (this.history.length === 0) {
            listEl.innerHTML = '<div style="opacity: 0.5;">暂无命令记录</div>';
            return;
        }
        
        listEl.innerHTML = this.history.map(item => `
            <div style="
                padding: 5px 0;
                border-bottom: 1px solid ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="flex: 1; ${!item.success ? 'opacity: 0.5; text-decoration: line-through;' : ''}">
                        ${item.text}
                    </span>
                    <span style="font-size: 10px; opacity: 0.5; margin-left: 10px;">
                        ${item.timestamp}
                    </span>
                </div>
                ${item.command ? `
                    <div style="font-size: 10px; color: #FFD700; margin-top: 2px;">
                        → ${item.command}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
        this.updateHistoryDisplay();
    }
    
    /**
     * 重置所有状态（新增 - 供外部调用）
     */
    reset() {
        console.log('[VoiceDebugger] 重置状态');
        
        // 清空历史
        this.history = [];
        this.updateHistoryDisplay();
        
        // 清空实时显示
        const partialEl = this.debugUI.querySelector('.vd-partial-result');
        if (partialEl) {
            partialEl.textContent = '等待语音输入...';
        }
        
        const finalEl = this.debugUI.querySelector('.vd-final-result');
        if (finalEl) {
            finalEl.textContent = '';
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        if (!this.options.showStats) return;
        
        // 命令数
        const commandsEl = this.debugUI.querySelector('.vd-stat-commands');
        if (commandsEl) commandsEl.textContent = this.stats.commandCount;
        
        // 成功率
        const successEl = this.debugUI.querySelector('.vd-stat-success');
        if (successEl) successEl.textContent = this.stats.successRate + '%';
        
        // 错误数
        const errorsEl = this.debugUI.querySelector('.vd-stat-errors');
        if (errorsEl) errorsEl.textContent = this.stats.errorCount;
    }
    
    /**
     * 更新运行时间
     * @private
     */
    updateUptime() {
        const uptimeEl = this.debugUI.querySelector('.vd-stat-uptime');
        if (!uptimeEl) return;
        
        const elapsed = Date.now() - this.stats.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        uptimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * 启动更新定时器
     * @private
     */
    startUpdateTimer() {
        // 每秒更新运行时间
        setInterval(() => {
            if (this.isVisible && this.options.showStats) {
                this.updateUptime();
            }
        }, 1000);
    }
    
    /**
     * 设置控制按钮状态
     */
    setControlButtonState(isActive) {
        const btn = this.debugUI.querySelector('.vd-control-toggle');
        if (btn) {
            btn.textContent = isActive ? '停止识别' : '开始识别';
            btn.style.background = isActive ? '#f44336' : '#4CAF50';
        }
    }
    
    /**
     * 控制按钮点击回调
     */
    onControlToggle() {
        // 由外部处理
        if (this.controlToggleCallback) {
            this.controlToggleCallback();
        }
    }
    
    /**
     * 配置按钮点击回调
     */
    onControlConfig() {
        // 由外部处理
        if (this.controlConfigCallback) {
            this.controlConfigCallback();
        }
    }
    
    /**
     * 设置回调函数
     */
    setControlCallbacks(toggleCallback, configCallback) {
        this.controlToggleCallback = toggleCallback;
        this.controlConfigCallback = configCallback;
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        const el = this.debugUI.querySelector('.vd-final-result');
        if (el) {
            el.innerHTML = `<span style="color: #f44336;">错误: ${message}</span>`;
        }
        
        this.stats.errorCount++;
        this.updateStats();
    }
    
    /**
     * 更新服务状态
     */
    updateServiceStatus(status, color = null) {
        const el = this.debugUI.querySelector('.vd-service-status');
        if (el) {
            el.textContent = status;
            if (color) el.style.color = color;
        }
    }
    
    /**
     * 更新识别状态
     */
    updateRecognitionStatus(status, color = null) {
        const el = this.debugUI.querySelector('.vd-recognition-status');
        if (el) {
            el.textContent = status;
            if (color) el.style.color = color;
        }
    }
    
    /**
     * 更新上下文
     */
    updateContext(context) {
        const el = this.debugUI.querySelector('.vd-context');
        if (el) {
            el.textContent = context;
        }
    }
    
    /**
     * 销毁调试器
     */
    destroy() {
        if (this.debugUI) {
            this.debugUI.remove();
            this.debugUI = null;
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceDebugger;
} else {
    window.VoiceDebugger = VoiceDebugger;
}
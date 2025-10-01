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
            successRate: 0,
            lastRecognitionTime: 0,
            averageDelay: 0,
            delayHistory: [],
            // 新增延迟和丢包统计
            totalRecognitions: 0,
            failedRecognitions: 0,
            packetLossRate: 0,
            maxDelay: 0,
            minDelay: Infinity,
            currentDelay: 0,
            delayTrend: 'stable', // 'improving', 'stable', 'degrading'
            lastDelayUpdate: 0,
            // 实时检测相关
            realtimeDelay: 0,
            delayUpdateInterval: null,
            maxValidDelay: 2000, // 最大有效延迟（2秒）
            minValidDelay: 10,   // 最小有效延迟（10ms）
            smoothingFactor: 0.1 // 平滑因子
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
            max-height: 500px;
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
            pointer-events: auto;
            user-select: text;
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
            <div class="vd-content" style="padding: 10px; max-height: 420px; overflow-y: auto;">
                <!-- 状态信息 -->
                <div class="vd-section vd-status" style="margin-bottom: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 11px; opacity: 0.8;">状态</h4>
                    <div class="vd-status-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 6px;
                        border-radius: 4px;
                    ">
                        <div class="vd-status-item">
                            <span style="opacity: 0.7;">服务状态:</span>
                            <span class="vd-service-status" style="color: #4CAF50; font-weight: bold;">未连接</span>
                        </div>
                        <div class="vd-status-item" style="margin-top: 3px;">
                            <span style="opacity: 0.7;">识别状态:</span>
                            <span class="vd-recognition-status" style="color: #ff9800;">空闲</span>
                        </div>
                        <div class="vd-status-item" style="margin-top: 3px;">
                            <span style="opacity: 0.7;">当前上下文:</span>
                            <span class="vd-context" style="color: #2196F3;">game</span>
                        </div>
                    </div>
                </div>
                
                <!-- 实时识别结果 -->
                <div class="vd-section vd-realtime" style="margin-bottom: 8px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 11px; opacity: 0.8;">实时识别</h4>
                    <div class="vd-realtime-content" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                        padding: 6px;
                        border-radius: 4px;
                        min-height: 30px;
                    ">
                        <div class="vd-partial-result" style="color: #999; font-style: italic;">
                            等待语音输入...
                        </div>
                        <div class="vd-final-result" style="color: #4CAF50; font-weight: bold; margin-top: 5px;">
                            
                        </div>
                    </div>
                </div>
                
                <!-- 命令历史已删除，让其他功能更显眼 -->
                
                <!-- 统计信息 - 优化布局 -->
                ${this.options.showStats ? `
                <div class="vd-section vd-stats" style="margin-bottom: 8px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.9; color: #4CAF50;">性能监控</h4>
                    
                    <!-- 主要延迟信息 -->
                    <div class="vd-main-stats" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)'};
                        padding: 8px;
                        border-radius: 4px;
                        margin-bottom: 6px;
                        border: 1px solid ${this.options.theme === 'dark' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'};
                    ">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 6px;">
                            <div style="text-align: center;">
                                <div style="opacity: 0.8; font-size: 10px; margin-bottom: 3px;">当前延迟</div>
                                <div class="vd-stat-current-delay" style="font-size: 18px; font-weight: bold; color: #FF9800;">0ms</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="opacity: 0.8; font-size: 10px; margin-bottom: 3px;">平均延迟</div>
                                <div class="vd-stat-delay" style="font-size: 18px; font-weight: bold; color: #4CAF50;">0ms</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                            <div style="text-align: center;">
                                <div style="opacity: 0.7; font-size: 9px;">丢包率</div>
                                <div class="vd-stat-packet-loss" style="font-size: 12px; font-weight: bold; color: #4CAF50;">0%</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="opacity: 0.7; font-size: 9px;">趋势</div>
                                <div class="vd-stat-delay-trend" style="font-size: 12px; font-weight: bold; color: #4CAF50;">稳定</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="opacity: 0.7; font-size: 9px;">运行时间</div>
                                <div class="vd-stat-uptime" style="font-size: 12px; font-weight: bold;">00:00</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 次要统计信息 -->
                    <div class="vd-secondary-stats" style="
                        background: ${this.options.theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
                        padding: 6px;
                        border-radius: 4px;
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 6px;
                        font-size: 10px;
                    ">
                        <div style="text-align: center;">
                            <div style="opacity: 0.7; font-size: 9px;">命令数</div>
                            <div class="vd-stat-commands" style="font-size: 11px; font-weight: bold;">0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="opacity: 0.7; font-size: 9px;">成功率</div>
                            <div class="vd-stat-success" style="font-size: 11px; font-weight: bold;">0%</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="opacity: 0.7; font-size: 9px;">最大延迟</div>
                            <div class="vd-stat-max-delay" style="font-size: 11px; font-weight: bold; color: #FF9800;">0ms</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 控制按钮 - 三排布局 -->
                <div class="vd-section vd-controls" style="text-align: center; margin-top: 8px;">
                    <button class="vd-control-toggle" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 6px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        width: 100%;
                        margin-bottom: 4px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">开始识别</button>
                    
                    <button class="vd-control-config" style="
                        background: #2196F3;
                        color: white;
                        border: none;
                        padding: 6px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        width: 100%;
                        margin-bottom: 4px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#1976D2'" onmouseout="this.style.background='#2196F3'">配置</button>
                    
                    <button class="vd-control-cleanup" style="
                        background: #FF9800;
                        color: white;
                        border: none;
                        padding: 6px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        width: 100%;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#F57C00'" onmouseout="this.style.background='#FF9800'">清理语音垃圾</button>
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
        // 清空历史按钮已删除，无需绑定事件
        
        // 控制按钮
        this.debugUI.querySelector('.vd-control-toggle').addEventListener('click', () => {
            this.onControlToggle();
        });
        
        this.debugUI.querySelector('.vd-control-config').addEventListener('click', () => {
            this.onControlConfig();
        });
        
        // 清理语音垃圾按钮
        this.debugUI.querySelector('.vd-control-cleanup').addEventListener('click', () => {
            this.onControlCleanup();
        });
        
        // 拖拽功能
        this.enableDragging();
        
        // 防止点击穿透
        this.preventClickThrough();
        
        // 更新定时器
        this.startUpdateTimer();
        
        // 启动实时延迟检测
        this.startRealtimeDelayDetection();
        
        // 启动网络状态检查
        this.startNetworkStatusCheck();
    }
    
    /**
     * 防止点击穿透并保持游戏活跃状态
     * @private
     */
    preventClickThrough() {
        // 阻止所有点击事件冒泡
        this.debugUI.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // 保持游戏活跃状态
            if (window.$voiceRPG && window.$voiceRPG.keepGameActive) {
                window.$voiceRPG.keepGameActive();
            }
            
            // 如果游戏有焦点管理，确保游戏保持焦点
            if (window.focus && typeof window.focus === 'function') {
                window.focus();
            }
        });
        
        // 阻止鼠标事件冒泡
        this.debugUI.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        this.debugUI.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
        
        // 阻止键盘事件冒泡
        this.debugUI.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        
        this.debugUI.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });
        
        // 阻止触摸事件冒泡（移动设备）
        this.debugUI.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
        
        this.debugUI.addEventListener('touchend', (e) => {
            e.stopPropagation();
        });
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
        
        // 更新延迟统计
        this.updateDelayStats();
    }
    
    /**
     * 更新延迟统计（优化版）
     */
    updateDelayStats() {
        const now = Date.now();
        const currentDelay = now - this.stats.lastRecognitionTime;
        
        // 更新当前延迟
        this.stats.lastRecognitionTime = now;
        
        // 过滤异常值
        if (currentDelay > this.stats.maxValidDelay || currentDelay < this.stats.minValidDelay) {
            console.log(`[VoiceDebugger] 过滤异常延迟值: ${currentDelay}ms`);
            return;
        }
        
        this.stats.currentDelay = currentDelay;
        
        // 更新总识别次数
        this.stats.totalRecognitions++;
        
        // 添加到延迟历史
        this.stats.delayHistory.push(currentDelay);
        
        // 保持历史记录在合理范围内（最近50次，减少内存使用）
        if (this.stats.delayHistory.length > 50) {
            this.stats.delayHistory.shift();
        }
        
        // 计算统计信息
        this.calculateDelayStats();
        
        // 检测延迟蹦极
        this.detectDelayJump();
        
        // 更新显示
        this.updateDelayDisplay();
    }
    
    /**
     * 计算延迟统计信息
     */
    calculateDelayStats() {
        if (this.stats.delayHistory.length === 0) return;
        
        // 计算平均延迟
        const totalDelay = this.stats.delayHistory.reduce((sum, delay) => sum + delay, 0);
        this.stats.averageDelay = Math.round(totalDelay / this.stats.delayHistory.length);
        
        // 计算最大和最小延迟
        this.stats.maxDelay = Math.max(...this.stats.delayHistory);
        this.stats.minDelay = Math.min(...this.stats.delayHistory);
        
        // 计算丢包率（基于延迟异常高的情况）
        if (this.stats.delayHistory.length > 0) {
            // 使用更智能的阈值计算
            const sortedDelays = [...this.stats.delayHistory].sort((a, b) => a - b);
            const medianDelay = sortedDelays[Math.floor(sortedDelays.length / 2)];
            const thresholdDelay = Math.max(medianDelay * 2, 500); // 中位数的2倍或500ms，取较大值
            
            const packetLossCount = this.stats.delayHistory.filter(delay => delay > thresholdDelay).length;
            this.stats.packetLossRate = Math.round((packetLossCount / this.stats.delayHistory.length) * 100);
        } else {
            this.stats.packetLossRate = 0;
        }
        
        // 计算延迟趋势
        this.calculateDelayTrend();
    }
    
    /**
     * 计算延迟趋势
     */
    calculateDelayTrend() {
        if (this.stats.delayHistory.length < 10) {
            this.stats.delayTrend = 'stable';
            return;
        }
        
        // 取最近10次和之前10次的平均值比较
        const recent = this.stats.delayHistory.slice(-10);
        const previous = this.stats.delayHistory.slice(-20, -10);
        
        if (previous.length === 0) {
            this.stats.delayTrend = 'stable';
            return;
        }
        
        const recentAvg = recent.reduce((sum, delay) => sum + delay, 0) / recent.length;
        const previousAvg = previous.reduce((sum, delay) => sum + delay, 0) / previous.length;
        
        const improvement = (previousAvg - recentAvg) / previousAvg;
        
        if (improvement > 0.1) {
            this.stats.delayTrend = 'improving';
        } else if (improvement < -0.1) {
            this.stats.delayTrend = 'degrading';
        } else {
            this.stats.delayTrend = 'stable';
        }
    }
    
    /**
     * 更新延迟显示（优化版）
     */
    updateDelayDisplay() {
        const stats = this.stats;
        
        // 更新当前延迟
        const currentDelayEl = this.debugUI.querySelector('.vd-stat-current-delay');
        if (currentDelayEl) {
            currentDelayEl.textContent = `${stats.currentDelay}ms`;
            
            // 根据延迟设置颜色
            if (stats.currentDelay < 100) {
                currentDelayEl.style.color = '#4CAF50'; // 绿色 - 很好
            } else if (stats.currentDelay < 300) {
                currentDelayEl.style.color = '#FF9800'; // 橙色 - 一般
            } else {
                currentDelayEl.style.color = '#f44336'; // 红色 - 较差
            }
        }
        
        // 更新平均延迟
        const averageDelayEl = this.debugUI.querySelector('.vd-stat-delay');
        if (averageDelayEl) {
            averageDelayEl.textContent = `${stats.averageDelay}ms`;
            
            // 根据平均延迟设置颜色
            if (stats.averageDelay < 150) {
                averageDelayEl.style.color = '#4CAF50'; // 绿色 - 很好
            } else if (stats.averageDelay < 400) {
                averageDelayEl.style.color = '#FF9800'; // 橙色 - 一般
            } else {
                averageDelayEl.style.color = '#f44336'; // 红色 - 较差
            }
        }
        
        // 更新丢包率
        const packetLossEl = this.debugUI.querySelector('.vd-stat-packet-loss');
        if (packetLossEl) {
            packetLossEl.textContent = `${stats.packetLossRate}%`;
            
            // 根据丢包率设置颜色
            if (stats.packetLossRate < 5) {
                packetLossEl.style.color = '#4CAF50'; // 绿色 - 很好
            } else if (stats.packetLossRate < 15) {
                packetLossEl.style.color = '#FF9800'; // 橙色 - 一般
            } else {
                packetLossEl.style.color = '#f44336'; // 红色 - 较差
            }
        }
        
        // 更新延迟趋势
        const trendEl = this.debugUI.querySelector('.vd-stat-delay-trend');
        if (trendEl) {
            let trendText = '';
            let trendColor = '#4CAF50';
            
            switch (stats.delayTrend) {
                case 'improving':
                    trendText = '改善';
                    trendColor = '#4CAF50';
                    break;
                case 'degrading':
                    trendText = '恶化';
                    trendColor = '#f44336';
                    break;
                default:
                    trendText = '稳定';
                    trendColor = '#FF9800';
                    break;
            }
            
            trendEl.textContent = trendText;
            trendEl.style.color = trendColor;
        }
        
        // 更新最大延迟
        const maxDelayEl = this.debugUI.querySelector('.vd-stat-max-delay');
        if (maxDelayEl) {
            maxDelayEl.textContent = `${stats.maxDelay}ms`;
            
            // 根据最大延迟设置颜色
            if (stats.maxDelay < 500) {
                maxDelayEl.style.color = '#4CAF50'; // 绿色 - 很好
            } else if (stats.maxDelay < 1000) {
                maxDelayEl.style.color = '#FF9800'; // 橙色 - 一般
            } else {
                maxDelayEl.style.color = '#f44336'; // 红色 - 较差
            }
        }
        
        // 更新最小延迟
        const minDelayEl = this.debugUI.querySelector('.vd-stat-min-delay');
        if (minDelayEl) {
            minDelayEl.textContent = `${stats.minDelay === Infinity ? 0 : stats.minDelay}ms`;
            minDelayEl.style.color = '#4CAF50'; // 最小延迟总是绿色
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
     * 启动实时延迟检测
     * @private
     */
    startRealtimeDelayDetection() {
        // 每100ms检测一次延迟
        this.stats.delayUpdateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateRealtimeDelay();
            }
        }, 100);
    }
    
    /**
     * 更新实时延迟（优化版 - 避免清理后蹦极）
     * @private
     */
    updateRealtimeDelay() {
        const now = Date.now();
        const timeSinceLastRecognition = now - this.stats.lastRecognitionTime;
        
        // 如果超过5秒没有识别，重置延迟
        if (timeSinceLastRecognition > 5000) {
            this.stats.realtimeDelay = 0;
            this.stats.currentDelay = 0;
        } else {
            // 使用平滑算法更新延迟
            const rawDelay = timeSinceLastRecognition;
            const smoothedDelay = this.smoothDelay(rawDelay);
            this.stats.realtimeDelay = smoothedDelay;
            this.stats.currentDelay = smoothedDelay;
        }
        
        // 更新显示
        this.updateDelayDisplay();
    }
    
    /**
     * 检测并处理延迟蹦极
     * @private
     */
    detectDelayJump() {
        if (this.stats.delayHistory.length < 2) return;
        
        const recent = this.stats.delayHistory.slice(-3);
        const previous = this.stats.delayHistory.slice(-6, -3);
        
        if (previous.length === 0) return;
        
        const recentAvg = recent.reduce((sum, delay) => sum + delay, 0) / recent.length;
        const previousAvg = previous.reduce((sum, delay) => sum + delay, 0) / previous.length;
        
        // 检测延迟突然增加（蹦极）
        const jumpThreshold = previousAvg * 2; // 如果延迟突然增加2倍以上
        if (recentAvg > jumpThreshold && recentAvg > 1000) { // 且超过1秒
            console.log(`[VoiceDebugger] 检测到延迟蹦极: ${previousAvg}ms -> ${recentAvg}ms`);
            
            // 应用蹦极修正
            this.applyDelayJumpCorrection(recentAvg, previousAvg);
        }
    }
    
    /**
     * 应用延迟蹦极修正
     * @private
     */
    applyDelayJumpCorrection(currentAvg, previousAvg) {
        // 如果检测到蹦极，使用更保守的平滑因子
        this.stats.smoothingFactor = 0.3; // 增加平滑强度
        
        // 重置实时延迟为更合理的值
        this.stats.realtimeDelay = Math.min(currentAvg, previousAvg * 1.5);
        this.stats.currentDelay = this.stats.realtimeDelay;
        
        // 3秒后恢复正常平滑因子
        setTimeout(() => {
            this.stats.smoothingFactor = 0.1;
            console.log('[VoiceDebugger] 延迟蹦极修正完成，恢复正常平滑因子');
        }, 3000);
    }
    
    /**
     * 平滑延迟值，避免异常值影响
     * @private
     */
    smoothDelay(rawDelay) {
        // 过滤异常值
        if (rawDelay > this.stats.maxValidDelay || rawDelay < this.stats.minValidDelay) {
            return this.stats.realtimeDelay; // 保持上一个有效值
        }
        
        // 使用指数平滑
        if (this.stats.realtimeDelay === 0) {
            return rawDelay;
        }
        
        const smoothingFactor = this.stats.smoothingFactor;
        return Math.round(this.stats.realtimeDelay * (1 - smoothingFactor) + rawDelay * smoothingFactor);
    }
    
    /**
     * 启动网络状态检查
     * @private
     */
    startNetworkStatusCheck() {
        // 每5秒检查一次网络状态
        setInterval(() => {
            if (this.isVisible) {
                this.checkNetworkStatus();
            }
        }, 5000);
    }
    
    /**
     * 检查网络状态
     * @private
     */
    checkNetworkStatus() {
        // 检查语音识别是否正常工作
        if (window.$voiceRPG && window.$voiceRPG.isActive) {
            // 如果语音识别活跃，检查最近是否有识别结果
            const now = Date.now();
            const timeSinceLastRecognition = now - this.stats.lastRecognitionTime;
            
            if (timeSinceLastRecognition < 10000) { // 10秒内有识别结果
                this.updateServiceStatus('已连接 - 正常', '#4CAF50');
            } else if (timeSinceLastRecognition < 30000) { // 30秒内无识别结果
                this.updateServiceStatus('已连接 - 等待语音', '#FF9800');
            } else {
                // 超过30秒无识别结果，可能有问题
                this.updateServiceStatus('连接异常 - 无响应', '#F44336');
            }
        } else {
            this.updateServiceStatus('未连接', '#F44336');
        }
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
     * 清理语音垃圾按钮点击回调（优化版 - 避免延迟蹦极）
     */
    onControlCleanup() {
        console.log('[VoiceDebugger] 手动清理语音垃圾');
        
        // 记录清理前的延迟状态
        const beforeCleanupDelay = this.stats.realtimeDelay;
        const beforeCleanupAvg = this.stats.averageDelay;
        
        // 清理调试器状态
        this.reset();
        
        // 清理语音识别状态
        if (window.$voiceRPG && typeof window.$voiceRPG.resetRecognitionState === 'function') {
            window.$voiceRPG.resetRecognitionState();
        }
        
        // 清理语音识别提供商状态
        if (window.$voiceRPG && window.$voiceRPG.provider) {
            const provider = window.$voiceRPG.provider;
            if (provider.resetRecognitionState && typeof provider.resetRecognitionState === 'function') {
                provider.resetRecognitionState();
            }
        }
        
        // 清理咒语系统状态（如果在咒语模式）
        if (window.$spellSystem && window.$spellSystem.isCasting) {
            if (typeof window.$spellSystem.restartInput === 'function') {
                window.$spellSystem.restartInput();
            }
        }
        
        // 应用延迟蹦极预防措施
        this.preventDelayJumpAfterCleanup(beforeCleanupDelay, beforeCleanupAvg);
        
        // 显示清理完成提示
        this.updateFinalResult('语音垃圾已清理完成，延迟已优化');
        
        // 由外部处理
        if (this.controlCleanupCallback) {
            this.controlCleanupCallback();
        }
    }
    
    /**
     * 清理后预防延迟蹦极
     * @private
     */
    preventDelayJumpAfterCleanup(beforeDelay, beforeAvg) {
        console.log('[VoiceDebugger] 应用清理后延迟蹦极预防措施');
        
        // 设置更保守的平滑因子
        this.stats.smoothingFactor = 0.2;
        
        // 如果清理前有合理的延迟值，保持接近的值
        if (beforeDelay > 0 && beforeDelay < 2000) {
            this.stats.realtimeDelay = Math.min(beforeDelay, 500); // 限制在500ms以内
            this.stats.currentDelay = this.stats.realtimeDelay;
        }
        
        if (beforeAvg > 0 && beforeAvg < 2000) {
            this.stats.averageDelay = Math.min(beforeAvg, 500);
        }
        
        // 清空延迟历史，避免异常值影响
        this.stats.delayHistory = [];
        
        // 5秒后恢复正常平滑因子
        setTimeout(() => {
            this.stats.smoothingFactor = 0.1;
            console.log('[VoiceDebugger] 清理后延迟优化完成，恢复正常平滑因子');
        }, 5000);
    }
    
    /**
     * 设置回调函数
     */
    setControlCallbacks(toggleCallback, configCallback, cleanupCallback = null) {
        this.controlToggleCallback = toggleCallback;
        this.controlConfigCallback = configCallback;
        this.controlCleanupCallback = cleanupCallback;
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
        this.stats.failedRecognitions++;
        this.updateStats();
    }
    
    /**
     * 记录识别失败（用于丢包率计算）
     */
    recordRecognitionFailure() {
        this.stats.failedRecognitions++;
        this.stats.totalRecognitions++;
        
        // 重新计算丢包率
        if (this.stats.totalRecognitions > 0) {
            this.stats.packetLossRate = Math.round((this.stats.failedRecognitions / this.stats.totalRecognitions) * 100);
        }
        
        this.updateDelayDisplay();
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
        // 清理定时器
        if (this.stats.delayUpdateInterval) {
            clearInterval(this.stats.delayUpdateInterval);
            this.stats.delayUpdateInterval = null;
        }
        
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
/**
 * InputBridge.js - 输入桥接模块
 * 
 * 功能说明：
 * 1. 将语音命令转换为游戏输入
 * 2. 模拟按键事件
 * 3. 处理输入状态和延迟
 * 4. 简化版，专注于核心功能
 * 
 * @author 不想做工-接桀桀
 * @version 2.0.0
 */

class InputBridge {
    constructor() {
        // 按键映射
        this.keyMap = {
            'up': 'up',
            'down': 'down',
            'left': 'left',
            'right': 'right',
            'ok': 'ok',
            'cancel': 'cancel',
            'escape': 'escape',
            'shift': 'shift',
            'pageup': 'pageup',
            'pagedown': 'pagedown'
        };
        
        // 输入队列
        this.inputQueue = [];
        this.isProcessing = false;
        
        // 配置
        this.config = {
            keyPressDuration: 100,      // 按键持续时间
            queueProcessDelay: 50,      // 队列处理间隔
            maxQueueSize: 10,           // 最大队列长度
            enableSound: true           // 是否播放音效
        };
        
        // 启动处理循环
        this.startProcessingLoop();
    }
    
    /**
     * 执行动作
     * @param {string} action - 动作名称
     * @param {Object} options - 额外选项
     * @returns {boolean} - 是否成功加入队列
     */
    executeAction(action, options = {}) {
        if (!this.canAcceptInput()) {
            console.log('[InputBridge] 当前无法接受输入');
            return false;
        }
        
        const key = this.keyMap[action];
        if (!key) {
            console.warn('[InputBridge] 未知的动作:', action);
            return false;
        }
        
        // 添加到队列
        if (this.inputQueue.length >= this.config.maxQueueSize) {
            console.warn('[InputBridge] 输入队列已满');
            return false;
        }
        
        this.inputQueue.push({
            key: key,
            action: action,
            timestamp: Date.now(),
            options: options
        });
        
        console.log('[InputBridge] 动作已加入队列:', action);
        return true;
    }
    
    /**
     * 直接模拟按键（跳过队列）
     * @param {string} key - 按键名称
     * @param {number} duration - 持续时间
     */

    static simulateKey(key, duration = 100) {
        console.log('[InputBridge] simulateKey 详细信息:', {
            key: key,
            Input系统: !!Input._currentState,
            当前场景: SceneManager._scene ? SceneManager._scene.constructor.name : 'unknown',
            游戏地图: !!$gameMap,
            游戏玩家: !!$gamePlayer,
            事件运行中: $gameMap ? $gameMap.isEventRunning() : 'unknown'
        });
        
        if (!Input._currentState) {
            console.error('[InputBridge] Input系统未初始化');
            return;
        }
        
        // 添加这段：强制刷新输入状态
        Input.update();
        
        // 原有代码...
        Input._pressedTime = 0;
        Input._currentState[key] = true;
        Input._latestButton = key;
        
        // 方向键特殊处理 - 添加更多尝试
        if (['up', 'down', 'left', 'right'].includes(key)) {
            const dirMap = { up: 8, down: 2, left: 4, right: 6 };
            Input._dir4 = dirMap[key];
            Input._dir8 = dirMap[key];
            
            // 添加：触发按键事件
            Input._triggered = true;
            Input._repeated = true;
        }
        
        // ok 键的成功路径分析
        if (key === 'ok') {
            console.log('[InputBridge] OK键特殊路径');
            Input._triggered = true;
        }
        
        setTimeout(() => {
            if (Input._currentState) {
                Input._currentState[key] = false;
                Input._triggered = false;
                Input._repeated = false;
                if (['up', 'down', 'left', 'right'].includes(key)) {
                    Input._dir4 = 0;
                    Input._dir8 = 0;
                }
            }
        }, duration);
    }
    
    /**
     * 检查是否可以接受输入
     * @returns {boolean}
     */
    canAcceptInput() {
        // 场景切换中
        if (SceneManager.isSceneChanging()) {
            return false;
        }
        
        // 消息显示中
        if ($gameMessage && $gameMessage.isBusy()) {
            return false;
        }
        
        // 地图事件运行中
        if ($gameMap && $gameMap.isEventRunning()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取当前游戏上下文
     * @returns {string}
     */
    static getCurrentContext() {
        // 战斗场景
        if ($gameParty && $gameParty.inBattle()) {
            return 'battle';
        }
        
        // 菜单场景
        if (SceneManager._scene instanceof Scene_Menu ||
            SceneManager._scene instanceof Scene_Item ||
            SceneManager._scene instanceof Scene_Skill ||
            SceneManager._scene instanceof Scene_Equip ||
            SceneManager._scene instanceof Scene_Status ||
            SceneManager._scene instanceof Scene_Options ||
            SceneManager._scene instanceof Scene_Save ||
            SceneManager._scene instanceof Scene_Shop) {
            return 'menu';
        }
        
        // 对话
        if ($gameMessage && $gameMessage.hasText()) {
            return 'dialogue';
        }
        
        // 标题画面
        if (SceneManager._scene instanceof Scene_Title) {
            return 'title';
        }
        
        // 默认游戏场景
        return 'game';
    }
    
    /**
     * 启动处理循环
     * @private
     */
    startProcessingLoop() {
        setInterval(() => {
            this.processQueue();
        }, this.config.queueProcessDelay);
    }
    
    /**
     * 处理输入队列
     * @private
     */
    processQueue() {
        if (this.isProcessing || this.inputQueue.length === 0) {
            return;
        }
        
        if (!this.canAcceptInput()) {
            return;
        }
        
        this.isProcessing = true;
        
        const input = this.inputQueue.shift();
        this.executeInput(input);
        
        setTimeout(() => {
            this.isProcessing = false;
        }, this.config.keyPressDuration);
    }
    
    /**
     * 执行输入
     * @private
     */
    executeInput(input) {
        const { key, action, options } = input;
        
        // 模拟按键
        InputBridge.simulateKey(key, this.config.keyPressDuration);
        
        // 播放音效
        if (this.config.enableSound && this.shouldPlaySound(action)) {
            this.playActionSound(action);
        }
        
        // 触发自定义事件
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('voiceCommand', {
                detail: { action, key, options }
            }));
        }
    }
    
    /**
     * 是否应该播放音效
     * @private
     */
    shouldPlaySound(action) {
        return ['ok', 'cancel', 'escape'].includes(action);
    }
    
    /**
     * 播放动作音效
     * @private
     */
    playActionSound(action) {
        const soundMap = {
            'ok': { name: 'Decision2', volume: 90, pitch: 100 },
            'cancel': { name: 'Cancel2', volume: 90, pitch: 100 },
            'escape': { name: 'Cancel2', volume: 90, pitch: 100 }
        };
        
        const sound = soundMap[action];
        if (sound && AudioManager.playSe) {
            AudioManager.playSe(sound);
        }
    }
    
    /**
     * 清空输入队列
     */
    clearQueue() {
        this.inputQueue = [];
        console.log('[InputBridge] 输入队列已清空');
    }
    
    /**
     * 获取队列状态
     * @returns {Object}
     */
    getQueueStatus() {
        return {
            size: this.inputQueue.length,
            maxSize: this.config.maxQueueSize,
            processing: this.isProcessing
        };
    }
    
    /**
     * 设置配置
     * @param {Object} config
     */
    setConfig(config) {
        Object.assign(this.config, config);
        console.log('[InputBridge] 配置已更新:', this.config);
    }
    
    /**
     * 特殊动作处理
     */
    
    // 长按移动
    moveRepeat(direction, duration = 1000) {
        const interval = 100;
        const times = Math.floor(duration / interval);
        
        for (let i = 0; i < times; i++) {
            setTimeout(() => {
                this.executeAction(direction);
            }, i * interval);
        }
    }
    
    // 组合键
    comboKey(keys, delay = 50) {
        keys.forEach((key, index) => {
            setTimeout(() => {
                InputBridge.simulateKey(key, this.config.keyPressDuration);
            }, index * delay);
        });
    }
    
    // 快速连点
    rapidTap(action, count = 3, interval = 100) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.executeAction(action);
            }, i * interval);
        }
    }
}

// 创建全局实例
window.$inputBridge = new InputBridge();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputBridge;
} else {
    window.InputBridge = InputBridge;
}
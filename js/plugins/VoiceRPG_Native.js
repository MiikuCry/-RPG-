/*:
 * @target MZ
 * @plugindesc Voice RPG Native v2.6.0 - Web Speech API 版
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 语音控制RPG插件 - 主控制器（Web Speech API 版）
 * ============================================================================
 * 
 * 更新内容 v2.6.0：
 * 1. 简化为单一 Web Speech API 支持
 * 2. 移除所有第三方语音服务
 * 3. 优化命令处理逻辑
 * 4. 增强错误恢复机制
 * 
 * @param enableDebug
 * @text 启用调试界面
 * @desc 是否显示语音调试界面
 * @type boolean
 * @default true
 * 
 * @param autoStart
 * @text 自动启动
 * @desc 游戏开始时是否自动启动语音控制
 * @type boolean
 * @default false
 * 
 * @param turboMode
 * @text 极速模式
 * @desc 启用极速响应模式
 * @type boolean
 * @default true
 * 
 * @param partialConfidenceThreshold
 * @text 部分结果置信度阈值
 * @desc 部分结果执行的最低置信度（0.0-1.0）
 * @type number
 * @min 0.5
 * @max 1.0
 * @decimals 1
 * @default 0.8
 * 
 * @param commandCooldown
 * @text 命令冷却时间
 * @desc 同一命令的最小间隔时间（毫秒）
 * @type number
 * @min 50
 * @max 1000
 * @default 200
 */

(() => {
    'use strict';
    
    const pluginName = 'VoiceRPG_Native';
    const parameters = PluginManager.parameters(pluginName);
    const enableDebug = parameters['enableDebug'] === 'true';
    const autoStart = parameters['autoStart'] === 'true';
    const turboMode = parameters['turboMode'] !== 'false';
    const partialConfidenceThreshold = Number(parameters['partialConfidenceThreshold'] || 0.8);
    const commandCooldown = Number(parameters['commandCooldown'] || 200);
    
    // VoiceRPG主控制器 - Web Speech API 版
    class VoiceRPGController {
        constructor() {
            this.isInitialized = false;
            this.isActive = false;
            
            // 模块引用
            this.modules = {};
            
            // 核心组件
            this.commandSystem = null;
            this.inputBridge = null;
            this.debugger = null;
            this.provider = null;
            
            // 配置
            this.config = {
                enableDebug: enableDebug,
                autoStart: autoStart,
                defaultProvider: 'google',
                turboMode: turboMode,
                partialConfidenceThreshold: partialConfidenceThreshold,
                commandCooldown: commandCooldown
            };
            
            // 提供商策略配置
            this.providerStrategy = {
                enableTurboMode: true,
                enablePartialResults: true,
                restartDelay: 30,
                commandCooldown: 200,
                partialConfidenceThreshold: 0.8,
                silenceTimeout: 800,
                noSpeechTimeout: 3000,
                useQuickRestart: true,
                enableCommandCache: true,
                supportsContinuous: true
            };
            
            // 极速响应相关
            this.lastExecutedCommand = '';
            this.lastExecutedTime = 0;
            this.commandCooldowns = new Map();
            this.pendingRestart = false;
            this.consecutiveMatches = 0;
            
            // 语音识别队列管理
            this.recognitionQueue = [];
            this.maxQueueSize = 5; // 最大队列大小
            this.queueProcessTimer = null;
            this.lastQueueProcessTime = 0;
            
            // 部分结果处理
            this.partialBuffer = '';
            this.partialConfidence = 0;
            this.lastPartialTime = 0;

            // 命令去重机制
            this.recentCommands = new Map();
            this.commandDedupeWindow = 800;
            this.directionDedupeWindow = 500;
            this.partialResultTracking = new Map();

            // 定期清理过期的去重记录
            setInterval(() => {
                const now = Date.now();
                const maxAge = Math.max(this.commandDedupeWindow, this.directionDedupeWindow) * 2;
                
                for (const [key, time] of this.recentCommands.entries()) {
                    if (now - time > maxAge) {
                        this.recentCommands.delete(key);
                    }
                }
                
                for (const [key, time] of this.partialResultTracking.entries()) {
                    if (now - time > 2000) {
                        this.partialResultTracking.delete(key);
                    }
                }
            }, 5000);
        }
        
        /**
         * 初始化语音系统
         */
        async initialize() {
            console.log('[VoiceRPG] 开始初始化语音控制系统...');
            
            try {
                // 第一步：加载ModuleLoader
                await this.loadModuleLoader();
                
                // 第二步：加载所有必需模块
                await this.loadModules();
                
                // 第三步：初始化核心组件
                await this.initializeComponents();
                
                // 第四步：设置事件监听
                this.setupEventListeners();
                
                // 第五步：注册ESC键映射
                this.registerEscapeKey();
                
                // 第六步：注册战斗命令
                this.registerBattleCommands();
                
                this.isInitialized = true;
                console.log('[VoiceRPG] 语音控制系统初始化完成');
                
                // 显示欢迎消息
                this.showWelcomeMessage();
                
                // 自动启动
                if (this.config.autoStart) {
                    setTimeout(() => this.start(), 1000);
                }
                
                return true;
                
            } catch (error) {
                console.error('[VoiceRPG] 初始化失败:', error);
                this.showErrorMessage('语音系统初始化失败: ' + error.message);
                return false;
            }
        }
        
        /**
         * 注册ESC键映射
         */
        registerEscapeKey() {
            if (!Input.keyMapper[27]) {
                Input.keyMapper[27] = 'escape';
            }
            console.log('[VoiceRPG] ESC键映射已注册');
        }
        
        /**
         * 添加识别结果到队列
         */
        addToQueue(result) {
            // 检查队列大小，如果超过限制则清理旧的结果
            if (this.recognitionQueue.length >= this.maxQueueSize) {
                const removed = this.recognitionQueue.shift();
                console.log('[VoiceRPG] 队列已满，移除最旧的结果:', removed.text);
            }
            
            // 添加新结果
            this.recognitionQueue.push({
                ...result,
                queueTime: Date.now()
            });
            
            console.log(`[VoiceRPG] 队列大小: ${this.recognitionQueue.length}/${this.maxQueueSize}`);
            
            // 启动队列处理
            this.processQueue();
        }
        
        /**
         * 处理队列中的识别结果
         */
        processQueue() {
            // 防止频繁处理
            const now = Date.now();
            if (now - this.lastQueueProcessTime < 100) {
                return;
            }
            this.lastQueueProcessTime = now;
            
            // 清除之前的定时器
            if (this.queueProcessTimer) {
                clearTimeout(this.queueProcessTimer);
            }
            
            // 延迟处理，避免频繁处理
            this.queueProcessTimer = setTimeout(() => {
                this.processQueueItems();
            }, 50);
        }
        
        /**
         * 处理队列中的项目
         */
        processQueueItems() {
            if (this.recognitionQueue.length === 0) {
                return;
            }
            
            // 处理最新的结果
            const latestResult = this.recognitionQueue[this.recognitionQueue.length - 1];
            this.recognitionQueue = []; // 清空队列
            
            // 处理结果
            this.processSingleResult(latestResult);
        }
        
        /**
         * 保持游戏活跃状态
         */
        keepGameActive() {
            // 确保游戏窗口保持焦点
            if (window.focus && typeof window.focus === 'function') {
                window.focus();
            }
            
            // 如果游戏有活跃状态管理，确保游戏保持活跃
            if (SceneManager && SceneManager.isActive) {
                SceneManager.isActive = true;
            }
            
            // 防止游戏暂停
            if (Graphics && Graphics.isPlaying) {
                Graphics.isPlaying = true;
            }
            
            console.log('[VoiceRPG] 游戏活跃状态已保持');
        }

        /**
         * 从长语音中提取短命令（智能截断 - 增强版）
         */
        extractShortCommand(text, maxLength) {
            // 垃圾话检测关键词（如果包含这些词，很可能是垃圾话）
            const garbageKeywords = [
                '今天', '早上', '晚上', '昨天', '明天', '吃饭', '睡觉', '工作', '学习',
                '包子', '面条', '米饭', '菜', '肉', '水果', '饮料', '水', '茶', '咖啡',
                '天气', '下雨', '晴天', '阴天', '热', '冷', '温度', '风', '雪',
                '朋友', '家人', '同事', '同学', '老师', '老板', '客户', '顾客',
                '手机', '电脑', '电视', '电影', '音乐', '游戏', '小说', '新闻',
                '医院', '学校', '公司', '商店', '银行', '超市', '餐厅', '公园',
                '车', '房子', '衣服', '鞋子', '包', '书', '钱', '时间', '地方'
            ];
            
            // 检查是否包含垃圾话关键词
            const hasGarbageKeywords = garbageKeywords.some(keyword => text.includes(keyword));
            
            // 如果包含垃圾话关键词，需要更严格的判断
            if (hasGarbageKeywords) {
                console.log('[VoiceRPG] 检测到可能的垃圾话，进行严格过滤');
                
                // 只有在文本很短且以命令词结尾时才提取
                if (text.length <= 6) {
                    const shortCommands = ['上', '下', '左', '右', '确认', '取消', '确定', '是', '否', '好'];
                    
                    for (const command of shortCommands) {
                        if (text.endsWith(command) && command.length <= maxLength) {
                            console.log(`[VoiceRPG] 从垃圾话中提取到结尾命令: ${command}`);
                            return command;
                        }
                    }
                }
                
                // 如果文本较长且包含垃圾话，直接忽略
                console.log('[VoiceRPG] 长垃圾话已忽略');
                return null;
            }
            
            // 常见的短命令关键词
            const shortCommands = [
                '上', '下', '左', '右', '确认', '取消', '确定', '是', '否', '好', '不好',
                '进入', '退出', '开始', '结束', '暂停', '继续', '返回', '选择', '确定',
                '攻击', '防御', '技能', '道具', '逃跑', '治疗', '魔法', '咒语'
            ];
            
            // 1. 首先尝试匹配完整的关键词
            for (const command of shortCommands) {
                if (text.includes(command) && command.length <= maxLength) {
                    // 检查是否是独立的命令（前后没有其他字符或只有空格）
                    const index = text.indexOf(command);
                    const before = text.substring(Math.max(0, index - 1), index);
                    const after = text.substring(index + command.length, index + command.length + 1);
                    
                    // 如果前后都是空白字符或边界，认为是独立命令
                    if ((before === '' || before === ' ' || before === '，' || before === '。') &&
                        (after === '' || after === ' ' || after === '，' || after === '。')) {
                        console.log(`[VoiceRPG] 找到独立命令: ${command}`);
                        return command;
                    }
                }
            }
            
            // 2. 检查是否是短语结尾的命令（如"我今天早上吃了包子然后向上"）
            if (text.length > 6) {
                const endingCommands = ['上', '下', '左', '右', '确认', '取消', '确定'];
                
                for (const command of endingCommands) {
                    if (text.endsWith(command) && command.length <= maxLength) {
                        // 检查前面是否有明显的停顿或连接词
                        const beforeCommand = text.substring(text.length - command.length - 3, text.length - command.length);
                        if (beforeCommand.includes('然后') || beforeCommand.includes('接着') || 
                            beforeCommand.includes('最后') || beforeCommand.includes('现在')) {
                            console.log(`[VoiceRPG] 找到结尾命令: ${command}`);
                            return command;
                        }
                    }
                }
            }
            
            // 3. 如果没找到完整关键词，尝试截取前几个字符
            if (text.length > 0) {
                const truncated = text.substring(0, maxLength);
                
                // 检查截取的部分是否包含有效字符
                if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(truncated)) {
                    return truncated;
                }
            }
            
            // 4. 尝试从文本中间提取可能的命令
            const middleStart = Math.floor(text.length / 2) - Math.floor(maxLength / 2);
            const middleEnd = middleStart + maxLength;
            const middleText = text.substring(Math.max(0, middleStart), middleEnd);
            
            if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(middleText)) {
                return middleText;
            }
            
            return null;
        }

        /**
         * 检测对话框是否处于活跃状态
         */
        isDialogActive() {
            // 检查是否有消息窗口且正在显示
            if (SceneManager._scene && SceneManager._scene._messageWindow) {
                const messageWindow = SceneManager._scene._messageWindow;
                
                // 检查消息窗口是否打开且不是关闭状态
                if (messageWindow.isOpen() && !messageWindow.isClosing()) {
                    return true;
                }
                
                // 检查是否有待处理的消息
                if ($gameMessage && $gameMessage.hasText()) {
                    return true;
                }
            }
            
            // 检查是否有选择窗口活跃
            if (SceneManager._scene && SceneManager._scene._messageWindow) {
                const messageWindow = SceneManager._scene._messageWindow;
                if (messageWindow.isAnySubWindowActive && messageWindow.isAnySubWindowActive()) {
                    return true;
                }
            }
            
            // 检查是否有滚动文本窗口
            if (SceneManager._scene && SceneManager._scene._scrollTextWindow) {
                const scrollWindow = SceneManager._scene._scrollTextWindow;
                if (scrollWindow.isOpen() && !scrollWindow.isClosing()) {
                    return true;
                }
            }
            
            return false;
        }

        /**
         * 处理单个识别结果
         */
        processSingleResult(result) {
            const { text, confidence, isFinal } = result;
            
            const now = Date.now();
    
            // 如果极速模式下已经执行过部分结果，检查是否需要再次执行
            if (this.config.turboMode && this.partialBuffer) {
                const normalizedText = this.commandSystem.normalizeText(text);
                const normalizedPartial = this.commandSystem.normalizeText(this.partialBuffer);
                
                if (normalizedText === normalizedPartial || 
                    (normalizedText.includes(normalizedPartial) && (now - this.lastPartialTime) < 1000)) {
                    console.log('[VoiceRPG] 最终结果与已执行的部分结果相同，跳过');
                    this.scheduleRestart();
                    return;
                }
            }

            // 解析命令
            const command = this.commandSystem.parseCommand(text);
            if (command) {
                const commandKey = `${command.action}`;
                
                // 检查冷却时间
                if (this.commandCooldowns.has(commandKey)) {
                    const lastTime = this.commandCooldowns.get(commandKey);
                    if (now - lastTime < this.config.commandCooldown) {
                        console.log('[VoiceRPG] 命令冷却中，跳过:', command.action);
                        this.scheduleRestart();
                        return;
                    }
                }
                
                // 执行命令
                this.executeCommand(command, text);
                
                // 更新冷却时间
                this.commandCooldowns.set(commandKey, now);
                
                // 更新统计
                this.lastExecutedCommand = command.action;
                this.lastExecutedTime = now;
                this.consecutiveMatches++;
                
                // 更新调试器
                if (this.debugger) {
                    this.debugger.updateFinalResult(text, command.action);
                }
                
                // 极速模式下立即重启
                if (this.config.turboMode) {
                    this.scheduleRestart();
                }
            } else {
                console.log('[VoiceRPG] 未识别到有效命令:', text);
                
                // 更新调试器
                if (this.debugger) {
                    this.debugger.updateFinalResult(text);
                }
                
                // 极速模式下也重启
                if (this.config.turboMode) {
                    this.scheduleRestart();
                }
            }
        }

        /**
         * 重置语音识别状态（供咒语系统调用）
         */
        resetRecognitionState() {
            console.log('[VoiceRPG] 重置语音识别状态');
            
            // 清空部分结果缓存
            this.partialBuffer = '';
            this.partialConfidence = 0;
            this.lastPartialTime = 0;
            
            // 清空去重记录
            this.recentCommands.clear();
            this.partialResultTracking.clear();
            
            // 清空队列
            this.recognitionQueue = [];
            if (this.queueProcessTimer) {
                clearTimeout(this.queueProcessTimer);
                this.queueProcessTimer = null;
            }
            
            // 如果有provider，也清空其内部状态
            if (this.provider && this.provider.recognition) {
                // Web Speech API 会自动处理，但我们可以标记
                console.log('[VoiceRPG] 语音识别器准备接收新输入');
            }
        }

        /**
         * 注册战斗专用命令
         */
        registerBattleCommands() {
            if (this.commandSystem) {
                this.commandSystem.registerCommand('battle_select', {
                    patterns: ['选择', '选中', '选这个', '就这个', '这个'],
                    action: 'ok',
                    contexts: ['battle'],
                    description: '选择当前目标',
                    priority: 10
                });
                
                this.commandSystem.registerCommand('battle_confirm', {
                    patterns: ['确认', '确定', '是', '好', 'OK'],
                    action: 'ok',
                    contexts: ['battle'],
                    description: '确认选择',
                    priority: 10
                });
                
                this.commandSystem.registerCommand('battle_back', {
                    patterns: ['返回', '后退', '取消', '不'],
                    action: 'cancel',
                    contexts: ['battle'],
                    description: '返回上一级',
                    priority: 10
                });
                
                console.log('[VoiceRPG] 战斗命令已注册');
            }
        }
        
        /**
         * 加载ModuleLoader
         */
        loadModuleLoader() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'js/plugins/VoiceRPG/core/ModuleLoader.js';
                script.type = 'text/javascript';
                
                script.onload = () => {
                    console.log('[VoiceRPG] ModuleLoader加载成功');
                    resolve();
                };
                
                script.onerror = () => {
                    reject(new Error('ModuleLoader加载失败'));
                };
                
                document.head.appendChild(script);
            });
        }
        
        /**
         * 加载所有模块
         */
        async loadModules() {
            const loader = window.$moduleLoader;
            
            if (!loader) {
                throw new Error('ModuleLoader未找到');
            }
            
            // 初始化加载器
            await loader.initialize({
                errorHandler: (msg, err) => {
                    console.error('[VoiceRPG]', msg, err);
                }
            });
            
            // 加载必需模块
            await loader.loadRequired();

            // 确保加载特色功能模块
            try {
                await loader.loadCategory('features');
                console.log('[VoiceRPG] 特色功能模块加载完成');
                
                // 手动初始化 VoiceCalibration
                if (!window.$voiceCalibration) {
                    const VoiceCalibrationClass = loader.getModule('VoiceCalibration');
                    if (VoiceCalibrationClass) {
                        window.$voiceCalibration = new VoiceCalibrationClass();
                        console.log('[VoiceRPG] VoiceCalibration 已初始化');
                    }
                }
            } catch (error) {
                console.error('[VoiceRPG] 加载特色功能模块失败:', error);
            }

            // 额外加载UI模块
            try {
                await loader.loadCategory('ui');
                console.log('[VoiceRPG] UI模块加载完成');
            } catch (error) {
                console.error('[VoiceRPG] 加载UI模块失败:', error);
            }
            
            // 获取模块引用
            this.modules = {
                ConfigManager: loader.getModule('ConfigManager'),
                BaseProvider: loader.getModule('BaseProvider'),
                GoogleProvider: loader.getModule('GoogleProvider'),
                CommandSystem: loader.getModule('CommandSystem'),
                InputBridge: loader.getModule('InputBridge'),
                VoiceDebugger: loader.getModule('VoiceDebugger'),
                SpellSystem: loader.getModule('SpellSystem'),
                Window_SpellCasting: loader.getModule('Window_SpellCasting'),
                Window_SpellResult: loader.getModule('Window_SpellResult')
            };
            
            console.log('[VoiceRPG] 模块加载完成:', Object.keys(this.modules));
            
            // 检查SpellLearning依赖
            this.checkSpellLearningDependency();
        }
        
        /**
         * 检查SpellLearning依赖
         */
        checkSpellLearningDependency() {
            // 延迟检查，确保所有插件都已加载
            setTimeout(() => {
                if (window.$spellSystem && window.$spellLearning) {
                    console.log('[VoiceRPG] SpellSystem 和 SpellLearning 都已就绪');
                } else if (window.$spellSystem && !window.$spellLearning) {
                    console.warn('[VoiceRPG] SpellSystem 已就绪，但 SpellLearning 未找到');
                } else if (!window.$spellSystem && window.$spellLearning) {
                    console.warn('[VoiceRPG] SpellLearning 已就绪，但 SpellSystem 未找到');
                } else {
                    console.error('[VoiceRPG] SpellSystem 和 SpellLearning 都未找到！');
                }
            }, 1000);
        }
        
        /**
         * 初始化核心组件
         */
        async initializeComponents() {
            // 初始化配置管理器
            if (this.modules.ConfigManager && window.$voiceConfig) {
                window.$voiceConfig.update({
                    general: {
                        enabled: true,
                        autoStart: this.config.autoStart,
                        debugMode: this.config.enableDebug
                    },
                    recognition: {
                        provider: 'google'
                    }
                });
            }
            
            // 初始化命令系统
            this.commandSystem = new this.modules.CommandSystem();
            
            // 初始化输入桥接
            this.inputBridge = window.$inputBridge || new this.modules.InputBridge();
            
            // 初始化调试器
            if (this.config.enableDebug) {
                this.debugger = new this.modules.VoiceDebugger({
                    position: 'top-right',
                    theme: 'dark',
                    showStats: true
                });
                
                // 设置调试器回调
                this.debugger.setControlCallbacks(
                    () => this.toggle(),
                    () => this.openConfig()
                );
            }
            
            // 初始化语音提供商
            await this.initializeProvider();
        }
        
        /**
         * 初始化语音提供商
         */
        async initializeProvider() {
            // 清理旧的提供商
            if (this.provider) {
                try {
                    if (this.isActive) {
                        await this.provider.stop();
                    }
                    await this.provider.destroy();
                } catch (e) {
                    console.warn('[VoiceRPG] 清理旧提供商时出错:', e);
                }
            }
            
            console.log('[VoiceRPG] 初始化提供商: Google (Web Speech API)');
            
            // 创建提供商实例
            const GoogleProvider = this.modules.GoogleProvider;
            
            if (!GoogleProvider) {
                throw new Error('GoogleProvider未找到');
            }
            
            this.provider = new GoogleProvider();
            
            // 应用策略配置
            this.config.turboMode = this.providerStrategy.enableTurboMode;
            this.config.partialConfidenceThreshold = this.providerStrategy.partialConfidenceThreshold;
            this.config.commandCooldown = this.providerStrategy.commandCooldown;
            
            // 调整组件配置
            if (this.commandSystem) {
                this.commandSystem.config.enableCache = this.providerStrategy.enableCommandCache;
                this.commandSystem.config.fuzzyMatchThreshold = 0.7;
            }
            
            if (this.inputBridge) {
                this.inputBridge.config.keyPressDuration = 100;
                this.inputBridge.config.queueProcessDelay = 50;
            }
            
            // 初始化提供商
            try {
                const initOptions = {
                    language: 'zh-CN',
                    continuous: true,
                    interimResults: this.providerStrategy.enablePartialResults
                };
                
                await this.provider.initialize(initOptions);
                
                // 设置回调
                this.provider.on('onResult', (result) => this.handleResult(result));
                this.provider.on('onPartialResult', (result) => this.handlePartialResult(result));
                this.provider.on('onError', (error) => this.handleError(error));
                this.provider.on('onStatusChange', (status) => this.handleStatusChange(status));
                
                // 更新调试器显示
                if (this.debugger) {
                    this.debugger.updateServiceStatus('已连接 - Web Speech API', '#4CAF50');
                }
                
                // 如果支持极速模式
                if (this.provider.enableTurboMode) {
                    this.provider.enableTurboMode();
                }
                
                console.log('[VoiceRPG] 提供商初始化成功');
                
            } catch (error) {
                console.error('[VoiceRPG] 提供商初始化失败:', error);
                throw error;
            }
        }
        
        /**
         * 设置事件监听
         */
        setupEventListeners() {
            // 监听Tab键
            const originalUpdate = Scene_Map.prototype.update;
            Scene_Map.prototype.update = function() {
                originalUpdate.call(this);
                
                if (Input.isTriggered('tab')) {
                    if (window.$voiceRPG && window.$voiceRPG.debugger) {
                        window.$voiceRPG.debugger.toggle();
                    }
                }
            };
            
            // 注册Tab键
            Input.keyMapper[9] = 'tab';
            
            // 监听游戏状态变化
            const originalSceneGoto = SceneManager.goto;
            SceneManager.goto = (sceneClass) => {
                this.updateContext(sceneClass);
                return originalSceneGoto.call(SceneManager, sceneClass);
            };
        }
        
        /**
         * 更新游戏上下文
         */
        updateContext(sceneClass) {
            let context = 'game';
            
            if (sceneClass === Scene_Battle) {
                context = 'battle';
            } else if (sceneClass === Scene_Menu || 
                      sceneClass === Scene_Item ||
                      sceneClass === Scene_Skill ||
                      sceneClass === Scene_Equip ||
                      sceneClass === Scene_Status) {
                context = 'menu';
            } else if (sceneClass === Scene_Title) {
                context = 'title';
            }
            
            // 如果不在咒语咏唱状态，才切换上下文
            if (!window.$spellSystem || !window.$spellSystem.isCasting) {
                this.commandSystem.setContext(context);
                
                if (this.debugger) {
                    this.debugger.updateContext(context);
                }
            }
        }
        
        /**
         * 处理识别结果 - 根据策略调整
         */
        handleResult(result) {
            const { text, confidence, isFinal } = result;
            
            console.log('[VoiceRPG] 最终结果:', text, '置信度:', confidence);
            
            // 检查是否在咒语咏唱状态
            if (window.$spellSystem && window.$spellSystem.isCasting) {
                console.log('[VoiceRPG] 咒语咏唱中，转发到咒语系统');
                window.$spellSystem.processCastingResult(text);
                
                if (this.debugger) {
                    this.debugger.updateFinalResult(text + ' (咒语模式)');
                }
                return;
            }
            
            // 非战斗界面的长语音文本量限制
            if (!$gameParty || !$gameParty.inBattle()) {
                const cleanText = text.trim().replace(/\s+/g, '').replace(/[，。！？、]/g, '');
                const maxLength = 25; // 设置最大字符数为25
                
                if (cleanText.length > maxLength) {
                    console.log(`[VoiceRPG] 检测到长语音文本(${cleanText.length}字符)，超过限制(${maxLength}字符)，自动清理`);
                    
                    // 只保留前25个字符
                    const truncatedText = cleanText.substring(0, maxLength);
                    console.log(`[VoiceRPG] 截取后的文本: ${truncatedText}`);
                    
                    // 更新result对象
                    result.text = truncatedText;
                    
                    if (this.debugger) {
                        this.debugger.updateFinalResult(`长语音已截取: ${truncatedText}`);
                    }
                }
            }
            
            // 对话框存在检测（优化版）
            if (this.isDialogActive()) {
                const cleanText = text.trim().replace(/\s+/g, '').replace(/[，。！？、]/g, '');
                const maxDialogLength = 10; // 对话框存在时只允许短语音命令
                
                if (cleanText.length > maxDialogLength) {
                    console.log(`[VoiceRPG] 对话框存在，检测到长语音文本(${cleanText.length}字符)，超过限制(${maxDialogLength}字符)，智能截断`);
                    
                    // 智能截断：尝试提取可能的短命令
                    const shortCommand = this.extractShortCommand(cleanText, maxDialogLength);
                    
                    if (shortCommand) {
                        console.log(`[VoiceRPG] 从长语音中提取到短命令: ${shortCommand}`);
                        result.text = shortCommand; // 更新为截断后的文本
                        
                        if (this.debugger) {
                            this.debugger.updateFinalResult(`对话框长语音已截断: ${shortCommand}`);
                        }
                    } else {
                        console.log(`[VoiceRPG] 无法从长语音中提取有效命令，完全忽略`);
                        
                        if (this.debugger) {
                            this.debugger.updateFinalResult(`对话框长语音已忽略: ${cleanText.substring(0, 20)}...`);
                        }
                        return; // 直接返回，不处理
                    }
                }
            }
            
            // 队列管理：防止网络丢包时囤积过多未识别语音
            this.addToQueue(result);
        }

        /**
         * 处理部分结果 - 根据策略调整
         */
        handlePartialResult(result) {
            const { text, confidence = 0.8 } = result;
            
            // 如果策略禁用部分结果，直接返回
            if (!this.providerStrategy.enablePartialResults) {
                return;
            }
            
            // 检查是否在咒语咏唱状态
            if (window.$spellSystem && window.$spellSystem.isCasting) {
                window.$spellSystem.processCastingResult(text);
                
                if (this.debugger) {
                    this.debugger.updatePartialResult(text + ' (咒语)');
                }
                return;
            }
            
            // 更新调试器显示
            if (this.debugger) {
                this.debugger.updatePartialResult(text);
            }
            
            // 非极速模式下不执行部分结果
            if (!this.config.turboMode) {
                return;
            }
            
            const now = Date.now();

            // 追踪部分结果，防止重复处理
            const partialKey = `partial_${text}`;
            const lastPartialTime = this.partialResultTracking.get(partialKey);
            
            if (lastPartialTime && (now - lastPartialTime) < 500) {
                return;
            }
            
            this.partialResultTracking.set(partialKey, now);

            // 解析命令
            const command = this.commandSystem.parseCommand(text);
    
            if (command && command.confidence >= this.providerStrategy.partialConfidenceThreshold) {
                const directionCommands = ['up', 'down', 'left', 'right'];
                const isDirection = directionCommands.includes(command.action);
                
                const dedupeWindow = isDirection ? this.directionDedupeWindow : this.commandDedupeWindow;
                
                const commandKey = `${command.action}_${command.normalizedText || text}`;
                const lastExecutionTime = this.recentCommands.get(commandKey);
                
                if (lastExecutionTime && (now - lastExecutionTime) < dedupeWindow) {
                    return;
                }
                
                // 检查是否刚执行过任何方向命令
                if (isDirection) {
                    for (const dir of directionCommands) {
                        const dirKey = `${dir}_recent`;
                        const recentDirTime = this.recentCommands.get(dirKey);
                        if (recentDirTime && (now - recentDirTime) < 400) {
                            return;
                        }
                    }
                }
        
                console.log('[VoiceRPG] 极速执行部分结果:', text, '→', command.action);
                
                // 检查命令冷却
                if (!this.checkCommandCooldown(command)) {
                    return;
                }
                
                // 执行命令
                this.executeCommandImmediate(command);
                
                // 记录执行时间
                this.recentCommands.set(commandKey, now);
                
                if (isDirection) {
                    this.recentCommands.set(`${command.action}_recent`, now);
                }
                
                // 记录部分结果
                this.partialBuffer = text;
                this.partialConfidence = confidence;
                this.lastPartialTime = now;
                
                // 立即重启识别
                this.scheduleRestart();
            }
        }
        
        /**
         * 调度重启
         */
        scheduleRestart() {
            if (!this.config.turboMode) {
                return;
            }
            
            if (this.pendingRestart) return;
            
            this.pendingRestart = true;
            const delay = this.providerStrategy.restartDelay;
            
            setTimeout(() => {
                if (this.provider && this.isActive) {
                    console.log(`[VoiceRPG] 重启识别（延迟: ${delay}ms）`);
                    
                    try {
                        if (this.providerStrategy.useQuickRestart && this.provider.recognition) {
                            // 使用快速重启
                            this.provider.recognition.stop();
                            setTimeout(() => {
                                if (this.isActive && this.provider.recognition) {
                                    this.provider.recognition.lang = 'zh-CN';
                                    this.provider.doStart().catch(error => {
                                        console.error('[VoiceRPG] 快速重启失败:', error);
                                    });
                                }
                            }, 50);
                        } else {
                            this.provider.restart().catch(error => {
                                console.error('[VoiceRPG] 重启失败:', error);
                            });
                        }
                    } catch (e) {
                        console.warn('[VoiceRPG] 重启时出错:', e);
                    }
                }
                this.pendingRestart = false;
            }, delay);
        }
        
        /**
         * 立即执行命令（跳过队列）
         */
        executeCommandImmediate(command) {
            const context = this.getCurrentGameContext();
            
            // 特殊处理菜单命令
            if (command.action === 'escape' || command.action === 'menu') {
                this.executeMenuCommand(context);
                return;
            }
            
            // 直接使用静态方法
            InputBridge.simulateKey(command.action, this.inputBridge.config.keyPressDuration);
            
            // 播放反馈音效
            if (AudioManager.playSe) {
                AudioManager.playSe({
                    name: 'Cursor2',
                    volume: 60,
                    pitch: 120,
                    pan: 0
                });
            }
        }
        
        /**
         * 统一的命令处理方法
         */
        processCommand(text, isPartial = false) {
            if (!text || text.trim() === '') return;
            
            // 解析命令
            const command = this.commandSystem.parseCommand(text);
            
            if (command) {
                const now = Date.now();
                const commandKey = `${command.action}_${text}`;
                const lastExecutionTime = this.recentCommands.get(commandKey);

                const dedupeWindow = this.commandDedupeWindow;
                
                if (lastExecutionTime && (now - lastExecutionTime) < dedupeWindow) {
                    return;
                }
                
                this.recentCommands.set(commandKey, now);

                // 检查命令冷却
                if (!this.checkCommandCooldown(command)) {
                    return;
                }

                console.log('[VoiceRPG] 执行命令:', command.action, '来自文本:', text);
                
                // 更新调试器
                if (this.debugger) {
                    this.debugger.updateFinalResult(text, command.action);
                }
                
                const context = this.getCurrentGameContext();
                
                // 执行命令
                this.executeCommand(command, context);
                
                // 播放音效
                if (AudioManager.playSe) {
                    AudioManager.playSe({
                        name: 'Cursor2',
                        volume: 90,
                        pitch: 100,
                        pan: 0
                    });
                }
            }
        }
        
        /**
         * 检查命令冷却
         */
        checkCommandCooldown(command) {
            const now = Date.now();
            const lastTime = this.commandCooldowns.get(command.action) || 0;
            const cooldown = this.providerStrategy.commandCooldown;
            
            if (now - lastTime < cooldown) {
                return false;
            }
            
            this.commandCooldowns.set(command.action, now);
            return true;
        }
        
        /**
         * 获取当前游戏上下文
         */
        getCurrentGameContext() {
            if (window.$spellSystem && window.$spellSystem.isCasting) {
                return 'spell_casting';
            }
            
            if ($gameMessage && $gameMessage.isBusy()) {
                return 'message';
            }
            
            if (SceneManager._scene instanceof Scene_Menu ||
                SceneManager._scene instanceof Scene_Item ||
                SceneManager._scene instanceof Scene_Skill ||
                SceneManager._scene instanceof Scene_Equip ||
                SceneManager._scene instanceof Scene_Status) {
                return 'menu';
            }
            
            if ($gameParty && $gameParty.inBattle()) {
                return 'battle';
            }
            
            if ($gameMap && $gameMap.isEventRunning()) {
                return 'event';
            }
            
            return 'map';
        }
        
        /**
         * 根据上下文执行命令
         */
        executeCommand(command, context) {
            const { action } = command;
            
            // 特殊处理菜单命令
            if (action === 'escape' || action === 'menu') {
                this.executeMenuCommand(context);
                return;
            }
            
            // 直接使用静态方法
            InputBridge.simulateKey(action, 100);
            
            // 播放音效
            if (AudioManager.playSe && ['ok', 'cancel'].includes(action)) {
                AudioManager.playSe({
                    name: 'Cursor2',
                    volume: 90,
                    pitch: 100,
                    pan: 0
                });
            }
        }
        
        /**
         * 执行菜单命令
         */
        executeMenuCommand(context) {
            console.log('[VoiceRPG] 执行菜单命令，当前上下文:', context);
            
            if (context === 'menu') {
                this.inputBridge.executeAction('cancel');
            } else if (context === 'map' || context === 'game') {
                if (SceneManager._scene instanceof Scene_Map) {
                    SceneManager._scene.callMenu();
                } else {
                    SceneManager.push(Scene_Menu);
                }
            } else {
                this.inputBridge.executeAction('escape');
            }
        }
                
        /**
         * 处理错误
         */
        handleError(error) {
            console.error('[VoiceRPG] 语音识别错误:', error);
            
            if (this.debugger) {
                this.debugger.showError(error.message || error);
            }
            
            // 如果是语言相关错误，尝试重置语言
            if (error.message && error.message.includes('language')) {
                console.log('[VoiceRPG] 检测到语言错误，尝试重置');
                if (this.provider && this.provider.recognition) {
                    this.provider.recognition.lang = 'zh-CN';
                }
            }
        }
        
        /**
         * 处理状态变化（修复版 - 同时更新服务状态）
         */
        handleStatusChange(status) {
            if (this.debugger) {
                const statusMap = {
                    'listening': { text: '监听中', color: '#4CAF50' },
                    'no-speech': { text: '无语音', color: '#FF9800' },
                    'stopped': { text: '已停止', color: '#F44336' },
                    'error': { text: '错误', color: '#F44336' },
                    'connecting': { text: '连接中', color: '#2196F3' },
                    'processing': { text: '处理中', color: '#9C27B0' }
                };
                
                const statusInfo = statusMap[status] || { text: status, color: '#999' };
                this.debugger.updateRecognitionStatus(statusInfo.text, statusInfo.color);
                
                // 同时更新服务状态，避免状态卡住
                if (status === 'listening' || status === 'processing') {
                    this.debugger.updateServiceStatus('已连接 - 正常', '#4CAF50');
                } else if (status === 'error' || status === 'stopped') {
                    this.debugger.updateServiceStatus('连接异常', '#F44336');
                } else if (status === 'connecting') {
                    this.debugger.updateServiceStatus('连接中', '#2196F3');
                } else if (status === 'no-speech') {
                    this.debugger.updateServiceStatus('已连接 - 等待语音', '#FF9800');
                }
            }
        }
        
        /**
         * 启动语音识别
         */
        async start() {
            if (!this.isInitialized) {
                console.error('[VoiceRPG] 系统未初始化');
                return false;
            }
            
            if (this.isActive) {
                console.log('[VoiceRPG] 已经在运行中');
                return true;
            }
            
            try {
                await this.provider.start();
                this.isActive = true;
                
                if (this.debugger) {
                    this.debugger.setControlButtonState(true);
                    this.debugger.updateServiceStatus('已连接', '#4CAF50');
                }
                
                const strategyName = this.config.turboMode ? '极速模式' : '稳定模式';
                console.log(`[VoiceRPG] 语音识别已启动（${strategyName}）`);
                return true;
                
            } catch (error) {
                console.error('[VoiceRPG] 启动失败:', error);
                this.showErrorMessage('语音识别启动失败: ' + error.message);
                return false;
            }
        }
        
        /**
         * 停止语音识别
         */
        async stop() {
            if (!this.isActive) {
                return;
            }
            
            await this.provider.stop();
            this.isActive = false;
            this.pendingRestart = false;
            
            // 清空缓冲
            this.partialBuffer = '';
            
            if (this.debugger) {
                this.debugger.setControlButtonState(false);
                this.debugger.updateServiceStatus('已断开', '#F44336');
            }
            
            console.log('[VoiceRPG] 语音识别已停止');
        }
        
        /**
         * 切换开关状态
         */
        toggle() {
            if (this.isActive) {
                this.stop();
            } else {
                this.start();
            }
        }
        
        /**
         * 打开配置界面
         */
        openConfig() {
            SceneManager.push(Scene_VoiceConfig);
        }
        
        /**
         * 显示欢迎消息
         */
        showWelcomeMessage() {
            if ($gameMessage) {
                $gameMessage.add('\\C[3]语音控制系统已加载 v2.6.0');
                $gameMessage.add('当前服务：Web Speech API (极速模式)');
                $gameMessage.add('按Tab键打开控制面板');
            }
        }
        
        /**
         * 显示错误消息
         */
        showErrorMessage(message) {
            if ($gameMessage) {
                $gameMessage.add('\\C[2]语音系统错误');
                $gameMessage.add(message);
            }
        }
        
        /**
         * 清理资源
         */
        cleanup() {
            console.log('[VoiceRPG] 清理资源...');
            
            if (this.provider) {
                this.provider.destroy();
            }
            
            if (this.debugger) {
                this.debugger.destroy();
            }
            
            this.isInitialized = false;
            this.isActive = false;
        }
    }
    
    // 全局实例
    window.$voiceRPG = null;
    
    // 在地图场景启动时初始化
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        
        if (!window.$voiceRPG) {
            window.$voiceRPG = new VoiceRPGController();
            window.$voiceRPG.initialize();
        }
    };
    
    // 在游戏结束时清理
    const _Scene_GameEnd_start = Scene_GameEnd.prototype.start;
    Scene_GameEnd.prototype.start = function() {
        if (window.$voiceRPG) {
            window.$voiceRPG.cleanup();
            window.$voiceRPG = null;
        }
        _Scene_GameEnd_start.call(this);
    };
    
    // 修复选择敌人窗口
    const _Scene_Battle_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function() {
        _Scene_Battle_selectEnemySelection.call(this);
        
        if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
            window.$voiceRPG.commandSystem.setContext('battle');
        }
    };
    
    // 紧急恢复机制 - 防止战斗卡住
    const _BattleManager_update = BattleManager.update;
    BattleManager.update = function() {
        _BattleManager_update.call(this);
        
        if (this._phase === 'turn' && !this._subject && !this.isInputting()) {
            if (!this._lastActionTime) {
                this._lastActionTime = Date.now();
            }
            
            if (Date.now() - this._lastActionTime > 5000) {
                console.warn('[BattleManager] 检测到战斗卡住，尝试恢复');
                this._lastActionTime = Date.now();
                
                const nextSubject = this.getNextSubject();
                if (nextSubject) {
                    this._subject = nextSubject;
                    this.processTurn();
                } else {
                    this.endTurn();
                }
            }
        } else {
            this._lastActionTime = Date.now();
        }
    };

    // BattleManager 补丁
    (() => {
        const _BattleManager_endAction = BattleManager.endAction;
        
        BattleManager.endAction = function() {
            try {
                if (!this._subject) {
                    console.warn('[BattleManager] 没有当前行动者，跳过 endAction');
                    this.selectNextCommand();
                    return;
                }
                
                _BattleManager_endAction.call(this);
                
            } catch (error) {
                console.error('[BattleManager] endAction 错误:', error);
                this._action = null;
                this._subject = null;
                this.selectNextCommand();
            }
        };
        
        BattleManager.forceNextTurn = function() {
            console.log('[BattleManager] 强制进入下一回合');
            this._action = null;
            this._subject = null;
            
            if (this._phase === 'action') {
                this._phase = 'turn';
            }
            
            this.selectNextCommand();
        };
    })();

})();
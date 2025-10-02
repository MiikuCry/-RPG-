/*:
 * @target MZ
 * @plugindesc 脏话检测与嘟嘟音效 v1.0.0
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 脏话检测与嘟嘟音效插件
 * ============================================================================
 * 
 * 这个插件会检测玩家语音中的脏话，并播放嘟嘟音效进行"和谐"处理。
 * 
 * 功能特点：
 * 1. 实时检测语音识别结果中的脏话
 * 2. 播放随机的嘟嘟音效
 * 3. 可配置的脏话词库
 * 4. 支持模糊匹配和变体检测
 * 
 * 使用方法：
 * 1. 确保已安装语音识别相关插件
 * 2. 启用此插件
 * 3. 玩家说脏话时会自动播放嘟嘟音效
 * 
 * @param enableFilter
 * @text 启用脏话检测
 * @desc 是否启用脏话检测功能
 * @type boolean
 * @default true
 * 
 * @param beepVolume
 * @text 嘟嘟音效音量
 * @desc 嘟嘟音效的播放音量 (0-100)
 * @type number
 * @min 0
 * @max 100
 * @default 80
 * 
 * @param beepPitch
 * @text 嘟嘟音效音调
 * @desc 嘟嘟音效的播放音调 (50-150)
 * @type number
 * @min 50
 * @max 150
 * @default 100
 * 
 * @param showMessage
 * @text 显示提示消息
 * @desc 是否在检测到脏话时显示提示消息
 * @type boolean
 * @default true
 * 
 * @param customWords
 * @text 自定义脏话词库
 * @desc 自定义的脏话词汇，用逗号分隔
 * @type string
 * @default 
 */

(() => {
    'use strict';
    
    const pluginName = 'ProfanityFilter';
    const parameters = PluginManager.parameters(pluginName);
    
    const config = {
        enableFilter: parameters['enableFilter'] !== 'false',
        beepVolume: parseInt(parameters['beepVolume']) || 80,
        beepPitch: parseInt(parameters['beepPitch']) || 100,
        showMessage: parameters['showMessage'] !== 'false',
        customWords: parameters['customWords'] ? parameters['customWords'].split(',').map(w => w.trim()) : []
    };
    
    class ProfanityFilter {
        constructor() {
            this.enabled = config.enableFilter;
            this.beepSounds = ['Buzzer1', 'Buzzer2', 'Buzzer3'];
            this.lastBeepTime = 0;
            this.beepCooldown = 500; // 500ms冷却时间，防止连续播放
            
            // 基础脏话词库（中文常见脏话）
            this.profanityWords = [
                // 基础脏话
                '草', '艹', '操', '靠', '卧槽', '我草', '我靠', '妈的', '他妈的', '你妈的',
                '傻逼', '傻比', '沙比', 'sb', 'SB', '煞笔', '傻B', '傻b',
                'fuck', 'shit', 'damn', 'bitch', 'asshole',
                '滚', '滚蛋', '去死', '死去', '找死',
                '白痴', '智障', '脑残', '弱智', '蠢货', '废物', '垃圾',
                '婊子', '贱人', '贱货', '骚货', '臭婊子',
                '日', '日你', '日了', '操你', '干你', '搞你',
                '屎', '拉屎', '吃屎', '狗屎', '牛屎',
                '蛋', '鸡蛋', '王八蛋', '混蛋', '坏蛋',
                // 变体和谐音
                'cnm', 'nmsl', 'wdnmd', 'wtf', 'WTF',
                '草泥马', '日狗', '狗日的', '他娘的', '你娘的',
                '我擦', '我靠', '卧靠', '握草', '握靠',
                // 网络用语
                '6', '666', '牛逼', '牛B', '牛b', 'nb', 'NB',
                '装逼', '装B', '装b', 'zb', 'ZB',
                // 其他
                '滚犊子', '滚粗', '爬', '爬开', '死开'
            ];
            
            // 添加自定义词汇
            if (config.customWords.length > 0) {
                this.profanityWords = this.profanityWords.concat(config.customWords);
            }
            
            // 创建正则表达式模式
            this.createPatterns();
            
            console.log('[ProfanityFilter] 脏话检测器初始化完成，词库大小:', this.profanityWords.length);
        }
        
        /**
         * 创建检测模式
         */
        createPatterns() {
            // 为每个脏话创建模糊匹配模式
            this.patterns = this.profanityWords.map(word => {
                // 转义特殊字符
                const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                // 创建模糊匹配：允许中间插入空格、标点等
                const fuzzy = escaped.split('').join('[\\s\\.,，。！？]*?');
                
                return new RegExp(fuzzy, 'i');
            });
            
            // 创建快速检测模式（完全匹配）
            this.quickPattern = new RegExp(
                '(' + this.profanityWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
                'i'
            );
        }
        
        /**
         * 检测文本中是否包含脏话
         */
        detectProfanity(text) {
            if (!this.enabled || !text) return null;
            
            // 清理文本：移除空格和标点
            const cleanText = text.replace(/[\s\.,，。！？、]/g, '');
            
            // 快速检测
            const quickMatch = this.quickPattern.exec(cleanText);
            if (quickMatch) {
                return {
                    detected: true,
                    word: quickMatch[1],
                    originalText: text,
                    cleanText: cleanText,
                    method: 'quick'
                };
            }
            
            // 模糊检测
            for (let i = 0; i < this.patterns.length; i++) {
                const pattern = this.patterns[i];
                if (pattern.test(cleanText)) {
                    return {
                        detected: true,
                        word: this.profanityWords[i],
                        originalText: text,
                        cleanText: cleanText,
                        method: 'fuzzy'
                    };
                }
            }
            
            return null;
        }
        
        /**
         * 播放嘟嘟音效
         */
        playBeepSound(count = 1) {
            const now = Date.now();
            
            // 检查冷却时间
            if (now - this.lastBeepTime < this.beepCooldown) {
                return;
            }
            
            this.lastBeepTime = now;
            
            // 随机选择嘟嘟音效
            const soundName = this.beepSounds[Math.floor(Math.random() * this.beepSounds.length)];
            
            // 播放多次嘟嘟声
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    AudioManager.playSe({
                        name: soundName,
                        volume: config.beepVolume,
                        pitch: config.beepPitch + Math.random() * 20 - 10, // 随机音调变化
                        pan: 0
                    });
                }, i * 200); // 每200ms播放一次
            }
            
            console.log(`[ProfanityFilter] 播放嘟嘟音效: ${soundName} x${count}`);
        }
        
        /**
         * 显示提示消息
         */
        showWarningMessage(detectionResult) {
            if (!config.showMessage) return;
            
            const messages = [
                '请注意您的用词哦~',
                '检测到不当用词，已进行和谐处理',
                '文明用语，从我做起！',
                '嘟嘟~ 请使用文明用语',
                '系统自动和谐中...',
                '请保持良好的游戏环境'
            ];
            
            const message = messages[Math.floor(Math.random() * messages.length)];
            
            // 如果在战斗中，添加到战斗消息
            if ($gameParty && $gameParty.inBattle() && $gameMessage) {
                $gameMessage.add(`\\C[6][系统]\\C[0] ${message}`);
            } else if ($gameMessage && !$gameMessage.isBusy()) {
                // 非战斗场景显示消息
                $gameMessage.add(`\\C[6][系统]\\C[0] ${message}`);
            }
            
            console.log(`[ProfanityFilter] 显示警告消息: ${message}`);
        }
        
        /**
         * 处理检测到的脏话
         */
        handleProfanity(detectionResult) {
            console.log('[ProfanityFilter] 🚨 检测到脏话:', detectionResult);
            console.log('[ProfanityFilter] 🎵 准备播放嘟嘟音效...');
            
            // 计算嘟嘟次数（根据脏话长度）
            const beepCount = Math.min(Math.max(1, Math.ceil(detectionResult.word.length / 2)), 5);
            
            // 播放嘟嘟音效
            this.playBeepSound(beepCount);
            
            // 显示提示消息
            this.showWarningMessage(detectionResult);
            
            // 触发自定义事件（供其他插件使用）
            if (window.$gameSystem) {
                $gameSystem._profanityDetected = ($gameSystem._profanityDetected || 0) + 1;
            }
            
            // 强制显示检测结果（用于调试）
            if (window.$gameMessage && !window.$gameMessage.isBusy()) {
                window.$gameMessage.add(`\\C[2][脏话检测]\\C[0] 检测到: "${detectionResult.word}"`);
            }
            
            // 🔥 关键改进：把脏话当作指令，立即触发语音系统的清理机制
            console.log('[ProfanityFilter] 🎯 脏话指令识别完成，触发系统清理...');
            this.triggerVoiceSystemCleanup();
        }
        
        /**
         * 触发语音系统的清理机制 - 模拟指令执行后的清理
         */
        triggerVoiceSystemCleanup() {
            console.log('[ProfanityFilter] 🧹 触发语音系统清理机制');
            
            try {
                // 方法1：使用VoiceDebugger的清理功能（最彻底）
                if (window.$voiceDebugger && window.$voiceDebugger.onControlCleanup) {
                    console.log('[ProfanityFilter] 使用VoiceDebugger清理机制');
                    window.$voiceDebugger.onControlCleanup();
                    return;
                }
                
                // 方法2：使用VoiceRPG的重置功能
                if (window.$voiceRPG && window.$voiceRPG.resetRecognitionState) {
                    console.log('[ProfanityFilter] 使用VoiceRPG重置功能');
                    window.$voiceRPG.resetRecognitionState();
                }
                
                // 方法3：使用Provider的重置功能
                if (window.$voiceRPG && window.$voiceRPG.provider && window.$voiceRPG.provider.resetRecognitionState) {
                    console.log('[ProfanityFilter] 使用Provider重置功能');
                    window.$voiceRPG.provider.resetRecognitionState();
                }
                
                // 方法4：使用SpellSystem的重启输入功能
                if (window.$spellSystem && window.$spellSystem.restartInput) {
                    console.log('[ProfanityFilter] 使用SpellSystem重启输入功能');
                    window.$spellSystem.restartInput();
                }
                
                // 方法5：清理CommandSystem缓存
                if (window.$commandSystem && window.$commandSystem.matchCache) {
                    console.log('[ProfanityFilter] 清理CommandSystem缓存');
                    window.$commandSystem.matchCache.clear();
                }
                
                console.log('[ProfanityFilter] ✅ 语音系统清理完成');
                
            } catch (error) {
                console.warn('[ProfanityFilter] 触发语音系统清理时出错:', error);
                
                // 降级处理：使用自己的清理方法
                this.fallbackCleanup();
            }
        }
        
        /**
         * 降级清理方法
         */
        fallbackCleanup() {
            console.log('[ProfanityFilter] 🔄 使用降级清理方法');
            
            // 立即阻断累积
            this.immediateBlockAccumulation();
            
            // 快速清理显示和累积文本
            setTimeout(() => {
                this.clearDebuggerDisplay();
                this.clearAccumulatedText();
                console.log('[ProfanityFilter] 🧹 降级清理：已清理显示和累积文本');
            }, 100);
            
            // 彻底清理语音识别内容
            setTimeout(() => {
                this.clearVoiceRecognitionContent();
                console.log('[ProfanityFilter] 🧹 降级清理：已彻底清理语音内容');
            }, 500);
        }
        
        /**
         * 清空语音识别内容 - 防止脏话重复触发
         */
        clearVoiceRecognitionContent() {
            console.log('[ProfanityFilter] 🧹 清空语音识别内容，防止重复触发');
            
            try {
                // 方法1: 温和清理VoiceRPG主系统状态
                if (window.$voiceRPG) {
                    // 延迟清理识别队列，避免影响当前检测
                    setTimeout(() => {
                        if (window.$voiceRPG.recognitionQueue) {
                            window.$voiceRPG.recognitionQueue = [];
                            console.log('[ProfanityFilter] 已清空VoiceRPG识别队列');
                        }
                    }, 100);
                    
                    // 不立即重置识别状态，避免中断检测
                    console.log('[ProfanityFilter] 跳过立即重置，避免影响检测');
                }
                
                // 方法2: 延迟清理语音识别提供商状态
                if (window.$voiceRPG && window.$voiceRPG.provider) {
                    const provider = window.$voiceRPG.provider;
                    
                    // 延迟清理，避免中断当前检测
                    setTimeout(() => {
                        // 只清理Google Provider的缓存状态
                        if (provider.name === 'Google') {
                            provider.needsClear = false;
                            console.log('[ProfanityFilter] 已清理Google Provider缓存状态');
                        }
                    }, 200);
                }
                
                // 方法3: 清理咒语系统状态（如果在咒语模式）
                if (window.$spellSystem && window.$spellSystem.isCasting) {
                    if (typeof window.$spellSystem.restartInput === 'function') {
                        window.$spellSystem.restartInput();
                        console.log('[ProfanityFilter] 已重置咒语系统输入状态');
                    }
                }
                
                // 方法4: 清理命令系统缓存
                if (window.$commandSystem && typeof window.$commandSystem.clearCache === 'function') {
                    window.$commandSystem.clearCache();
                    console.log('[ProfanityFilter] 已清理命令系统缓存');
                }
                
                // 方法5: 快速清理语音调试器显示（在第二阶段调用时）
                if (window.$voiceDebugger) {
                    // 立即清空显示内容
                    this.clearDebuggerDisplay();
                    
                    // 重置调试器状态
                    if (typeof window.$voiceDebugger.reset === 'function') {
                        window.$voiceDebugger.reset();
                        console.log('[ProfanityFilter] 已重置语音调试器状态');
                    }
                    
                    // 立即更新显示为清理状态
                    if (typeof window.$voiceDebugger.updateFinalResult === 'function') {
                        window.$voiceDebugger.updateFinalResult('');
                    }
                    if (typeof window.$voiceDebugger.updatePartialResult === 'function') {
                        window.$voiceDebugger.updatePartialResult('');
                    }
                }
                
                // 方法6: 温和重启语音识别（避免影响检测）
                setTimeout(() => {
                    if (window.$voiceRPG && window.$voiceRPG.isActive) {
                        // 只清理内部状态，不重启服务
                        if (window.$voiceRPG.recognitionQueue) {
                            window.$voiceRPG.recognitionQueue = [];
                        }
                        console.log('[ProfanityFilter] 已清理语音识别队列');
                    }
                }, 500); // 延迟500ms，避免影响当前检测
                
                console.log('[ProfanityFilter] ✅ 语音识别内容清理完成');
                
            } catch (error) {
                console.warn('[ProfanityFilter] ⚠️ 清理语音识别内容时出错:', error);
            }
        }
        
        /**
         * 立即阻断文本累积 - 防止脏话与后续文本拼接
         * 注意：这是温和的清理，不会影响SpellSystem的核心逻辑
         */
        immediateBlockAccumulation() {
            try {
                console.log('[ProfanityFilter] 🚫 立即阻断文本累积');
                
                // 温和地清理咒语系统的累积文本（保留核心逻辑不变）
                if (window.$spellSystem) {
                    // 备份当前状态，以防需要恢复
                    const backupState = {
                        isCasting: window.$spellSystem.isCasting,
                        castingSpell: window.$spellSystem.castingSpell,
                        isListening: window.$spellSystem.isListening
                    };
                    
                    // 只清理文本累积，不影响咒语系统的其他状态
                    window.$spellSystem.accumulatedText = '';
                    window.$spellSystem.pendingText = '';
                    window.$spellSystem.castingText = '';
                    window.$spellSystem.lastProcessedText = '';
                    
                    // 保持咒语系统的核心状态不变
                    window.$spellSystem.isCasting = backupState.isCasting;
                    window.$spellSystem.castingSpell = backupState.castingSpell;
                    window.$spellSystem.isListening = backupState.isListening;
                    
                    console.log('[ProfanityFilter] 已温和清理咒语系统累积文本（保留核心状态）');
                }
                
                // 温和地重置语音识别提供商的内部累积（避免强制中断）
                if (window.$voiceRPG && window.$voiceRPG.provider) {
                    const provider = window.$voiceRPG.provider;
                    
                    // 温和重置Google Provider的内部状态
                    if (provider.name === 'Google' && provider.recognition) {
                        // 检查当前状态，避免InvalidStateError
                        try {
                            // 只在识别活跃时才进行温和重置
                            if (provider.isActive && provider.status && provider.status.isListening) {
                                // 设置标记，让下次结果被忽略
                                provider.needsClear = true;
                                
                                // 温和地停止当前识别（不使用abort）
                                if (provider.recognition.stop) {
                                    provider.recognition.stop();
                                }
                                
                                // 延迟重启，确保状态清理
                                setTimeout(() => {
                                    if (provider.isActive && provider.start) {
                                        provider.start();
                                    }
                                }, 100);
                                
                                console.log('[ProfanityFilter] 已温和重置Google Provider状态');
                            } else {
                                console.log('[ProfanityFilter] Google Provider未在监听，跳过重置');
                            }
                        } catch (error) {
                            console.warn('[ProfanityFilter] 重置Google Provider时出错:', error);
                        }
                    }
                }
                
                // 清空VoiceRPG主系统的队列
                if (window.$voiceRPG && window.$voiceRPG.recognitionQueue) {
                    window.$voiceRPG.recognitionQueue = [];
                    console.log('[ProfanityFilter] 已清空VoiceRPG识别队列');
                }
                
            } catch (error) {
                console.warn('[ProfanityFilter] 阻断累积时出错:', error);
            }
        }
        
        /**
         * 清理所有累积文本
         */
        clearAccumulatedText() {
            try {
                console.log('[ProfanityFilter] 🧹 清理所有累积文本');
                
                // 清理咒语系统的所有文本状态
                if (window.$spellSystem) {
                    window.$spellSystem.accumulatedText = '';
                    window.$spellSystem.pendingText = '';
                    window.$spellSystem.castingText = '';
                    window.$spellSystem.lastProcessedText = '';
                    
                    // 如果有咒语UI，也清理
                    if (window.$spellSystem.castingUI) {
                        window.$spellSystem.castingUI._castingText = '';
                        if (window.$spellSystem.castingUI.refresh) {
                            window.$spellSystem.castingUI.refresh();
                        }
                    }
                    
                    console.log('[ProfanityFilter] 已清理咒语系统所有文本状态');
                }
                
                // 清理命令系统缓存
                if (window.$commandSystem && window.$commandSystem.matchCache) {
                    window.$commandSystem.matchCache.clear();
                    console.log('[ProfanityFilter] 已清理命令系统缓存');
                }
                
                // 清理语音调试器的文本显示
                this.clearDebuggerDisplay();
                
            } catch (error) {
                console.warn('[ProfanityFilter] 清理累积文本时出错:', error);
            }
        }
        
        /**
         * 强制清空调试器显示内容 - 快速版
         */
        clearDebuggerDisplay() {
            try {
                if (!window.$voiceDebugger || !window.$voiceDebugger.debugUI) {
                    return;
                }
                
                const debugUI = window.$voiceDebugger.debugUI;
                
                // 快速清空所有文本内容 - 使用更激进的策略
                const allElements = debugUI.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.textContent && el.textContent.trim()) {
                        const content = el.textContent.toLowerCase();
                        // 检查是否包含任何脏话相关内容
                        if (content.includes('我操') || content.includes('傻逼') || content.includes('卧槽') || 
                            content.includes('草') || content.includes('操') || content.includes('靠') ||
                            content.includes('艹') || content.includes('妈的') || content.includes('sb') ||
                            content.includes('fuck') || content.includes('shit') || content.includes('damn')) {
                            
                            // 立即清空
                            el.textContent = '';
                            el.innerHTML = '';
                            
                            // 如果是输入或结果显示区域，设置为等待状态
                            if (el.classList.contains('vd-partial-result')) {
                                el.textContent = '等待语音输入...';
                            } else if (el.classList.contains('vd-final-result')) {
                                el.textContent = '';
                            }
                        }
                    }
                });
                
                // 特别处理已知的显示元素
                const knownElements = [
                    '.vd-partial-result',
                    '.vd-final-result', 
                    '.vd-history',
                    '.vd-command-history',
                    '.vd-text-display',
                    '.vd-result',
                    '.vd-command',
                    '.vd-input',
                    '.vd-output'
                ];
                
                knownElements.forEach(selector => {
                    const elements = debugUI.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (selector === '.vd-partial-result') {
                            el.textContent = '等待语音输入...';
                        } else {
                            el.textContent = '';
                            el.innerHTML = '';
                        }
                    });
                });
                
                // 强制刷新调试器历史
                if (window.$voiceDebugger.history) {
                    // 只保留非脏话的历史记录
                    window.$voiceDebugger.history = window.$voiceDebugger.history.filter(item => {
                        const text = (item.text || '').toLowerCase();
                        return !(text.includes('我操') || text.includes('傻逼') || text.includes('卧槽') ||
                                text.includes('草') || text.includes('操') || text.includes('靠'));
                    });
                    
                    // 更新历史显示
                    if (typeof window.$voiceDebugger.updateHistoryDisplay === 'function') {
                        window.$voiceDebugger.updateHistoryDisplay();
                    }
                }
                
                console.log('[ProfanityFilter] ⚡ 快速清空调试器显示内容完成');
                
            } catch (error) {
                console.warn('[ProfanityFilter] 清空调试器显示时出错:', error);
            }
        }
        
        /**
         * 手动测试功能
         */
        testDetection(testText = "我操") {
            console.log('[ProfanityFilter] 🧪 手动测试:', testText);
            const result = this.detectProfanity(testText);
            if (result && result.detected) {
                console.log('[ProfanityFilter] ✅ 测试成功，检测到脏话');
                this.handleProfanity(result);
                return true;
            } else {
                console.log('[ProfanityFilter] ❌ 测试失败，未检测到脏话');
                return false;
            }
        }
        
        /**
         * 处理语音识别结果
         */
        processVoiceResult(text) {
            console.log('[ProfanityFilter] 🎤 收到语音文本:', text);
            console.log('[ProfanityFilter] 📊 过滤器状态:', this.enabled ? '启用' : '禁用');
            
            if (!this.enabled) {
                console.log('[ProfanityFilter] ⏸️ 过滤器已禁用，跳过检测');
                return false;
            }
            
            const result = this.detectProfanity(text);
            console.log('[ProfanityFilter] 🔍 检测结果:', result);
            
            if (result && result.detected) {
                console.log('[ProfanityFilter] 🚨 发现脏话，开始处理...');
                this.handleProfanity(result);
                return true; // 表示检测到脏话
            } else {
                console.log('[ProfanityFilter] ✅ 文本干净，无需处理');
            }
            
            return false; // 没有检测到脏话
        }
        
        /**
         * 启用/禁用过滤器
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            console.log('[ProfanityFilter] 过滤器状态:', enabled ? '启用' : '禁用');
        }
        
        /**
         * 添加自定义脏话词汇
         */
        addCustomWord(word) {
            if (word && !this.profanityWords.includes(word)) {
                this.profanityWords.push(word);
                this.createPatterns(); // 重新创建模式
                console.log('[ProfanityFilter] 添加自定义词汇:', word);
            }
        }
        
        /**
         * 移除脏话词汇
         */
        removeWord(word) {
            const index = this.profanityWords.indexOf(word);
            if (index > -1) {
                this.profanityWords.splice(index, 1);
                this.createPatterns(); // 重新创建模式
                console.log('[ProfanityFilter] 移除词汇:', word);
            }
        }
        
        /**
         * 获取统计信息
         */
        getStats() {
            return {
                enabled: this.enabled,
                wordCount: this.profanityWords.length,
                detectedCount: $gameSystem ? ($gameSystem._profanityDetected || 0) : 0
            };
        }
    }
    
    // 创建全局实例
    window.ProfanityFilter = ProfanityFilter;
    window.$profanityFilter = new ProfanityFilter();
    
    // === 测试和调试函数 ===
    
    
    // 手动测试函数
    window.forceCheckProfanity = function(text) {
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        console.log('强制检测:', text);
        return window.$profanityFilter.processVoiceResult(text);
    };
    
    
    // 添加测试脏话+自动清理功能
    window.testProfanityWithCleanup = function(text = "我操") {
        console.log('=== 测试脏话检测+温和清理 ===');
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        
        console.log('测试文本:', text);
        console.log('预期效果: 检测脏话 → 播放嘟嘟 → 当作指令处理 → 触发语音系统清理机制');
        console.log('🎯 核心改进：把脏话当作特殊指令，利用原有的指令清理机制！');
        
        // 先测试基础检测
        console.log('🔍 测试基础检测功能...');
        console.log('词库大小:', window.$profanityFilter.profanityWords.length);
        console.log('是否包含"我操":', window.$profanityFilter.profanityWords.includes('我操'));
        console.log('是否包含"操":', window.$profanityFilter.profanityWords.includes('操'));
        
        return window.$profanityFilter.testDetection(text);
    };
    
    // 纯检测测试（不清理）
    window.testProfanityOnly = function(text = "我操") {
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        
        const result = window.$profanityFilter.detectProfanity(text);
        if (result && result.detected) {
            console.log('✅ 检测到脏话:', result.word);
            window.$profanityFilter.playBeepSound(2);
            return true;
        } else {
            console.log('❌ 未检测到脏话');
            return false;
        }
    };
    
    // 清理调试器显示
    window.clearDebuggerDisplay = function() {
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        window.$profanityFilter.clearDebuggerDisplay();
        console.log('✅ 调试器显示已清理');
    };
    
    // 状态检查
    window.checkProfanityFilterStatus = function() {
        if (!window.$profanityFilter) {
            console.error('❌ 脏话检测器未初始化！');
            return;
        }
        
        console.log('✅ 脏话检测器状态:');
        console.log('- 启用状态:', window.$profanityFilter.enabled);
        console.log('- 词库大小:', window.$profanityFilter.profanityWords.length);
        console.log('- 包含"操":', window.$profanityFilter.profanityWords.includes('操'));
        
        // 快速测试
        const testResult = window.$profanityFilter.detectProfanity('我操');
        console.log('- 测试结果:', testResult ? '✅ 正常' : '❌ 异常');
    };
    
    // 手动清理系统
    window.cleanupProfanityHistory = function() {
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        window.$profanityFilter.triggerVoiceSystemCleanup();
        console.log('✅ 系统清理完成');
    };
    
    // 集成到现有的语音识别系统
    const originalHandleResult = function(text) {
        // 先进行脏话检测
        if (window.$profanityFilter) {
            const hasProfanity = window.$profanityFilter.processVoiceResult(text);
            
            // 如果检测到脏话，可以选择是否继续处理原始文本
            // 这里我们选择继续处理，但已经播放了嘟嘟音效
        }
        
        return text;
    };
    
    // 更强力的集成方式 - 直接Hook到BaseProvider
    const integrateProfanityFilter = () => {
        console.log('[ProfanityFilter] 开始集成到语音系统...');
        
        // 方法1: Hook BaseProvider的handleResult方法
        if (window.BaseProvider && window.BaseProvider.prototype.handleResult) {
            const originalHandleResult = window.BaseProvider.prototype.handleResult;
            
            window.BaseProvider.prototype.handleResult = function(text, isFinal = true, confidence = 0.9) {
                // 脏话检测 - 在最早期就检测
                if (window.$profanityFilter && text && isFinal) {
                    console.log('[ProfanityFilter] 🎯 BaseProvider Hook触发:', text, 'isFinal:', isFinal);
                    window.$profanityFilter.processVoiceResult(text);
                } else {
                    console.log('[ProfanityFilter] BaseProvider Hook跳过:', {
                        hasFilter: !!window.$profanityFilter,
                        hasText: !!text,
                        isFinal: isFinal,
                        text: text
                    });
                }
                
                // 继续原始处理
                return originalHandleResult.call(this, text, isFinal, confidence);
            };
            
            console.log('[ProfanityFilter] 已Hook BaseProvider.handleResult');
        }
        
        // 方法2: Hook VoiceRPG主系统
        if (window.$voiceRPG && window.$voiceRPG.handleResult) {
            const originalHandleResult = window.$voiceRPG.handleResult.bind(window.$voiceRPG);
            
            window.$voiceRPG.handleResult = function(result) {
                // 脏话检测
                if (window.$profanityFilter && result.text) {
                    console.log('[ProfanityFilter] VoiceRPG检测:', result.text);
                    window.$profanityFilter.processVoiceResult(result.text);
                }
                
                // 继续原始处理
                return originalHandleResult(result);
            };
            
            console.log('[ProfanityFilter] 已Hook VoiceRPG.handleResult');
        }
        
        // 方法3: Hook咒语系统
        if (window.$spellSystem && window.$spellSystem.processCastingResult) {
            const originalProcessCasting = window.$spellSystem.processCastingResult.bind(window.$spellSystem);
            
            window.$spellSystem.processCastingResult = function(text) {
                // 脏话检测
                if (window.$profanityFilter && text) {
                    console.log('[ProfanityFilter] SpellSystem检测:', text);
                    window.$profanityFilter.processVoiceResult(text);
                }
                
                // 继续原始处理
                return originalProcessCasting(text);
            };
            
            console.log('[ProfanityFilter] 已Hook SpellSystem.processCastingResult');
        }
        
        // 方法4: Hook CommandSystem的parseCommand
        if (window.CommandSystem && window.CommandSystem.prototype.parseCommand) {
            const originalParseCommand = window.CommandSystem.prototype.parseCommand;
            
            window.CommandSystem.prototype.parseCommand = function(text, context = null) {
                // 脏话检测
                if (window.$profanityFilter && text) {
                    console.log('[ProfanityFilter] CommandSystem检测:', text);
                    window.$profanityFilter.processVoiceResult(text);
                }
                
                // 继续原始处理
                return originalParseCommand.call(this, text, context);
            };
            
            console.log('[ProfanityFilter] 已Hook CommandSystem.parseCommand');
        }
        
        // 方法5: Hook processQueue方法 - 这是关键！
        if (window.$voiceRPG && window.$voiceRPG.processQueue) {
            const originalProcessQueue = window.$voiceRPG.processQueue.bind(window.$voiceRPG);
            
            window.$voiceRPG.processQueue = function() {
                // 检查队列中的结果
                if (this.recognitionQueue && this.recognitionQueue.length > 0) {
                    for (const result of this.recognitionQueue) {
                        if (window.$profanityFilter && result.text) {
                            console.log('[ProfanityFilter] ProcessQueue检测:', result.text);
                            window.$profanityFilter.processVoiceResult(result.text);
                        }
                    }
                }
                
                // 继续原始处理
                return originalProcessQueue();
            };
            
            console.log('[ProfanityFilter] 已Hook processQueue');
        }
        
        // 方法6: 直接Hook到队列添加方法
        if (window.$voiceRPG && window.$voiceRPG.addToQueue) {
            const originalAddToQueue = window.$voiceRPG.addToQueue.bind(window.$voiceRPG);
            
            window.$voiceRPG.addToQueue = function(result) {
                // 脏话检测 - 在结果进入队列时就检测
                if (window.$profanityFilter && result.text) {
                    console.log('[ProfanityFilter] AddToQueue检测:', result.text);
                    window.$profanityFilter.processVoiceResult(result.text);
                }
                
                // 继续原始处理
                return originalAddToQueue(result);
            };
            
            console.log('[ProfanityFilter] 已Hook addToQueue');
        }
        
        // 方法7: Hook processSingleResult方法 - 最终处理点
        if (window.$voiceRPG && window.$voiceRPG.processSingleResult) {
            const originalProcessSingleResult = window.$voiceRPG.processSingleResult.bind(window.$voiceRPG);
            
            window.$voiceRPG.processSingleResult = function(result) {
                // 脏话检测 - 在最终处理时检测
                if (window.$profanityFilter && result && result.text) {
                    console.log('[ProfanityFilter] ProcessSingleResult检测:', result.text);
                    window.$profanityFilter.processVoiceResult(result.text);
                }
                
                // 继续原始处理
                return originalProcessSingleResult(result);
            };
            
            console.log('[ProfanityFilter] 已Hook processSingleResult');
        }
        
        // 方法8: 暴力Hook所有可能的语音处理点
        const hookAllMethods = () => {
            // Hook VoiceRPG的所有可能方法
            if (window.$voiceRPG) {
                const methods = ['handleResult', 'handlePartialResult', 'addToQueue', 'processQueue', 'processQueueItems', 'processSingleResult'];
                
                methods.forEach(methodName => {
                    if (window.$voiceRPG[methodName] && typeof window.$voiceRPG[methodName] === 'function') {
                        const original = window.$voiceRPG[methodName].bind(window.$voiceRPG);
                        
                        window.$voiceRPG[methodName] = function(...args) {
                            // 检查参数中是否有文本
                            for (const arg of args) {
                                if (arg && typeof arg === 'object' && arg.text) {
                                    console.log(`[ProfanityFilter] ${methodName}检测:`, arg.text);
                                    if (window.$profanityFilter) {
                                        window.$profanityFilter.processVoiceResult(arg.text);
                                    }
                                } else if (typeof arg === 'string' && arg.trim()) {
                                    console.log(`[ProfanityFilter] ${methodName}检测(字符串):`, arg);
                                    if (window.$profanityFilter) {
                                        window.$profanityFilter.processVoiceResult(arg);
                                    }
                                }
                            }
                            
                            return original(...args);
                        };
                        
                        console.log(`[ProfanityFilter] 已Hook ${methodName}`);
                    }
                });
            }
        };
        
        // 延迟执行暴力Hook
        setTimeout(hookAllMethods, 100);
        setTimeout(hookAllMethods, 1000);
        setTimeout(hookAllMethods, 3000);
        
        console.log('[ProfanityFilter] 脏话检测系统集成完成');
    };
    
    // 多重时机集成
    const _Scene_Boot_create = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function() {
        _Scene_Boot_create.call(this);
        
        // 立即尝试集成
        setTimeout(() => {
            integrateProfanityFilter();
        }, 100);
        
        // 延迟重试集成
        setTimeout(() => {
            integrateProfanityFilter();
        }, 1000);
        
        // 最后一次集成
        setTimeout(() => {
            integrateProfanityFilter();
        }, 3000);
    };
    
    // 插件命令支持
    PluginManager.registerCommand(pluginName, "toggleFilter", args => {
        if (window.$profanityFilter) {
            const enabled = args.enabled === 'true';
            window.$profanityFilter.setEnabled(enabled);
            $gameMessage.add(`脏话检测已${enabled ? '启用' : '禁用'}`);
        }
    });
    
    PluginManager.registerCommand(pluginName, "addWord", args => {
        if (window.$profanityFilter && args.word) {
            window.$profanityFilter.addCustomWord(args.word);
            $gameMessage.add(`已添加自定义词汇: ${args.word}`);
        }
    });
    
    PluginManager.registerCommand(pluginName, "showStats", args => {
        if (window.$profanityFilter) {
            const stats = window.$profanityFilter.getStats();
            $gameMessage.add(`脏话检测统计:`);
            $gameMessage.add(`状态: ${stats.enabled ? '启用' : '禁用'}`);
            $gameMessage.add(`词库大小: ${stats.wordCount}`);
            $gameMessage.add(`检测次数: ${stats.detectedCount}`);
        }
    });
    
})();

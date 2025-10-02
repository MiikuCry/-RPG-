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
    
    // 添加全局测试函数
    window.testProfanityFilter = function(text = "我操") {
        console.log('=== 脏话检测测试 ===');
        console.log('测试文本:', text);
        
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return false;
        }
        
        return window.$profanityFilter.testDetection(text);
    };
    
    // 添加全局状态查看函数
    window.checkProfanityFilter = function() {
        console.log('=== 脏话检测器状态 ===');
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        
        const stats = window.$profanityFilter.getStats();
        console.log('状态:', stats.enabled ? '启用' : '禁用');
        console.log('词库大小:', stats.wordCount);
        console.log('检测次数:', stats.detectedCount);
        console.log('音效列表:', window.$profanityFilter.beepSounds);
        
        return stats;
    };
    
    // 添加语音监听器 - 强制监听所有console.log
    window.enableVoiceLogging = function() {
        console.log('=== 启用语音日志监听 ===');
        
        const originalLog = console.log;
        console.log = function(...args) {
            // 调用原始log
            originalLog.apply(console, args);
            
            // 检查是否包含语音识别相关的文本
            const text = args.join(' ');
            
            // 查找可能的语音文本
            if (text.includes('识别结果:') || text.includes('解析命令:') || text.includes('Google') || text.includes('CommandSystem')) {
                // 尝试提取文本内容
                const matches = text.match(/[：:]\s*([^(（,，\s]+)/);
                if (matches && matches[1] && window.$profanityFilter) {
                    const voiceText = matches[1].trim();
                    if (voiceText && voiceText.length > 0) {
                        console.log('🎯 [强制检测] 从日志中提取到语音文本:', voiceText);
                        window.$profanityFilter.processVoiceResult(voiceText);
                    }
                }
            }
        };
        
        console.log('✅ 语音日志监听已启用，现在说话试试！');
    };
    
    // 添加手动强制检测函数
    window.forceCheckProfanity = function(text) {
        console.log('=== 强制检测 ===');
        if (!window.$profanityFilter) {
            console.error('脏话检测器未初始化！');
            return;
        }
        
        console.log('强制检测文本:', text);
        return window.$profanityFilter.processVoiceResult(text);
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
                    console.log('[ProfanityFilter] BaseProvider检测:', text);
                    window.$profanityFilter.processVoiceResult(text);
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

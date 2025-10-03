/**
 * CommandSystem.js - 命令系统模块（完整修复版）
 * 
 * 修复内容：
 * 1. 战斗中方向键支持
 * 2. 上下文切换优化
 * 3. 同音字识别增强
 * 4. 解决"向右"被识别为"上"的问题
 * 
 * @author 不想做工-接桀桀
 * @version 2.6.0
 */

class CommandSystem {
    constructor() {
        // 命令存储
        this.commands = new Map();
        this.aliases = new Map();
        
        // 当前状态
        this.currentContext = 'game';
        this.enabled = true;
        
        // 配置
        this.config = {
            fuzzyMatchThreshold: 0.6,
            enablePartialMatch: true,
            enableContextFilter: true,
            preferLongerMatches: true,
            enablePhoneticMatch: true,
            enableCache: true
        };
        
        // 统计
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            commandHistory: []
        };
        
        // 性能优化：缓存
        this.matchCache = new Map();
        this.cacheTimeout = 5000;
        this.lastCacheClear = Date.now();
        
        // 快速查找表
        this.quickLookup = new Map();
        
        // 更精确的同音字映射系统
        this.phoneticMappings = {
            // 方向相关 - 更严格的映射
            directionMappings: {
                // 上
                '伤': { action: 'up', confidence: 0.9 },
                '少': { action: 'up', confidence: 0.85 },
                '尚': { action: 'up', confidence: 0.85 },
                '商': { action: 'up', confidence: 0.8 },
                '赏': { action: 'up', confidence: 0.8 },
                
                // 下
                '夏': { action: 'down', confidence: 0.9 },
                '吓': { action: 'down', confidence: 0.85 },
                '虾': { action: 'down', confidence: 0.8 },
                
                // 左
                '作': { action: 'left', confidence: 0.9 },
                '做': { action: 'left', confidence: 0.9 },
                '坐': { action: 'left', confidence: 0.85 },
                '座': { action: 'left', confidence: 0.8 },
                
                // 右
                '有': { action: 'right', confidence: 0.9 },
                '又': { action: 'right', confidence: 0.9 },
                '油': { action: 'right', confidence: 0.85 },
                '佑': { action: 'right', confidence: 0.8 },
                '友': { action: 'right', confidence: 0.8 }
            },
            
            // 组合词映射 - 处理"向X"的情况
            compoundMappings: {
                // 向上的变体
                '想上': { action: 'up', confidence: 0.85 },
                '像上': { action: 'up', confidence: 0.8 },
                '响上': { action: 'up', confidence: 0.75 },
                
                // 向下的变体
                '想下': { action: 'down', confidence: 0.85 },
                '像下': { action: 'down', confidence: 0.8 },
                '响下': { action: 'down', confidence: 0.75 },
                
                // 向左的变体
                '想左': { action: 'left', confidence: 0.85 },
                '像左': { action: 'left', confidence: 0.8 },
                '响左': { action: 'left', confidence: 0.75 },
                
                // 向右的变体
                '想右': { action: 'right', confidence: 0.85 },
                '像右': { action: 'right', confidence: 0.8 },
                '响右': { action: 'right', confidence: 0.75 },
                '香油': { action: 'right', confidence: 0.7 }, // "向右"可能被识别为"香油"
                '想有': { action: 'right', confidence: 0.75 }
            },
            
            // 动作相关
            actionMappings: {
                '是': { action: 'ok', confidence: 0.9 },
                '事': { action: 'ok', confidence: 0.85 },
                '好': { action: 'ok', confidence: 0.9 },
                '号': { action: 'ok', confidence: 0.85 },
                '浩': { action: 'ok', confidence: 0.8 },
                
                '才但': { action: 'escape', confidence: 0.85 },
                '彩单': { action: 'escape', confidence: 0.85 },
                '菜但': { action: 'escape', confidence: 0.8 },
                '才蛋': { action: 'escape', confidence: 0.8 }
            },

            // 战斗专用映射
            battleMappings: {
                '却定': { action: 'ok', confidence: 0.9 },
                '缺订': { action: 'ok', confidence: 0.85 },
                '确订': { action: 'ok', confidence: 0.95 },
                '却消': { action: 'cancel', confidence: 0.9 },
                '缺小': { action: 'cancel', confidence: 0.85 },
                '攻鸡': { action: 'ok', confidence: 0.8 }, // "攻击"的误识别
                '功击': { action: 'ok', confidence: 0.85 }
            }
        };
        
        // 精简的同音字映射（保留用于快速查找）
        this.quickPhonetics = {
            '少': 'up',
            '伤': 'up',
            '尚': 'up',
            '又': 'right',
            '有': 'right',
            '油': 'right',
            '夏': 'down',
            '吓': 'down',
            '作': 'left',
            '做': 'left',
            '坐': 'left',
            '才但': 'escape',
            '彩单': 'escape',
            '菜但': 'escape',
            '西通': 'escape',
            '西统': 'escape',
            '事': 'ok',
            '是的': 'ok',
            '号': 'ok',
            '好的': 'ok'
        };
        
        // 初始化默认命令
        this.initializeDefaultCommands();
        
        // 预编译快速查找表
        this.buildQuickLookup();
        
        console.log('[CommandSystem] 同音字映射系统已更新，支持更精确的方向识别');

        // 百度语音识别优化
        this.baiduOptimizations = {
            // 百度容易误识别的词汇映射
            corrections: {
                '像上': '向上',
                '想上': '向上',
                '像下': '向下',
                '想下': '向下',
                '像左': '向左',
                '想左': '向左',
                '像右': '向右',
                '想右': '向右',
                '香油': '向右',
                '想有': '向右',
                '确人': '确认',
                '却人': '确认',
                '在但': '菜单',
                '彩但': '菜单',
                // 方向相关
                '伤': '上',
                '想上': '向上',
                '想下': '向下',
                '想左': '向左',
                '想右': '向右',
                '有': '右',
                '又': '右',
                
                // 确认相关
                '好的': 'ok',
                '可以': 'ok',
                '行': 'ok',
                '确认': '确定',
                '去人': '确认',
                
                // 取消相关
                '不': '取消',
                '算了': '取消',
                '返回': '取消'
            }
        };
    }
    
    /**
     * 构建快速查找表
     */
    buildQuickLookup() {
        console.log('[CommandSystem] 构建快速查找表...');
        
        const actionMap = new Map();
        
        for (const [id, command] of this.commands) {
            if (!actionMap.has(command.action)) {
                actionMap.set(command.action, []);
            }
            
            const shortestPattern = command.patterns
                .sort((a, b) => a.length - b.length)[0];
            
            actionMap.get(command.action).push({
                pattern: shortestPattern.toLowerCase(),
                command: command,
                length: shortestPattern.length
            });
        }
        
        for (const [action, patterns] of actionMap) {
            patterns.sort((a, b) => a.length - b.length);
            this.quickLookup.set(action, patterns[0]);
        }
        
        console.log('[CommandSystem] 快速查找表构建完成');
    }
    
    /**
     * 初始化默认命令集 - 优化版
     */
    initializeDefaultCommands() {
        // 移动命令 - 优化模式，避免歧义
        this.registerCommand('move_up', {
            patterns: ['上', '向上', '往上', '上走', '上面', '少', '伤', '傷'],
            action: 'up',
            contexts: ['game', 'menu', 'battle'],
            description: '向上移动/选择',
            priority: 10
        });
        
        this.registerCommand('move_down', {
            patterns: ['下', '向下', '往下', '下走', '下面', '夏', '吓', '嚇'],
            action: 'down',
            contexts: ['game', 'menu', 'battle'],
            description: '向下移动/选择',
            priority: 10
        });
        
        this.registerCommand('move_left', {
            patterns: ['左', '向左', '往左', '左走', '左边', '左转', '作', '做', '坐', '左邊', '左轉'],
            action: 'left',
            contexts: ['game', 'menu', 'battle'],
            description: '向左移动/选择',
            priority: 10
        });
        
        this.registerCommand('move_right', {
            patterns: ['右', '向右', '往右', '右走', '右边', '右转', '有', '又', '油', '右邊', '右轉'],
            action: 'right',
            contexts: ['game', 'menu', 'battle'],
            description: '向右移动/选择',
            priority: 10
        });
        
        // 交互命令
        this.registerCommand('interact', {
            patterns: ['确认', '确定', '是', '好', '互动', '进入', '选择', 'OK', '事', '号', '可以', '確認', '確定', '互動', '進入', '選擇', '號'],
            action: 'ok',
            contexts: ['game', 'dialogue', 'menu', 'message', 'battle'],
            description: '确认/交互',
            priority: 8
        });
        
        this.registerCommand('cancel', {
            patterns: ['取消', '返回', '退出', '不', '否', '后退', '关闭', '算了', '後退', '關閉'],
            action: 'cancel',
            contexts: ['game', 'dialogue', 'menu', 'message', 'battle'],
            description: '取消/返回',
            priority: 8
        });
        
        // 菜单命令
        this.registerCommand('menu', {
            patterns: ['菜单', '系统', '设置', '暂停', '打开菜单', 'ESC',
                      '才但', '彩单', '西通', '西统', '菜單', '系統', '設置', '暫停', '打開菜單'],
            action: 'escape',
            contexts: ['game', 'map'],
            description: '打开菜单',
            priority: 9
        });
        
        // 战斗专用命令
        this.registerCommand('attack', {
            patterns: ['攻击', '打击', '普攻', '打', '击', '进攻', '攻擊', '打擊', '進攻'],
            action: 'ok',
            contexts: ['battle'],
            description: '普通攻击',
            priority: 7
        });
        
        this.registerCommand('skill', {
            patterns: ['技能', '魔法', '法术', '咒语', '法術', '咒語'],
            action: 'skill',
            contexts: ['battle'],
            description: '使用技能',
            priority: 7
        });
        
        this.registerCommand('item', {
            patterns: ['物品', '道具', '使用物品', '用道具'],
            action: 'item',
            contexts: ['battle'],
            description: '使用物品',
            priority: 7
        });
        
        this.registerCommand('guard', {
            patterns: ['防御', '防守', '格挡', '守护', '防禦', '格擋', '守護'],
            action: 'guard',
            contexts: ['battle'],
            description: '防御',
            priority: 7
        });
        
        this.registerCommand('escape_battle', {
            patterns: ['逃跑', '逃走', '撤退', '跑', '逃离'],
            action: 'escape',
            contexts: ['battle'],
            description: '逃离战斗',
            priority: 7
        });
        
        // 战斗目标选择
        this.registerCommand('target_enemy', {
            patterns: ['敌人', '怪物', '目标', '那个', '敵人', '那個'],
            action: 'ok',
            contexts: ['battle'],
            description: '选择敌人',
            priority: 6
        });
        
        // 翻页命令
        this.registerCommand('page_up', {
            patterns: ['上一页', '前一页', '翻上页', '上一頁', '前一頁', '翻上頁'],
            action: 'pageup',
            contexts: ['menu', 'battle'],
            description: '上一页',
            priority: 5
        });
        
        this.registerCommand('page_down', {
            patterns: ['下一页', '后一页', '翻下页', '下一頁', '後一頁', '翻下頁'],
            action: 'pagedown',
            contexts: ['menu', 'battle'],
            description: '下一页',
            priority: 5
        });
        
        console.log('[CommandSystem] 默认命令初始化完成，共注册', this.commands.size, '个命令');
    }
    
    /**
     * 优化的解析命令方法 - 解决方向识别问题
     */
    parseCommand(text, context = null) {
        if (!text || !this.enabled) return null;
        
        // 检查当前使用的提供商
        const currentProvider = window.$voiceRPG?.provider?.name || 
                            window.$voiceAdapter?.currentProviderName;
        
        // 如果是百度，使用特殊的标准化
        const normalizedText = currentProvider === 'BaiduProvider' 
            ? this.normalizeBaiduText(text)
            : this.normalizeText(text);
        
        // === 修复：定义 targetContext ===
        const targetContext = context || this.currentContext;
        
        // 检查缓存
        const now = Date.now();
        const cacheWindow = 500;
        const cacheKey = `${normalizedText}_${targetContext}`;
        
        if (this.config.enableCache) {
            const cached = this.matchCache.get(cacheKey);
            if (cached && (now - cached.timestamp) < cacheWindow) {
                console.log('[CommandSystem] 缓存命中:', normalizedText);
                return cached.result;
            }
        }
        
        console.log('[CommandSystem] 解析命令:', text, '标准化:', normalizedText, '上下文:', targetContext);
        
        // === 新增：方向命令特殊处理 ===
        // 先检查是否包含方向关键词
        const directionResult = this.checkDirectionCommand(normalizedText, targetContext);
        if (directionResult) {
            console.log('[CommandSystem] 方向命令匹配:', directionResult.action);
            const result = this.createCommandResult(directionResult, text, normalizedText, targetContext, directionResult.confidence);
            this.saveToCache(cacheKey, result, now);
            return result;
        }

        // 第一步：超快速直接查找
        const quickMatch = this.quickPhonetics[normalizedText];
        if (quickMatch) {
            const command = this.quickLookup.get(quickMatch);
            if (command && this.isContextMatch(command.command, targetContext)) {
                console.log('[CommandSystem] 快速匹配成功:', quickMatch);
                const result = this.createCommandResult(command.command, text, normalizedText, targetContext, 0.95);
                this.saveToCache(cacheKey, result, now);
                return result;
            }
        }
        
        // 第二步：直接别名查找
        const exactMatch = this.findExactMatch(normalizedText, targetContext);
        if (exactMatch) {
            console.log('[CommandSystem] 完整匹配成功:', exactMatch.id);
            const result = this.createCommandResult(exactMatch, text, normalizedText, targetContext, 1.0);
            this.saveToCache(cacheKey, result, now);
            return result;
        }
        
        // 第三步：快速包含匹配
        const quickContainMatch = this.findQuickContainMatch(normalizedText, targetContext);
        if (quickContainMatch && quickContainMatch.confidence >= 0.8) {
            console.log('[CommandSystem] 快速包含匹配成功:', quickContainMatch.id);
            const result = this.createCommandResult(quickContainMatch, text, normalizedText, targetContext, quickContainMatch.confidence);
            this.saveToCache(cacheKey, result, now);
            return result;
        }
        
        // 第四步：同音字匹配
        if (this.config.enablePhoneticMatch && normalizedText.length <= 4) {
            const phoneticMatch = this.findPhoneticMatch(normalizedText, targetContext);
            if (phoneticMatch && phoneticMatch.confidence >= 0.7) {
                console.log('[CommandSystem] 同音字匹配成功:', phoneticMatch.id);
                const result = this.createCommandResult(phoneticMatch, text, normalizedText, targetContext, phoneticMatch.confidence);
                this.saveToCache(cacheKey, result, now);
                return result;
            }
        }
        
        // 更新失败统计
        this.updateStats({ text }, false);
        console.log('[CommandSystem] 未找到匹配的命令');
        
        return null;
    }
    
    /**
     * 根据方向词获取方向
     */
    getDirectionFromWord(word) {
        const directionMap = {
            '上': 'up',
            '下': 'down', 
            '左': 'left',
            '右': 'right'
        };
        return directionMap[word] || null;
    }

    /**
     * 新增：智能方向命令检测
     */
    checkDirectionCommand(text, context) {
        // 方向命令的特征词（优化版 - 修复"向右"被识别为"上"的问题）
        const directionPatterns = {
            up: {
                keywords: ['上', '伤', '少', '尚'],
                prefixes: ['向', '往', '朝'],
                suffixes: ['走', '面', '方', '边'],
                exclude: ['向右', '向左', '向下', '想', '像', '响'], // 排除词
                fullPatterns: ['向上', '往上', '朝上', '上走', '上面', '上边', '上方'] // 完整模式
            },
            down: {
                keywords: ['下', '夏', '吓', '虾'],
                prefixes: ['向', '往', '朝'],
                suffixes: ['走', '面', '方', '边'],
                exclude: ['向上', '向左', '向右', '想', '像', '响'],
                fullPatterns: ['向下', '往下', '朝下', '下走', '下面', '下边', '下方']
            },
            left: {
                keywords: ['左', '作', '做', '坐'],
                prefixes: ['向', '往', '朝'],
                suffixes: ['走', '面', '方', '边', '转'],
                exclude: ['向上', '向下', '向右', '想', '像', '响'],
                fullPatterns: ['向左', '往左', '朝左', '左走', '左边', '左转', '左面', '左方']
            },
            right: {
                keywords: ['右', '有', '又', '油', '佑'],
                prefixes: ['向', '往', '朝'],
                suffixes: ['走', '面', '方', '边', '转'],
                exclude: ['向上', '向下', '向左', '想', '像', '响'],
                fullPatterns: ['向右', '往右', '朝右', '右走', '右边', '右转', '右面', '右方']
            }
        };
        
        // 检查每个方向（优化版 - 修复"向右"被识别为"上"的问题）
        for (const [direction, pattern] of Object.entries(directionPatterns)) {
            // 1. 首先检查完整模式匹配（优先级最高）
            for (const fullPattern of pattern.fullPatterns) {
                if (text === fullPattern || text.includes(fullPattern)) {
                    console.log(`[CommandSystem] 完整模式匹配: ${fullPattern} -> ${direction}`);
                    const command = this.getDirectionCommand(direction);
                    if (command && this.isContextMatch(command, context)) {
                        return {
                            ...command,
                            confidence: 1.0,
                            matchedText: fullPattern
                        };
                    }
                }
            }
            
            // 2. 检查排除词（如果包含排除词，跳过此方向）
            const hasExclude = pattern.exclude.some(exc => text.includes(exc));
            if (hasExclude) {
                console.log(`[CommandSystem] 包含排除词，跳过方向: ${direction}`);
                continue;
            }
            
            // 3. 特殊处理：如果文本以"向"开头，必须检查完整的方向词
            if (text.startsWith('向')) {
                // 只匹配"向" + 方向词的完整组合
                const directionWords = ['上', '下', '左', '右'];
                for (const dirWord of directionWords) {
                    if (text === '向' + dirWord || text.startsWith('向' + dirWord)) {
                        const targetDirection = this.getDirectionFromWord(dirWord);
                        if (targetDirection === direction) {
                            console.log(`[CommandSystem] 向字匹配: ${text} -> ${direction}`);
                            const command = this.getDirectionCommand(direction);
                            if (command && this.isContextMatch(command, context)) {
                                return {
                                    ...command,
                                    confidence: 0.95,
                                    matchedText: text
                                };
                            }
                        }
                    }
                }
                continue; // 如果是以"向"开头但不匹配任何方向，跳过
            }
            
            // 3. 检查是否包含方向关键词
            let matchScore = 0;
            let matchedKeyword = '';
            
            for (const keyword of pattern.keywords) {
                if (text.includes(keyword)) {
                    matchedKeyword = keyword;
                    
                    // 计算匹配分数（更严格的匹配规则）
                    if (text === keyword) {
                        matchScore = 1.0; // 完全匹配
                    } else if (text.length <= 4) {
                        // 短文本的精确匹配
                        for (const prefix of pattern.prefixes) {
                            if (text === prefix + keyword) {
                                matchScore = 0.95;
                                break;
                            }
                        }
                        
                        for (const suffix of pattern.suffixes) {
                            if (text === keyword + suffix) {
                                matchScore = 0.9;
                                break;
                            }
                        }
                        
                        // 组合匹配
                        for (const prefix of pattern.prefixes) {
                            for (const suffix of pattern.suffixes) {
                                if (text === prefix + keyword + suffix) {
                                    matchScore = 0.95;
                                    break;
                                }
                            }
                        }
                    } else {
                        // 长文本的包含匹配（降低优先级）
                        matchScore = 0.6;
                    }
                    
                    // 如果找到高分匹配，直接返回
                    if (matchScore >= 0.9) {
                        console.log(`[CommandSystem] 方向匹配成功: ${keyword} -> ${direction} (分数: ${matchScore})`);
                        const command = this.getDirectionCommand(direction);
                        if (command && this.isContextMatch(command, context)) {
                            return {
                                ...command,
                                confidence: matchScore,
                                matchedText: matchedKeyword
                            };
                        }
                    }
                }
            }
        }
        
        // === 特殊处理："向"字单独出现的情况 ===
        if (text === '向' || text === '想' || text === '像') {
            console.log('[CommandSystem] 单独的"向"字，不作为方向命令');
            return null;
        }
        
        return null;
    }
    
    /**
     * 获取方向命令
     */
    getDirectionCommand(direction) {
        const directionMap = {
            'up': 'move_up',
            'down': 'move_down',
            'left': 'move_left',
            'right': 'move_right'
        };
        
        const commandId = directionMap[direction];
        return commandId ? this.commands.get(commandId) : null;
    }
    
    /**
     * 快速包含匹配（优化版）
     */
    findQuickContainMatch(text, context) {
        for (const [id, command] of this.commands) {
            if (!this.isContextMatch(command, context)) continue;
            
            // 检查所有模式
            for (const pattern of command.patterns) {
                const normalizedPattern = pattern.toLowerCase();
                if (text.includes(normalizedPattern) || normalizedPattern.includes(text)) {
                    return {
                        ...command,
                        confidence: text === normalizedPattern ? 1.0 : 0.9
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * 改进的同音字匹配方法
     */
    findPhoneticMatch(text, context) {
        let bestMatch = null;
        let bestConfidence = 0;
        
        // 1. 检查单字方向映射
        if (text.length === 1) {
            const dirMapping = this.phoneticMappings.directionMappings[text];
            if (dirMapping) {
                const command = this.quickLookup.get(dirMapping.action);
                if (command && this.isContextMatch(command.command, context)) {
                    return {
                        ...command.command,
                        confidence: dirMapping.confidence
                    };
                }
            }
        }
        
        // 2. 检查组合词映射
        const compoundMapping = this.phoneticMappings.compoundMappings[text];
        if (compoundMapping) {
            const command = this.quickLookup.get(compoundMapping.action);
            if (command && this.isContextMatch(command.command, context)) {
                return {
                    ...command.command,
                    confidence: compoundMapping.confidence
                };
            }
        }
        
        // 3. 检查动作映射
        const actionMapping = this.phoneticMappings.actionMappings[text];
        if (actionMapping) {
            const command = this.quickLookup.get(actionMapping.action);
            if (command && this.isContextMatch(command.command, context)) {
                return {
                    ...command.command,
                    confidence: actionMapping.confidence
                };
            }
        }
        
        // 4. 智能分词检查（处理2-3个字的情况）
        if (text.length >= 2 && text.length <= 3) {
            // 检查是否是"X右"、"X左"等模式
            const lastChar = text.slice(-1);
            const firstPart = text.slice(0, -1);
            
            // 检查最后一个字是否是方向
            const dirMapping = this.phoneticMappings.directionMappings[lastChar];
            if (dirMapping) {
                // 检查前面的部分是否是"向"的同音字
                if (['向', '想', '像', '响'].includes(firstPart)) {
                    const command = this.quickLookup.get(dirMapping.action);
                    if (command && this.isContextMatch(command.command, context)) {
                        return {
                            ...command.command,
                            confidence: dirMapping.confidence * 0.9 // 稍微降低置信度
                        };
                    }
                }
            }
        }
        
        return bestMatch;
    }
    
    /**
     * 缓存管理
     */
    getFromCache(key) {
        const now = Date.now();
        if (now - this.lastCacheClear > this.cacheTimeout) {
            this.matchCache.clear();
            this.lastCacheClear = now;
        }
        
        const cached = this.matchCache.get(key);
        if (cached && now - cached.timestamp < this.cacheTimeout) {
            return cached.result;
        }
        
        return null;
    }
    
    saveToCache(key, result, timestamp) {
        if (this.config.enableCache) {
            this.matchCache.set(key, {
                result: result,
                timestamp: timestamp || Date.now()
            });
            
            if (this.matchCache.size > 100) {
                const firstKey = this.matchCache.keys().next().value;
                this.matchCache.delete(firstKey);
            }
        }
    }
    
    /**
     * 查找完整匹配
     */
    findExactMatch(text, context) {
        const commandId = this.aliases.get(text);
        if (commandId) {
            const command = this.commands.get(commandId);
            if (command && this.isContextMatch(command, context)) {
                return command;
            }
        }
        return null;
    }
    
    /**
     * 创建命令结果
     */
    createCommandResult(command, originalText, normalizedText, context, confidence) {
        const result = {
            id: command.id,
            action: command.action,
            text: originalText,
            normalizedText: normalizedText,
            context: context,
            confidence: confidence,
            timestamp: Date.now()
        };
        
        this.updateStats(result, true);
        
        return result;
    }
    
    /**
     * 检查上下文匹配
     * @private
     */
    isContextMatch(command, context) {
        if (!this.config.enableContextFilter) return true;
        if (!command.contexts || command.contexts.length === 0) return true;
        return command.contexts.includes(context);
    }
    
    /**
     * 优化文本标准化
     */
    normalizeText(text) {
        return text
            .trim()
            .toLowerCase()
            .replace(/[，。！？；：""''（）【】,.!?;:"'()\[\]]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    normalizeBaiduText(text) {
        // 先进行标准标准化
        let normalized = this.normalizeText(text);
        
        // 应用百度特定的纠正
        for (const [wrong, correct] of Object.entries(this.baiduOptimizations.corrections)) {
            if (normalized.includes(wrong)) {
                normalized = normalized.replace(wrong, correct);
                console.log('[CommandSystem] 百度纠正:', wrong, '->', correct);
            }
        }
        
        return normalized;
    }

    /**
     * 设置当前上下文
     * @param {string} context - 新的上下文
     */
    setContext(context) {
        if (this.currentContext !== context) {
            console.log('[CommandSystem] 上下文切换:', this.currentContext, '->', context);
            this.currentContext = context;
            // 清空缓存
            if (this.config.enableCache) {
                this.matchCache.clear();
            }
        }
    }
    
    /**
     * 注册新命令
     */
    registerCommand(id, config) {
        if (!id || !config || !config.patterns || !config.action) {
            console.error('[CommandSystem] 注册命令失败：参数无效');
            return false;
        }
        
        // 存储命令
        this.commands.set(id, {
            id: id,
            patterns: config.patterns,
            action: config.action,
            contexts: config.contexts || ['game'],
            description: config.description || '',
            priority: config.priority || 0
        });
        
        // 建立别名索引
        config.patterns.forEach(pattern => {
            this.aliases.set(pattern.toLowerCase(), id);
        });
        
        // 重建快速查找表
        this.buildQuickLookup();
        
        return true;
    }
    
    /**
     * 更新统计信息
     * @private
     */
    updateStats(command, success) {
        this.stats.totalCommands++;
        
        if (success) {
            this.stats.successfulCommands++;
            this.stats.commandHistory.push({
                text: command.text,
                action: command.action,
                timestamp: command.timestamp
            });
            
            if (this.stats.commandHistory.length > 50) {
                this.stats.commandHistory.shift();
            }
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} - 统计数据
     */
    getStats() {
        const successRate = this.stats.totalCommands > 0
            ? (this.stats.successfulCommands / this.stats.totalCommands * 100).toFixed(1)
            : 0;
            
        return {
            totalCommands: this.stats.totalCommands,
            successfulCommands: this.stats.successfulCommands,
            successRate: successRate + '%',
            recentCommands: this.stats.commandHistory.slice(-10),
            cacheSize: this.matchCache.size
        };
    }
    
    /**
     * 启用/禁用命令系统
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('[CommandSystem]', enabled ? '已启用' : '已禁用');
    }
    
    /**
     * 重置系统
     */
    reset() {
        this.currentContext = 'game';
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            commandHistory: []
        };
        this.matchCache.clear();
        console.log('[CommandSystem] 系统已重置');
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.matchCache.clear();
        this.lastCacheClear = Date.now();
        console.log('[CommandSystem] 缓存已清理');
    }
    
    /**
     * 获取可用命令列表
     */
    getAvailableCommands(context = null) {
        const targetContext = context || this.currentContext;
        const available = [];
        
        for (const [id, command] of this.commands) {
            if (this.isContextMatch(command, targetContext)) {
                available.push({
                    id: command.id,
                    patterns: command.patterns,
                    action: command.action,
                    description: command.description,
                    priority: command.priority
                });
            }
        }
        
        // 按优先级排序
        available.sort((a, b) => b.priority - a.priority);
        
        return available;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandSystem;
} else {
    window.CommandSystem = CommandSystem;
}
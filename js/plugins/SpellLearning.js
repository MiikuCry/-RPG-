/*:
 * @target MZ
 * @plugindesc Spell Learning System v2.0.0 - 咒语学习系统（完整版）
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 咒语学习系统插件 v2.0.0
 * ============================================================================
 * 
 * 这个插件全权管理角色的咒语学习、存储和读取功能。
 * 
 * 功能特性：
 * - 咒语学习/忘记管理
 * - 学习顺序记录
 * - 自动存档保存和读取
 * - 与SpellSystem.js完美集成
 * 
 * 插件命令：
 * 
 * 1. 学习咒语 - 让指定角色学习一个咒语
 * 2. 批量学习 - 让指定角色学习多个咒语
 * 3. 忘记咒语 - 让指定角色忘记一个咒语
 * 4. 检查咒语 - 检查角色是否学会了某个咒语
 * 
 * 脚本调用示例：
 * 
 * // 让1号角色学习火球术
 * $spellLearning.learnSpell(1, 'fire_ball');
 * 
 * // 让1号角色学习多个咒语
 * $spellLearning.learnSpells(1, ['fire_ball', 'ice_lance', 'heal']);
 * 
 * // 检查1号角色是否学会了火球术
 * if ($spellLearning.hasLearnedSpell(1, 'fire_ball')) {
 *     // 已学会
 * }
 * 
 * // 获取角色已学会的咒语列表（按学习顺序）
 * const spells = $spellLearning.getLearnedSpells(1);
 * 
 * @command learnSpell
 * @text 学习咒语
 * @desc 让指定角色学习一个咒语
 * 
 * @arg actorId
 * @text 角色ID
 * @desc 要学习咒语的角色ID
 * @type actor
 * @default 1
 * 
 * @arg spellId
 * @text 咒语ID
 * @desc 要学习的咒语ID
 * @type select
 * @option 火球术
 * @value fire_ball
 * @option 冰枪术
 * @value ice_lance
 * @option 雷电术
 * @value thunder_bolt
 * @option 地狱火
 * @value inferno
 * @option 暴风雪
 * @value blizzard
 * @option 治愈术
 * @value heal
 * @option 净化术
 * @value purify
 * @option 终极魔法
 * @value ultima
 * @option 魔法少女变身
 * @value magical_girl
 * @default fire_ball
 * 
 * @command learnMultipleSpells
 * @text 批量学习咒语
 * @desc 让指定角色学习多个咒语
 * 
 * @arg actorId
 * @text 角色ID
 * @desc 要学习咒语的角色ID
 * @type actor
 * @default 1
 * 
 * @arg spellIds
 * @text 咒语列表
 * @desc 要学习的咒语ID列表，用逗号分隔
 * @type string
 * @default fire_ball,ice_lance,heal
 * 
 * @command forgetSpell
 * @text 忘记咒语
 * @desc 让指定角色忘记一个咒语
 * 
 * @arg actorId
 * @text 角色ID
 * @desc 要忘记咒语的角色ID
 * @type actor
 * @default 1
 * 
 * @arg spellId
 * @text 咒语ID
 * @desc 要忘记的咒语ID
 * @type string
 * @default fire_ball
 * 
 * @command checkSpell
 * @text 检查咒语
 * @desc 检查角色是否学会了某个咒语，结果存储在开关中
 * 
 * @arg actorId
 * @text 角色ID
 * @desc 要检查的角色ID
 * @type actor
 * @default 1
 * 
 * @arg spellId
 * @text 咒语ID
 * @desc 要检查的咒语ID
 * @type string
 * @default fire_ball
 * 
 * @arg switchId
 * @text 开关ID
 * @desc 存储结果的开关ID（ON=已学会，OFF=未学会）
 * @type switch
 * @default 1
 */

(() => {
    'use strict';
    
    const pluginName = 'SpellLearning';
    
    // 创建全局SpellLearning系统
    window.$spellLearning = {
        // 学习的咒语数据
        learnedSpells: new Map(),
        
        /**
         * 学习咒语
         */
        learnSpell(actorId, spellId) {
            // 确保角色有学习记录
            if (!this.learnedSpells.has(actorId)) {
                this.learnedSpells.set(actorId, new Set());
            }
            
            // 检查是否已经学会
            const wasAlreadyLearned = this.learnedSpells.get(actorId).has(spellId);
            this.learnedSpells.get(actorId).add(spellId);
            
            // 更新角色数据
            const actor = $gameActors.actor(actorId);
            if (actor) {
                actor._learnedSpells = Array.from(this.learnedSpells.get(actorId));
                
                // 记录学习顺序
                if (!actor._learnedSpellsOrder) {
                    actor._learnedSpellsOrder = [];
                }
                
                // 只有新学的咒语才添加到顺序列表末尾
                if (!wasAlreadyLearned && !actor._learnedSpellsOrder.includes(spellId)) {
                    actor._learnedSpellsOrder.push(spellId);
                    console.log(`[SpellLearning] 角色${actorId}学会咒语: ${spellId}，学习顺序: ${actor._learnedSpellsOrder.join(', ')}`);
                }
            }
            
            console.log(`[SpellLearning] 角色${actorId}学会了咒语: ${spellId}`);
        },
        
        /**
         * 批量学习咒语
         */
        learnSpells(actorId, spellIds) {
            spellIds.forEach(spellId => this.learnSpell(actorId, spellId));
        },
        
        /**
         * 忘记咒语
         */
        forgetSpell(actorId, spellId) {
            if (this.learnedSpells.has(actorId)) {
                this.learnedSpells.get(actorId).delete(spellId);
                
                // 更新角色数据
                const actor = $gameActors.actor(actorId);
                if (actor) {
                    actor._learnedSpells = Array.from(this.learnedSpells.get(actorId));
                    
                    // 从学习顺序中移除
                    if (actor._learnedSpellsOrder) {
                        const index = actor._learnedSpellsOrder.indexOf(spellId);
                        if (index > -1) {
                            actor._learnedSpellsOrder.splice(index, 1);
                        }
                    }
                }
                
                console.log(`[SpellLearning] 角色${actorId}忘记了咒语: ${spellId}`);
            }
        },
        
        /**
         * 检查是否学会咒语
         */
        hasLearnedSpell(actorId, spellId) {
            // 首先检查内存中的数据
            if (this.learnedSpells.has(actorId)) {
                return this.learnedSpells.get(actorId).has(spellId);
            }
            
            // 回退到检查角色数据
            const actor = $gameActors.actor(actorId);
            if (actor && actor._learnedSpells) {
                // 同步到内存
                this.learnedSpells.set(actorId, new Set(actor._learnedSpells));
                return actor._learnedSpells.includes(spellId);
            }
            
            return false;
        },
        
        /**
         * 获取已学会的咒语列表（按学习顺序）
         */
        getLearnedSpells(actorId) {
            const learned = [];
            const spellIds = this.learnedSpells.get(actorId) || new Set();
            
            // 如果角色有学习顺序记录，按顺序返回
            const actor = $gameActors.actor(actorId);
            if (actor && actor._learnedSpellsOrder) {
                // 按学习顺序遍历
                for (const spellId of actor._learnedSpellsOrder) {
                    if (spellIds.has(spellId) && window.$spellSystem && window.$spellSystem.spells.has(spellId)) {
                        learned.push(window.$spellSystem.spells.get(spellId));
                    }
                }
                
                // 添加任何在Set中但不在顺序列表中的咒语（兼容性处理）
                for (const spellId of spellIds) {
                    if (!actor._learnedSpellsOrder.includes(spellId) && window.$spellSystem && window.$spellSystem.spells.has(spellId)) {
                        learned.push(window.$spellSystem.spells.get(spellId));
                    }
                }
            } else {
                // 如果没有学习顺序，按Set顺序返回
                for (const spellId of spellIds) {
                    if (window.$spellSystem && window.$spellSystem.spells.has(spellId)) {
                        learned.push(window.$spellSystem.spells.get(spellId));
                    }
                }
            }
            
            return learned;
        },
        
        /**
         * 初始化角色咒语数据
         */
        initializeActorSpells(actorId) {
            if (!this.learnedSpells.has(actorId)) {
                this.learnedSpells.set(actorId, new Set());
            }
            
            const actor = $gameActors.actor(actorId);
            if (actor) {
                if (!actor._learnedSpells) {
                    actor._learnedSpells = [];
                }
                if (!actor._learnedSpellsOrder) {
                    actor._learnedSpellsOrder = [];
                }
            }
        }
    };
    
    // 注册插件命令
    PluginManager.registerCommand(pluginName, 'learnSpell', args => {
        const actorId = Number(args.actorId) || 1;
        const spellId = args.spellId || 'fire_ball';
        
        window.$spellLearning.learnSpell(actorId, spellId);
        
        // 显示提示信息
        const actor = $gameActors.actor(actorId);
        if (window.$spellSystem && window.$spellSystem.spells.has(spellId)) {
            const spell = window.$spellSystem.spells.get(spellId);
            if (actor && spell) {
                $gameMessage.add(`\\C[3]${actor.name()}\\C[0]学会了\\C[2]${spell.name}\\C[0]！`);
            }
        }
    });
    
    PluginManager.registerCommand(pluginName, 'learnMultipleSpells', args => {
        const actorId = Number(args.actorId) || 1;
        const spellIds = args.spellIds.split(',').map(id => id.trim());
        
        window.$spellLearning.learnSpells(actorId, spellIds);
        
        // 显示提示信息
        const actor = $gameActors.actor(actorId);
        if (actor) {
            $gameMessage.add(`\\C[3]${actor.name()}\\C[0]学会了\\C[2]${spellIds.length}\\C[0]个咒语！`);
        }
    });
    
    PluginManager.registerCommand(pluginName, 'forgetSpell', args => {
        const actorId = Number(args.actorId) || 1;
        const spellId = args.spellId || 'fire_ball';
        
        window.$spellLearning.forgetSpell(actorId, spellId);
        
        // 显示提示信息
        const actor = $gameActors.actor(actorId);
        if (window.$spellSystem && window.$spellSystem.spells.has(spellId)) {
            const spell = window.$spellSystem.spells.get(spellId);
            if (actor && spell) {
                $gameMessage.add(`\\C[3]${actor.name()}\\C[0]忘记了\\C[2]${spell.name}\\C[0]！`);
            }
        }
    });
    
    PluginManager.registerCommand(pluginName, 'checkSpell', args => {
        const actorId = Number(args.actorId) || 1;
        const spellId = args.spellId || 'fire_ball';
        const switchId = Number(args.switchId) || 1;
        
        const hasLearned = window.$spellLearning.hasLearnedSpell(actorId, spellId);
        $gameSwitches.setValue(switchId, hasLearned);
        
        console.log(`[SpellLearning] 检查角色${actorId}是否学会咒语${spellId}: ${hasLearned}`);
    });
    
    // === 存档系统 ===
    
    // 保存：把咒语学习数据序列化到存档
    const _DM_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DM_makeSaveContents.call(this);
        try {
            if (window.$spellLearning && window.$spellLearning.learnedSpells) {
                const serialized = {};
                for (const [actorId, set] of window.$spellLearning.learnedSpells.entries()) {
                    serialized[actorId] = Array.from(set);
                }
                contents._spellLearning = contents._spellLearning || {};
                contents._spellLearning.learnedSpells = serialized;
                
                // 同时保存学习顺序
                const orderData = {};
                for (let i = 1; i <= $dataActors.length - 1; i++) {
                    const actor = $gameActors.actor(i);
                    if (actor && actor._learnedSpellsOrder) {
                        orderData[i] = actor._learnedSpellsOrder;
                    }
                }
                contents._spellLearning.learnedSpellsOrder = orderData;
                
                console.log('[SpellLearning] 保存咒语学习数据:', serialized);
            }
        } catch (e) {
            console.warn('[SpellLearning] 保存数据时出错:', e);
        }
        return contents;
    };
    
    // 读取：从存档恢复咒语学习数据
    const _DM_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DM_extractSaveContents.call(this, contents);
        try {
            const payload = contents && contents._spellLearning;
            if (window.$spellLearning && payload) {
                // 恢复学习的咒语
                if (payload.learnedSpells) {
                    const restored = new Map();
                    Object.keys(payload.learnedSpells).forEach(key => {
                        const actorId = Number(key);
                        restored.set(actorId, new Set(payload.learnedSpells[key] || []));
                    });
                    window.$spellLearning.learnedSpells = restored;
                    
                    // 同步到角色实例
                    if ($gameActors && typeof $gameActors.actor === 'function') {
                        restored.forEach((set, actorId) => {
                            const actor = $gameActors.actor(actorId);
                            if (actor) {
                                actor._learnedSpells = Array.from(set);
                            }
                        });
                    }
                }
                
                // 恢复学习顺序
                if (payload.learnedSpellsOrder) {
                    Object.keys(payload.learnedSpellsOrder).forEach(key => {
                        const actorId = Number(key);
                        const actor = $gameActors.actor(actorId);
                        if (actor) {
                            actor._learnedSpellsOrder = payload.learnedSpellsOrder[actorId];
                        }
                    });
                }
                
                console.log('[SpellLearning] 成功恢复咒语学习数据:', payload);
            } else {
                console.log('[SpellLearning] 存档中没有咒语学习数据');
            }
        } catch (e) {
            console.warn('[SpellLearning] 读取数据时出错:', e);
        }
    };
    
    // 游戏开始时初始化
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        // 延迟初始化，确保所有系统都已加载
        setTimeout(() => {
            // 检查SpellSystem依赖
            if (!window.$spellSystem) {
                console.warn('[SpellLearning] SpellSystem 未找到，延迟初始化');
                setTimeout(() => {
                    initializeSpellLearning();
                }, 2000);
            } else {
                initializeSpellLearning();
            }
        }, 1000);
    };
    
    // 初始化SpellLearning系统
    function initializeSpellLearning() {
        if (window.$spellLearning && window.$spellSystem) {
            // 为所有角色初始化咒语数据
            for (let i = 1; i <= $dataActors.length - 1; i++) {
                if ($dataActors[i]) {
                    window.$spellLearning.initializeActorSpells(i);
                    console.log(`[SpellLearning] 角色${i}咒语数据已初始化`);
                }
            }
            console.log('[SpellLearning] 咒语学习系统初始化完成');
            console.log('[SpellLearning] 可用咒语:', Array.from(window.$spellSystem.spells.keys()));
        } else {
            console.error('[SpellLearning] 初始化失败：缺少必要依赖');
        }
    }
    
})();
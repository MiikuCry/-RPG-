/*:
 * @target MZ
 * @plugindesc Spell Learning System v1.0.0 - 咒语学习系统
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 咒语学习系统插件
 * ============================================================================
 * 
 * 这个插件提供了让角色学习咒语的功能。
 * 
 * 插件命令：
 * 
 * 1. 学习咒语
 *    让指定角色学习一个咒语
 * 
 * 2. 批量学习
 *    让指定角色学习多个咒语
 * 
 * 3. 忘记咒语
 *    让指定角色忘记一个咒语
 * 
 * 4. 检查咒语
 *    检查角色是否学会了某个咒语
 * 
 * 脚本调用示例：
 * 
 * // 让1号角色学习火球术
 * $spellSystem.learnSpell(1, 'fire_ball');
 * 
 * // 让1号角色学习多个咒语
 * $spellSystem.learnSpells(1, ['fire_ball', 'ice_lance', 'heal']);
 * 
 * // 检查1号角色是否学会了火球术
 * if ($spellSystem.hasLearnedSpell(1, 'fire_ball')) {
 *     // 已学会
 * }
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
    
    // 注册插件命令
    PluginManager.registerCommand(pluginName, 'learnSpell', args => {
        const actorId = Number(args.actorId) || 1;
        const spellId = args.spellId || 'fire_ball';
        
        if (window.$spellSystem) {
            window.$spellSystem.learnSpell(actorId, spellId);
            
            // 显示提示信息
            const actor = $gameActors.actor(actorId);
            const spell = window.$spellSystem.spells.get(spellId);
            if (actor && spell) {
                $gameMessage.add(`\\C[3]${actor.name()}\\C[0]学会了\\C[2]${spell.name}\\C[0]！`);
            }
        }
    });
    
    PluginManager.registerCommand(pluginName, 'learnMultipleSpells', args => {
        const actorId = Number(args.actorId) || 1;
        const spellIds = args.spellIds.split(',').map(id => id.trim());
        
        if (window.$spellSystem) {
            window.$spellSystem.learnSpells(actorId, spellIds);
            
            // 显示提示信息
            const actor = $gameActors.actor(actorId);
            if (actor) {
                $gameMessage.add(`\\C[3]${actor.name()}\\C[0]学会了多个咒语！`);
            }
        }
    });
    
    PluginManager.registerCommand(pluginName, 'forgetSpell', args => {
        const actorId = Number(args.actorId) || 1;
        const spellId = args.spellId || 'fire_ball';
        
        if (window.$spellSystem && window.$spellSystem.learnedSpells.has(actorId)) {
            window.$spellSystem.learnedSpells.get(actorId).delete(spellId);
            
            // 更新角色数据
            const actor = $gameActors.actor(actorId);
            if (actor) {
                actor._learnedSpells = Array.from(window.$spellSystem.learnedSpells.get(actorId));
            }
            
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
        
        if (window.$spellSystem) {
            const hasLearned = window.$spellSystem.hasLearnedSpell(actorId, spellId);
            $gameSwitches.setValue(switchId, hasLearned);
        }
    });
    
    // 游戏开始时初始化角色咒语
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        // 延迟初始化，等待咒语系统加载
        setTimeout(() => {
            if (window.$spellSystem) {
                // 为所有角色初始化基础咒语
                for (let i = 1; i <= $dataActors.length - 1; i++) {
                    if ($dataActors[i]) {
                        window.$spellSystem.initializeActorSpells(i);
                    }
                }
                console.log('[SpellLearning] 角色咒语初始化完成');
            }
        }, 1000);
    };
    
    // 保存和加载咒语学习数据
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        
        if (window.$spellSystem) {
            // 保存学习的咒语数据
            contents.learnedSpells = {};
            window.$spellSystem.learnedSpells.forEach((spells, actorId) => {
                contents.learnedSpells[actorId] = Array.from(spells);
            });
        }
        
        return contents;
    };
    
    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        
        if (window.$spellSystem && contents.learnedSpells) {
            // 恢复学习的咒语数据
            window.$spellSystem.learnedSpells.clear();
            
            for (const actorId in contents.learnedSpells) {
                window.$spellSystem.learnedSpells.set(
                    Number(actorId), 
                    new Set(contents.learnedSpells[actorId])
                );
            }
        }
    };
    
})();
/*:
 * @target MZ
 * @plugindesc Spell Auto Initialize v1.0.0 - 咒语自动初始化
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 咒语自动初始化插件
 * ============================================================================
 * 
 * 自动为所有角色初始化基础咒语
 * 
 * @param autoLearnOnStart
 * @text 游戏开始时自动学习
 * @desc 新游戏开始时自动学习基础咒语
 * @type boolean
 * @default true
 * 
 * @param autoLearnOnBattle
 * @text 战斗时自动检查
 * @desc 进入战斗时如果没有咒语则自动学习
 * @type boolean
 * @default true
 * 
 * @param basicSpells
 * @text 基础咒语列表
 * @desc 自动学习的基础咒语ID，用逗号分隔
 * @type string
 * @default fire_ball,ice_lance,thunder_bolt,heal
 */

(() => {
    'use strict';
    
    const pluginName = 'SpellAutoInit';
    const parameters = PluginManager.parameters(pluginName);
    const autoLearnOnStart = parameters['autoLearnOnStart'] !== 'false';
    const autoLearnOnBattle = parameters['autoLearnOnBattle'] !== 'false';
    const basicSpells = parameters['basicSpells'].split(',').map(s => s.trim());
    
    // 新游戏开始时
    const _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _DataManager_setupNewGame.call(this);
        
        if (autoLearnOnStart) {
            // 延迟执行，确保系统初始化完成
            setTimeout(() => {
                if (window.$spellSystem) {
                    // 为队伍中的所有角色学习基础咒语
                    $gameParty.allMembers().forEach(actor => {
                        window.$spellSystem.learnSpells(actor.actorId(), basicSpells);
                        console.log(`[SpellAutoInit] ${actor.name()}学会了基础咒语`);
                    });
                }
            }, 100);
        }
    };
    
    // 战斗开始时检查
    if (autoLearnOnBattle) {
        const _BattleManager_setup = BattleManager.setup;
        BattleManager.setup = function(troopId, canEscape, canLose) {
            _BattleManager_setup.call(this, troopId, canEscape, canLose);
            
            if (window.$spellSystem) {
                // 检查队伍成员是否有咒语
                $gameParty.battleMembers().forEach(actor => {
                    const actorId = actor.actorId();
                    const learnedSpells = window.$spellSystem.learnedSpells.get(actorId);
                    
                    if (!learnedSpells || learnedSpells.size === 0) {
                        window.$spellSystem.learnSpells(actorId, basicSpells);
                        console.log(`[SpellAutoInit] 战斗初始化：${actor.name()}学会了基础咒语`);
                    }
                });
            }
        };
    }
    
    // 读取存档时恢复咒语数据
    const _Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function() {
        _Scene_Load_onLoadSuccess.call(this);
        
        // 恢复咒语学习数据
        setTimeout(() => {
            if (window.$spellSystem) {
                $gameParty.allMembers().forEach(actor => {
                    if (actor._learnedSpells) {
                        window.$spellSystem.learnedSpells.set(
                            actor.actorId(),
                            new Set(actor._learnedSpells)
                        );
                    }
                });
                console.log('[SpellAutoInit] 咒语数据已恢复');
            }
        }, 100);
    };
    
})();
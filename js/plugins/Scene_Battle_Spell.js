/*:
 * @target MZ
 * @plugindesc Battle Spell Integration v1.3.4 - 战斗咒语集成（完整修复版）
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 战斗场景咒语系统集成 - 完整修复版 v1.3.4
 * ============================================================================
 * 
 * @param replaceAttack
 * @text 替换普通攻击
 * @desc 是否用咒语系统替换普通攻击
 * @type boolean
 * @default true
 * 
 * @param showSpellCommand
 * @text 显示咒语命令
 * @desc 是否在战斗命令中显示"咒语"选项
 * @type boolean
 * @default true
 * 
 * @param spellCommandName
 * @text 咒语命令名称
 * @desc 战斗命令中咒语选项的名称
 * @type string
 * @default 咒语
 */

(() => {
    'use strict';
    
    const pluginName = 'Scene_Battle_Spell';
    const parameters = PluginManager.parameters(pluginName);
    const replaceAttack = parameters['replaceAttack'] === 'true';
    const showSpellCommand = parameters['showSpellCommand'] === 'true';
    const spellCommandName = parameters['spellCommandName'] || '咒语';
    
    // ============================================
    // 场景扩展部分
    // ============================================
    
    // 扩展战斗场景
    const _Scene_Battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _Scene_Battle_createAllWindows.call(this);
        this.createSpellWindows();
    };
    
    // 创建咒语相关窗口
    Scene_Battle.prototype.createSpellWindows = function() {
        this._spellCastingWindow = null;
        this._spellResultWindow = null;
    };
    
    // 安全的刷新状态方法
    Scene_Battle.prototype.safeRefreshStatus = function() {
        try {
            if (this._statusWindow && this._statusWindow.refresh) {
                this._statusWindow.refresh();
            }
            if (this._logWindow && this._logWindow.refresh) {
                this._logWindow.refresh();
            }
            if (this._enemyWindow && this._enemyWindow.visible && this._enemyWindow.refresh) {
                this._enemyWindow.refresh();
            }
            if (this._actorCommandWindow && this._actorCommandWindow.active && this._actorCommandWindow.refresh) {
                this._actorCommandWindow.refresh();
            }
        } catch (e) {
            console.warn('[Scene_Battle] 刷新状态时出错:', e);
        }
    };
    
    // ============================================
    // 咒语处理部分
    // ============================================
    
    // 处理咒语施法动作（供SpellSystem调用）
    Scene_Battle.prototype.processSpellAction = function(actor, target, spell, damage) {
        console.log('[Scene_Battle] 处理咒语施法动作');
        
        if (!$gameParty || !$gameParty.inBattle()) {
            console.error('[Scene_Battle] 不在战斗中，无法执行咒语动作');
            return;
        }
        
        // 应用咒语效果
        this.applySpellEffects(actor, target, spell, damage);
        
        // 应用状态效果
        this.applySpellStates(target, spell);
        
        // 播放动画
        this.playSpellAnimation(target, spell);
        
        // 刷新状态
        this.safeRefreshStatus();
        
        // 检查战斗结束
        BattleManager.checkBattleEnd();
        
        // 如果战斗没有结束，继续战斗流程
        if (!BattleManager.isBattleEnd()) {
            setTimeout(() => {
                if (BattleManager._subject) {
                    BattleManager._subject.onAllActionsEnd();
                    BattleManager._subject.removeCurrentAction();
                }
                this.continueAfterSpell();
            }, 500);
        }
    };
    
    // ============================================
    // 动画播放系统（重点部分）
    // ============================================
    
    /**
     * 播放咒语动画
     * @param {Game_Battler} target - 目标对象
     * @param {Object} spell - 咒语数据
     */
    Scene_Battle.prototype.playSpellAnimation = function(target, spell) {
        if (!target || !this._spriteset) return;
        
        // 根据咒语ID播放不同的动画效果
        switch (spell.id) {
            // ===== 基础咒语动画 =====
            case 'fire_ball':
                $gameTemp.requestAnimation([target], 64); // 火球动画
                break;
                
            case 'normal_attack':
                $gameTemp.requestAnimation([target], 7); // 普通攻击
                break;
                
            // ===== 特殊咒语组合动画 =====
            case 'destiny_draw':
                // 天命抽取 - 卡牌效果（多段动画）
                this.playComboAnimation([target], [71, 72, 73], 200);
                break;
                
            case 'evil_eye':
                // 邪王真眼 - 黑暗之眼（渐进效果）
                this.playComboAnimation([target], [68, 69, 70], 300);
                // 额外的屏幕效果
                this.startScreenFlash([255, 0, 255, 128], 30);
                break;
                
            case 'dragon_roar':
                // 恶龙咆哮 - 吼叫效果
                this.playComboAnimation([target], [74, 75], 400);
                // 屏幕震动
                this.startScreenShake(5, 5, 30);
                break;
                
            // ===== 默认动画（根据属性） =====
            default:
                let animationId = 1; // 默认动画
                switch (spell.element) {
                    case 'fire':
                        animationId = 64;
                        break;
                    case 'ice':
                        animationId = 65;
                        break;
                    case 'thunder':
                        animationId = 66;
                        break;
                    case 'holy':
                        animationId = 67;
                        break;
                    case 'dark':
                        animationId = 68;
                        break;
                }
                $gameTemp.requestAnimation([target], animationId);
        }
    };
    
    /**
     * 播放组合动画（多个动画依次播放）
     * @param {Array} targets - 目标数组
     * @param {Array} animationIds - 动画ID数组
     * @param {Number} delay - 每个动画之间的延迟（毫秒）
     */
    Scene_Battle.prototype.playComboAnimation = function(targets, animationIds, delay = 100) {
        if (!targets || !animationIds || animationIds.length === 0) return;
        
        let currentDelay = 0;
        animationIds.forEach((animId, index) => {
            setTimeout(() => {
                if ($gameTemp && $gameTemp.requestAnimation) {
                    $gameTemp.requestAnimation(targets, animId);
                }
            }, currentDelay);
            currentDelay += delay;
        });
    };
    
    /**
     * 开始屏幕闪烁效果
     * @param {Array} color - RGBA颜色数组 [R, G, B, A]
     * @param {Number} duration - 持续帧数
     */
    Scene_Battle.prototype.startScreenFlash = function(color, duration) {
        if ($gameScreen) {
            $gameScreen.startFlash(color, duration);
        }
    };
    
    /**
     * 开始屏幕震动效果
     * @param {Number} power - 震动强度
     * @param {Number} speed - 震动速度
     * @param {Number} duration - 持续帧数
     */
    Scene_Battle.prototype.startScreenShake = function(power, speed, duration) {
        if ($gameScreen) {
            $gameScreen.startShake(power, speed, duration);
        }
    };
    
    // ============================================
    // 咒语效果应用
    // ============================================
    
    // 应用咒语效果
    Scene_Battle.prototype.applySpellEffects = function(actor, target, spell, damage) {
        // 根据咒语效果处理
        if (spell.effects.includes('damage')) {
            // 攻击类咒语
            if (target && !target.isDead()) {
                target.gainHp(-damage);
                
                // 显示伤害
                if (target.startDamagePopup) {
                    target.startDamagePopup();
                }
                if (target.performDamage) {
                    target.performDamage();
                }
                
                // 检查是否死亡
                if (target.isDead() && target.performCollapse) {
                    target.performCollapse();
                }
            }
            
            // AOE效果
            if (spell.effects.includes('aoe')) {
                const enemies = $gameTroop.aliveMembers();
                const aoeDamage = Math.floor(damage * 0.7);
                enemies.forEach(enemy => {
                    if (enemy !== target && !enemy.isDead()) {
                        enemy.gainHp(-aoeDamage);
                        if (enemy.startDamagePopup) {
                            enemy.startDamagePopup();
                        }
                        if (enemy.performDamage) {
                            enemy.performDamage();
                        }
                        if (enemy.isDead() && enemy.performCollapse) {
                            enemy.performCollapse();
                        }
                    }
                });
            }
            
        } else if (spell.effects.includes('heal')) {
            // 治疗类咒语
            actor.gainHp(damage);
            if (actor.startDamagePopup) {
                actor.startDamagePopup();
            }
        }
        
        // 特殊效果处理 - 添加这部分！
        if (spell.effects.includes('evil_eye')) {
            // 调用 SpellSystem 的邪王真眼效果
            if (window.$spellSystem) {
                window.$spellSystem.executeEvilEye(actor, target, spell);
            }
        }
        
        if (spell.effects.includes('destiny_draw')) {
            // 调用 SpellSystem 的天命抽取效果
            if (window.$spellSystem) {
                window.$spellSystem.executeDestinyDraw(actor, target);
            }
        }
    };
    
    // 应用咒语状态效果
    Scene_Battle.prototype.applySpellStates = function(target, spell) {
        if (!target || !spell.effects) return;
        
        for (const effect of spell.effects) {
            switch (effect) {
                case 'burn':
                    if (!target.isDead() && target.addState) {
                        target.addState(2); // 燃烧状态
                    }
                    break;
                case 'freeze':
                    if (!target.isDead() && target.addState) {
                        target.addState(3); // 冰冻状态
                    }
                    break;
                case 'paralyze':
                    if (!target.isDead() && target.addState) {
                        target.addState(4); // 麻痹状态
                    }
                    break;
                case 'buff_all':
                    $gameParty.members().forEach(member => {
                        if (!member.isDead() && member.addState) {
                            member.addState(14); // 全属性提升
                        }
                    });
                    break;
            }
        }
    };
    
    // ============================================
    // 其他方法（保持原有功能）
    // ============================================
    
    // 咒语后继续战斗
    Scene_Battle.prototype.continueAfterSpell = function() {
        console.log('[Scene_Battle] 咒语施法完成，继续战斗');
        
        if (window.$spellSystem) {
            window.$spellSystem.currentBattle = null;
        }
        
        if (this._partyCommandWindow) {
            this._partyCommandWindow.close();
        }
        
        if (this._actorCommandWindow) {
            this._actorCommandWindow.close();
            this._actorCommandWindow.deactivate();
        }
        
        if (this._enemyWindow) {
            this._enemyWindow.hide();
            this._enemyWindow.deactivate();
        }
        
        if (this._skillWindow) {
            this._skillWindow.hide();
            this._skillWindow.deactivate();
        }
        
        if (this._itemWindow) {
            this._itemWindow.hide();
            this._itemWindow.deactivate();
        }
        
        if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
            window.$voiceRPG.commandSystem.setContext('battle');
        }
        
        try {
            if (window.BattleManager) {
                if (window.BattleManager._action) {
                    window.BattleManager._action = null;
                }
                
                if (window.BattleManager._subject) {
                    console.log('[Scene_Battle] 结束角色行动:', window.BattleManager._subject.name());
                    window.BattleManager.endAction();
                } else {
                    console.log('[Scene_Battle] 没有当前角色，尝试获取下一个行动者');
                    window.BattleManager.selectNextCommand();
                }
            }
        } catch (e) {
            console.error('[Scene_Battle] 继续战斗时出错:', e);
            setTimeout(() => {
                if (window.BattleManager) {
                    window.BattleManager.selectNextCommand();
                }
            }, 500);
        }
    };
    
    // 扩展战斗命令窗口
    if (showSpellCommand) {
        const _Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
        Window_ActorCommand.prototype.makeCommandList = function() {
            if (this._actor) {
                this.addAttackCommand();
                this.addSpellCommand(); // 新增咒语命令
                this.addSkillCommands();
                this.addGuardCommand();
                this.addItemCommand();
            }
        };
        
        Window_ActorCommand.prototype.addSpellCommand = function() {
            this.addCommand(spellCommandName, 'spell', true);
        };
    }
    
    // 修改普通攻击命令处理
    if (replaceAttack) {
        const _Scene_Battle_commandAttack = Scene_Battle.prototype.commandAttack;
        Scene_Battle.prototype.commandAttack = function() {
            // 使用咒语系统替代普通攻击
            this.startSpellCasting();
        };
    }
    
    // 处理咒语命令
    const _Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);
        if (this._actorCommandWindow) {
            this._actorCommandWindow.setHandler('spell', this.commandSpell.bind(this));
        }
    };
    
    Scene_Battle.prototype.commandSpell = function() {
        this.startSpellCasting();
    };
    
    // 开始咒语咏唱（安全版）
    Scene_Battle.prototype.startSpellCasting = function() {
        const actor = BattleManager.actor();
        if (!actor) {
            console.error('[Scene_Battle] 没有当前角色');
            return;
        }
        
        console.log('[Scene_Battle] 开始咒语咏唱');
        
        // 设置一个动作标记，防止 endAction 出错
        if (!BattleManager._action) {
            const action = new Game_Action(actor);
            action.setAttack();
            action.setTarget(0);
            BattleManager._action = action;
        }
        
        // 隐藏战斗窗口
        if (this._actorCommandWindow) this._actorCommandWindow.close();
        if (this._enemyWindow) this._enemyWindow.hide();
        if (this._skillWindow) this._skillWindow.hide();
        if (this._itemWindow) this._itemWindow.hide();
        
        // 获取当前目标
        let targetIndex = this._enemyWindow ? this._enemyWindow.index() : 0;
        if (targetIndex < 0) targetIndex = 0;
        
        // 开始咏唱
        if (window.$spellSystem) {
            // 设置战斗场景引用
            window.$spellSystem.currentBattle = this;
            
            try {
                const success = window.$spellSystem.startCasting(actor.actorId(), targetIndex);
                
                if (!success) {
                    throw new Error('咏唱开始失败');
                }
                
                // 保持战斗上下文
                if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
                    window.$voiceRPG.commandSystem.setContext('battle');
                }
                
            } catch (error) {
                console.error('[Scene_Battle] 咏唱失败:', error);
                // 清理动作标记
                BattleManager._action = null;
                // 恢复战斗界面
                if (this._enemyWindow) this._enemyWindow.show();
                this.startActorCommandSelection();
            }
        } else {
            console.error('[Scene_Battle] 咒语系统未初始化');
            // 清理动作标记
            BattleManager._action = null;
            if (this._enemyWindow) this._enemyWindow.show();
            this.startActorCommandSelection();
        }
    };
    
    // 重写开始角色命令选择
    const _Scene_Battle_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function() {
        _Scene_Battle_startActorCommandSelection.call(this);
        
        // 确保语音系统在战斗上下文
        if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
            window.$voiceRPG.commandSystem.setContext('battle');
        }
    };
    
    // 战斗结束时清理
    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        // 强制重置咒语系统状态
        if (window.$spellSystem && window.$spellSystem.forceResetCasting) {
            window.$spellSystem.forceResetCasting();
        }
        
        // 恢复语音系统上下文
        if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
            window.$voiceRPG.commandSystem.setContext('game');
        }
        
        _Scene_Battle_terminate.call(this);
    };
    
    // 处理ESC键中断咏唱
    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        
        // 如果在咏唱中按下取消键
        if (window.$spellSystem && window.$spellSystem.isCasting) {
            if (Input.isTriggered('cancel') || Input.isTriggered('escape')) {
                console.log('[Scene_Battle] 取消咏唱');
                
                // 清理动作标记
                BattleManager._action = null;
                
                if (window.$spellSystem.cancelCasting) {
                    window.$spellSystem.cancelCasting();
                }
                
                // 返回命令选择
                this.startActorCommandSelection();
            }
        }
    };
    
    // 确保正确处理目标选择
    const _Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        const action = BattleManager.inputtingAction();
        if (action && this._actorCommandWindow && 
            this._actorCommandWindow.currentSymbol() === 'attack' && replaceAttack) {
            // 如果是攻击命令且启用了替换，开始咒语咏唱
            this.startSpellCasting();
        } else {
            _Scene_Battle_onEnemyOk.call(this);
        }
    };
    
    // 修复选择敌人窗口
    const _Scene_Battle_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function() {
        _Scene_Battle_selectEnemySelection.call(this);
        
        // 确保在选择敌人时保持战斗上下文
        if (window.$voiceRPG && window.$voiceRPG.commandSystem) {
            window.$voiceRPG.commandSystem.setContext('battle');
        }
    };
    
    // 紧急恢复机制 - 防止战斗卡住
    const _BattleManager_update = BattleManager.update;
    BattleManager.update = function() {
        _BattleManager_update.call(this);
        
        // 检测是否卡住（超过5秒没有行动）
        if (this._phase === 'turn' && !this._subject && !this.isInputting()) {
            if (!this._lastActionTime) {
                this._lastActionTime = Date.now();
            }
            
            if (Date.now() - this._lastActionTime > 5000) {
                console.warn('[BattleManager] 检测到战斗卡住，尝试恢复');
                this._lastActionTime = Date.now();
                
                // 尝试获取下一个行动者
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

    // === BattleManager 补丁 ===
    (() => {
        // 备份原始方法
        const _BattleManager_endAction = BattleManager.endAction;
        
        // 重写 endAction，添加错误处理
        BattleManager.endAction = function() {
            try {
                console.log('[BattleManager] 结束动作');
                
                // 确保有 _subject
                if (!this._subject) {
                    console.warn('[BattleManager] 没有当前行动者，跳过 endAction');
                    this.selectNextCommand();
                    return;
                }
                
                // 调用原始方法
                _BattleManager_endAction.call(this);
                
            } catch (error) {
                console.error('[BattleManager] endAction 错误:', error);
                // 错误恢复
                this._action = null;
                this._subject = null;
                this.selectNextCommand();
            }
        };
        
        // 添加手动推进方法
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
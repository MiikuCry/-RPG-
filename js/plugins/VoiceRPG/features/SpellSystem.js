/**
 * SpellSystem.js - 咒语战斗系统（完整版 v3.0）
 * 
 * 更新日志：
 * v3.0 - 新增技能：普通防御、普通恢复、登龙剑、雷公助我、不死秘籍、究极魔法、契约胜利之剑
 * v3.0 - 新增冷却系统、连击系统、复活机制
 * v2.0 - 优化版核心系统
 * 
 * @author 不想做工-接桉桉
 * @version 3.0.0
 */

class SpellSystem {
    constructor() {
        // 咒语库
        this.spells = new Map();
        
        // 当前状态
        this.isActive = false;
        this.currentBattle = null;
        this.currentActor = null;
        this.currentTarget = null;
        
        // 咏唱状态
        this.isCasting = false;
        this.castingSpell = null;
        this.castingStartTime = 0;
        this.castingText = '';
        this.pendingText = '';
        this.isListening = false;
        
        // 音量分析器
        this.volumeAnalyzer = null;
        this.currentVolume = 0;
        this.maxVolume = 0;
        this.averageVolume = 0;
        
        // 配置
        this.config = {
            minAccuracy: 0.3,
            maxDamageMultiplier: 2.0,
            volumeWeight: 0.3,
            accuracyWeight: 0.7,
            cooldownTime: 1000,
            enableAutoComplete: true,
            silenceTimeout: 800
        };
        
        // 统计
        this.stats = {
            totalCasts: 0,
            successfulCasts: 0,
            totalDamage: 0,
            highestDamage: 0,
            perfectCasts: 0
        };
        
        // 学习的咒语ID列表
        this.learnedSpells = new Map();
        
        // 冷却管理（v3.0新增）
        this.cooldowns = new Map();
        
        // 同音字映射表
        this.phoneticMap = {
            // 火球术
            '比那黑更黑的深渊祈求吾之深红闪光觉醒之时已然降临': [
                '比拿黑更黑的深渊祈求吾之深红闪光觉醒之时已然降临',
                '比那黑更黑的伸冤祈求吾之深红闪光觉醒之时已然降临',
                '比那黑更黑的深渊气球吾之深红闪光觉醒之时已然降临',
                '比那黑更黑的伸冤气球吾之深红闪光觉醒之时已然降临',
                '比拿黑更黑的伸冤气球吾之深红闪光觉醒之时已然降临',
                '比拿黑更黑的伸冤祈求吾之深红闪光觉醒之时已然降临',
                '比拿黑更黑的深渊气球吾之深红闪光觉醒之时已然降临'
            ],
            '火球术': ['火球术', '火球书', '火求术', '火球数', '伙球术', '活球术', '或球术'],
            
            // 恶龙咆哮
            '恶龙咆哮': ['恶龙咆哮', '恶龙怒吼', '恶龙吼叫', '饿龙咆哮', '恶龙抛消', '恶龙炮啸', '恶龙泡笑'],
            '喊叫咆哮': ['喊叫咆哮', '喊叫炮啸', '喊叫抛消', '汉叫咆哮', '汗叫咆哮'],
            
            // 邪王真眼
            '漆黑烈焰使的契约者啊与汝缔结永劫之羁绊邪王真眼全开': [
                '漆黑烈焰使的契约者啊与汝缔结永劫之羁绊邪王真眼全开',
                '漆黑烈焰使的契约者阿与汝缔结永劫之羁绊邪王真眼全开',
                '漆黑烈焰使的契约者啊与汝缔结永劫之羁绊斜王真眼全开',
                '漆黑列焰使的契约者啊与汝缔结永劫之羁绊邪王真眼全开',
                '漆黑烈焰使的契约者啊与汝缔结永劫之鸡伴邪王真眼全开',
                '漆黑烈焰使的契约者啊与女缔结永劫之羁绊邪王真眼全开',
                '七黑烈焰使的契约者啊与汝缔结永劫之羁绊邪王真眼全开'
            ],
            '邪王真眼': ['邪王真眼', '斜王真眼', '邪王真言', '邪王瞎眼', '写王真眼', '谢王真眼', '邪王尊严'],
            
            // 普通攻击
            '吃我一剑': ['吃我一剑', '吃我一贱', '吃我一件', '迟我一剑', '吃我一角', '吃我衣剑', '持我一剑'],
            '普攻': ['普攻', '普通攻击', '扑攻', '普工', '普供', '仆攻'],
            '普通攻击': ['普通攻击', '普通公鸡', '普通攻加', '扑通攻击', '普通工击'],
            
            // 天命抽取
            '库洛里多创造的库洛牌啊在我面前展示你真正的力量': [
                '库洛里多创造的库洛牌啊在我面前展示你真正的力量',
                '库洛里多创造的库洛牌阿在我面前展示你真正的力量',
                '库洛里多创造的库洛牌啊在我面前展示你真正的利量',
                '库落里多创造的库洛牌啊在我面前展示你真正的力量',
                '苦洛里多创造的库洛牌啊在我面前展示你真正的力量',
                '库洛里多创造的酷洛牌啊在我面前展示你真正的力量',
                '库洛里多创造的库落牌啊在我面前展示你真正的力量'
            ],
            '天命抽取': ['天命抽取', '天命抽去', '天命抽曲', '天明抽取', '天命抽趣', '天命抽区'],
            
            // 所累哇都塔纳
            '那又如何': ['那又如何', '那有如何', '那又入何', '哪又如何', '那又如河', '那又如和'],
            '所累哇都塔纳': ['所累哇都塔纳', '所累瓦都塔纳', '所累哇多塔纳', '所累瓦多塔纳', '所累哇都塔那'],

            // 镭射眼
            '镭射眼': ['镭射眼','雷蛇眼', '雷神眼', '镭射烟', '雷蛇烟', '雷神烟'],
            '电眼逼人': ['电眼逼人','电影别人', '电影逼人', '电音别人', '电音逼人', '电眼别人'],

            // 认真的一拳
            '认真的一拳': ['认真的一拳', '认真的一圈', '认真的一惜', '认真地一拳', '认真得一拳', '人真的一拳'],
            
            // v3.0 新增技能同音字
            // 普通防御
            '来自女神的加护在此降临': ['来自女神的加护在此降临', '来自女神的加护在此降临', '来自女神的家伙在此降临'],
            '普通防御': ['普通防御', '普通防御', '扑通防御'],
            
            // 普通恢复
            '低语的精灵啊请祝福我': ['低语的精灵啊请祝福我', '低语的精灵啊请祝福我', '低语的精灵阿请祝福我'],
            '普通恢复': ['普通恢复', '普通回复', '扑通恢复'],
            
            // 登龙剑
            '必胜登龙剑': ['必胜登龙剑', '必胜登隆剑', '必胜登龙建', '必胜登龙见', '必胜等龙剑'],
            '登龙剑': ['登龙剑', '登隆剑', '登龙建', '等龙剑'],
            
            // 雷公助我
            '雷公助我': ['雷公助我', '雷工助我', '雷公住我', '雷公主我'],
            '苍天已死黄天当立岁在甲子天下大吉': [
                '苍天已死黄天当立岁在甲子天下大吉',
                '苍天已死黄天当立岁在甲子天下大胶',
                '苍天已死黄天当立岁在甲子天下大级',
                '苍天已死黄天当立岁在家子天下大吉',
                '仓天已死黄天当立岁在甲子天下大吉',
                '苍天已死皇天当立岁在甲子天下大吉'
            ],
            
            // 不死秘籍
            '不完整的不死秘籍': ['不完整的不死秘籍', '不完整的不死秘技'],
            '不死秘籍': ['不死秘籍', '不死秘技'],
            '上上下下左左右右': ['上上下下左左右右', '上上下下做做右右'],
            
            // 究极魔法
            '究极魔法': ['究极魔法', '就极魔法', '九极魔法'],
            '生命之色涡旋流转七重之门现于世间力量之塔君临九天': [
                '生命之色涡旋流转七重之门现于世间力量之塔君临九天',
                '生命之色涡旋流转七重之门现于世间力量之塔君临九田',
                '生命之色涡旋流转七重之门现于世间力量之塔军临九天',
                '生命之色涡旋流转齐重之门现于世间力量之塔君临九天'
            ],
            '生命之色': ['生命之色', '生命之瑟'],
            
            // 契约胜利之剑
            '契约胜利之剑': ['契约胜利之剑', '契约胜利之间', '契约胜利之建', '契约胜利只见', '契约胜利支剑'],
        };
        
        // 初始化默认咒语
        this.initializeDefaultSpells();
        
        // 绑定键盘事件
        this.bindKeyboardEvents();
        
        // 设置战斗状态监听（v3.0新增）
        this.setupBattleStateMonitor();
        
        // 定时器管理
        this.silenceTimer = null;
        this.inputDebounceTimer = null;
    }
    
    /**
     * 绑定键盘事件
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            if (!this.isCasting) return;
            
            if (event.key === 'Escape') {
                console.log('[SpellSystem] ESC键退出咏唱');
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                this.cancelCasting();
                return false;
            }
            
            else if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
                console.log('[SpellSystem] 空格键重新输入');
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                if (window.Input) {
                    window.Input._currentState[' '] = false;
                    window.Input._currentState['ok'] = false;
                }
                
                this.restartInput();
                return false;
            }
        }, true);
    }
    
    /**
     * v3.0新增：监听战斗中的状态变化（不死秘籍复活机制）
     */
    setupBattleStateMonitor() {
        const originalRemoveState = Game_Battler.prototype.removeState;
        
        Game_Battler.prototype.removeState = function(stateId) {
            const state = $dataStates[stateId];
            
            // 检查是否是不死秘籍状态
            if (state && state.note && state.note.includes('<KonamiRevive>')) {
                console.log('[KonamiCode] 不死秘籍状态移除，检查是否死亡');
                
                if (this.isDead()) {
                    console.log('[KonamiCode] 角色已死亡，触发复活！');
                    
                    this._hp = this.mhp;
                    this._mp = this.mmp;
                    originalRemoveState.call(this, this.deathStateId());
                    
                    AudioManager.playSe({name: 'Recovery', volume: 100, pitch: 120});
                    $gameScreen.startFlash([255, 255, 255, 255], 60);
                    
                    setTimeout(() => {
                        $gameMessage.add(`\\C[6]【不死秘籍发动！】\\C[0]`);
                        $gameMessage.add(`\\C[3]${this.name()}\\C[0]满血满蓝复活了！`);
                        $gameMessage.add(`\\C[5]"30条命可不是开玩笑的！"\\C[0]`);
                    }, 100);
                    
                    const penaltyState = this.states().find(s => 
                        s && s.note && s.note.includes('<KonamiPenalty>')
                    );
                    if (penaltyState) {
                        originalRemoveState.call(this, penaltyState.id);
                    }
                }
            }
            
            // 检查是否是惩罚状态
            if (state && state.note && state.note.includes('<KonamiPenalty>')) {
                console.log('[KonamiCode] 惩罚状态移除，检查是否还活着');
                
                if (!this.isDead() && this.hp > 0) {
                    console.log('[KonamiCode] 角色存活，执行惩罚！');
                    
                    const penalty = Math.floor(this.hp * 0.5);
                    
                    if (penalty > 0) {
                        this.gainHp(-penalty);
                        AudioManager.playSe({name: 'Damage1', volume: 90, pitch: 80});
                        
                        setTimeout(() => {
                            $gameMessage.add(`\\C[7]【秘籍惩罚】\\C[0]`);
                            $gameMessage.add(`\\C[3]${this.name()}\\C[0]未能触发复活...`);
                            $gameMessage.add(`\\C[2]扣除了${penalty}点HP作为代价！\\C[0]`);
                        }, 100);
                        
                        if (this.startDamagePopup) {
                            this.startDamagePopup();
                        }
                    }
                }
            }
            
            originalRemoveState.call(this, stateId);
        };
    }
    
    /**
     * v3.0新增：战斗开始时的初始化
     */
    onBattleStart() {
        console.log('[SpellSystem] 战斗开始，清除标记');
        
        if ($gameTroop) {
            $gameTroop._usedUltimateMagic = {};
        }
        
        $gameParty.members().forEach(actor => {
            actor._lastUsedSpell = null;
        });
        
        this.clearAllCooldowns();
    }
    
    /**
     * v3.0新增：检查技能是否在冷却中
     */
    isOnCooldown(actorId, spellId) {
        const key = `${actorId}_${spellId}`;
        const cooldownData = this.cooldowns.get(key);
        
        if (!cooldownData) return false;
        
        return cooldownData.remaining > 0;
    }
    
    /**
     * v3.0新增：获取剩余冷却回合数
     */
    getCooldownRemaining(actorId, spellId) {
        const key = `${actorId}_${spellId}`;
        const cooldownData = this.cooldowns.get(key);
        
        return cooldownData ? cooldownData.remaining : 0;
    }
    
    /**
     * v3.0新增：设置技能冷却
     */
    setCooldown(actorId, spellId, turns) {
        const key = `${actorId}_${spellId}`;
        this.cooldowns.set(key, {
            remaining: turns,
            total: turns
        });
        
        console.log(`[SpellSystem] 技能${spellId}进入冷却，剩余${turns}回合`);
    }
    
    /**
     * v3.0新增：减少所有冷却
     */
    reduceCooldowns(actorId) {
        for (const [key, data] of this.cooldowns.entries()) {
            if (key.startsWith(`${actorId}_`)) {
                if (data.remaining > 0) {
                    data.remaining--;
                    
                    if (data.remaining === 0) {
                        console.log(`[SpellSystem] 技能${key}冷却完成`);
                    }
                }
            }
        }
    }
    
    /**
     * v3.0新增：清除所有冷却
     */
    clearAllCooldowns() {
        this.cooldowns.clear();
    }
    
    /**
     * 技能槽 - 初始化默认咒语
     */
    initializeDefaultSpells() {
        // 普通攻击
        this.registerSpell('normal_attack', {
            name: '普通攻击',
            incantation: '吃我一剑',
            element: 'none',
            basePower: 100,
            powerMultiplier: 1.0,
            mpCost: 0,
            description: '最基础的物理攻击',
            difficulty: 1,
            effects: ['damage'],
            isPhysical: true
        });
        
        // 火球术
        this.registerSpell('fire_ball', {
            name: '火球术',
            incantation: '比那黑更黑的深渊祈求吾之深红闪光觉醒之时已然降临',
            element: 'fire',
            basePower: 100,
            powerMultiplier: 1.3,
            mpCost: 5,
            description: '基础火系魔法，替代普通攻击',
            difficulty: 1,
            effects: ['damage'],
            isPhysical: false
        });
        
        // 恶龙咆哮
        this.registerSpell('dragon_roar', {
            name: '恶龙咆哮',
            incantation: '恶龙咆哮',
            element: 'none',
            basePower: 50,
            powerMultiplier: 1.0,
            mpCost: 15,
            description: '完全依赖音量的技能，上限极高下限极低',
            difficulty: 2,
            effects: ['damage'],
            volumeMultiplier: 10.0,
            minDamage: 1,
            maxDamage: 500,
            isPhysical: false
        });
        
        // 邪王真眼
        this.registerSpell('evil_eye', {
            name: '邪王真眼',
            incantation: '漆黑烈焰使的契约者啊与汝缔结永劫之羁绊邪王真眼全开',
            element: 'dark',
            basePower: 0,
            mpCost: 30,
            description: '消耗50%当前HP，30%几率秒杀，70%几率无事发生',
            difficulty: 3,
            effects: ['evil_eye'],
            instantDeathChance: 0.3,
            hpCostRate: 0.5,
            failMessage: '邪王真眼的力量失控了...'
        });
        
        // 天命抽取
        this.registerSpell('destiny_draw', {
            name: '天命抽取',
            incantation: '库洛里多创造的库洛牌啊在我面前展示你真正的力量',
            alternativeName: '天命抽取',
            element: 'none',
            basePower: 0,
            mpCost: 40,
            description: '随机赋予双方各一个状态',
            difficulty: 3,
            effects: ['destiny_draw'],
            isNoDamage: true
        });

        // 那又如何
        this.registerSpell('soredowa_dokana', {
            name: '所累哇都塔纳',
            incantation: '那又如何',
            alternativeName: '所累哇都塔纳',
            element: 'none',
            basePower: 0,
            mpCost: 20,
            description: '将大局逆转吧！',
            difficulty: 2,
            effects: ['soredowa_dokana'],
            isSpecialBoss: true,
            targetTroopId: 10,
            healRateMin: 0.1,
            healRateMax: 0.8,
        });

        // 镭射眼
        this.registerSpell('laser_eye', {
            name: '镭射眼',
            incantation: '电眼逼人',
            element: 'none',
            basePower: 30,
            mpCost: 10,
            description: '电眼逼人啊电眼逼人，固定造成30点伤害',
            difficulty: 1,
            effects: ['laser_eye_fixed'],
            isFixedDamage: true,
            shameFactor: 0.3,
        });

        // 认真的一拳
        this.registerSpell('serious_punch', {
            name: '认真的一拳',
            incantation: '认真的一拳',
            element: 'none',
            basePower: 0,
            mpCost: 50,
            description: '认真的挥出一拳，秒杀所有敌人',
            difficulty: 3,
            effects: ['serious_punch'],
            isNoDamage: true,
            shameFactor: 2.0,
        });
        
        // ========== v3.0 新增技能 ==========
        
        // 普通防御
        this.registerSpell('normal_defense', {
            name: '普通防御',
            incantation: '来自女神的加护在此降临',
            element: 'none',
            basePower: 0,
            mpCost: 0,
            description: '下一个回合受到的任何伤害减免90%',
            difficulty: 1,
            effects: ['defense_buff'],
            isNoDamage: true,
            defenseStateId: 18,
            cooldown: 3,
            shameFactor: 0.8
        });
        
        // 普通恢复
        this.registerSpell('normal_heal', {
            name: '普通恢复',
            incantation: '低语的精灵啊请祝福我',
            element: 'none',
            basePower: 0,
            mpCost: 10,
            description: '立即恢复MAT × 2点HP',
            difficulty: 1,
            effects: ['heal_formula'],
            isNoDamage: true,
            healMultiplier: 2.0,
            shameFactor: 0.6
        });
        
        // 登龙剑
        this.registerSpell('dragon_sword', {
            name: '登龙剑',
            incantation: '必胜登龙剑',
            element: 'none',
            basePower: 0,
            mpCost: 25,
            description: '物魔双修的必杀技，造成ATK×1.2+6的物理伤害和MAT×1.0+4的魔法伤害',
            difficulty: 2,
            effects: ['dragon_sword_damage'],
            isPhysical: false,
            shameFactor: 1.5,
            criticalBonus: true,
            comboBonus: true
        });
        
        // 雷公助我
        this.registerSpell('thunder_god', {
            name: '雷公助我',
            incantation: '苍天已死黄天当立岁在甲子天下大吉',
            alternativeName: '雷公助我',
            element: 'thunder',
            basePower: 160,
            powerMultiplier: 1.0,
            mpCost: 20,
            description: '造成MAT×1.6+5的雷系伤害，20%概率麻痹，20%概率灼烧',
            difficulty: 2,
            effects: ['thunder_god_damage'],
            isPhysical: false,
            fixedBonus: 5,
            paralysisChance: 0.2,
            burnChance: 0.2,
            paralysisStateId: 6,
            burnStateId: 10,
            shameFactor: 1.8
        });
        
        // 不死秘籍
        this.registerSpell('konami_code', {
            name: '不完整的不死秘籍',
            incantation: '上上下下左左右右',
            alternativeName: '不死秘籍',
            element: 'none',
            basePower: 0,
            mpCost: 30,
            description: '赌命的秘籍：下回合若死亡则满血满蓝复活，若未死亡则扣除50%HP',
            difficulty: 2,
            effects: ['konami_revive'],
            isNoDamage: true,
            reviveStateId: 19,
            penaltyStateId: 20,
            shameFactor: 2.5
        });
        
        // 究极魔法
        this.registerSpell('ultimate_magic', {
            name: '究极魔法',
            incantation: '生命之色涡旋流转七重之门现于世间力量之塔君临九天',
            alternativeName: '生命之色',
            element: 'none',
            basePower: 0,
            mpCost: -1,
            description: '消耗全部MP的究极魔法，造成巨额伤害但下回合无法行动且防御下降',
            difficulty: 3,
            effects: ['ultimate_magic_damage'],
            isPhysical: false,
            shameFactor: 3.0,
            exhaustStateId: 21,
            usedFlag: 'ultimate_magic_used'
        });
        
        // 契约胜利之剑
        this.registerSpell('excalibur', {
            name: '契约胜利之剑',
            incantation: '契约胜利之剑',
            element: 'holy',
            basePower: 0,
            mpCost: 30,
            description: '传说中的圣剑，造成ATK×3+MAT×2+200的巨额伤害',
            difficulty: 2,
            effects: ['excalibur_damage'],
            isPhysical: false,
            cooldown: 2,
            fixedBonus: 200,
            shameFactor: 2.0
        });

        console.log('[SpellSystem] 完整版技能初始化完成，共注册', this.spells.size, '个技能');
    }
    
    /**
     * 注册新咒语
     */
    registerSpell(id, config) {
        if (!id || !config || !config.incantation) {
            console.error('[SpellSystem] 注册咒语失败：参数无效');
            return false;
        }
        
        this.spells.set(id, {
            id: id,
            name: config.name || '未命名咒语',
            incantation: config.incantation,
            alternativeName: config.alternativeName,
            element: config.element || 'none',
            basePower: config.basePower || 100,
            powerMultiplier: config.powerMultiplier || 1.0,
            mpCost: config.mpCost || 0,
            description: config.description || '',
            difficulty: config.difficulty || 1,
            requirements: config.requirements || {},
            effects: config.effects || ['damage'],
            shameFactor: config.shameFactor || 1.0,
            buffStateId: config.buffStateId,
            confuseStateId: config.confuseStateId,
            regenStateId: config.regenStateId,
            defenseStateId: config.defenseStateId,
            paralysisStateId: config.paralysisStateId,
            burnStateId: config.burnStateId,
            reviveStateId: config.reviveStateId,
            penaltyStateId: config.penaltyStateId,
            exhaustStateId: config.exhaustStateId,
            isNoDamage: config.isNoDamage || false,
            isPhysical: config.isPhysical || false,
            isFixedDamage: config.isFixedDamage || false,
            volumeMultiplier: config.volumeMultiplier,
            minDamage: config.minDamage,
            maxDamage: config.maxDamage,
            cooldown: config.cooldown || 0,
            healMultiplier: config.healMultiplier,
            fixedBonus: config.fixedBonus,
            criticalBonus: config.criticalBonus,
            comboBonus: config.comboBonus,
            paralysisChance: config.paralysisChance,
            burnChance: config.burnChance,
            instantDeathChance: config.instantDeathChance,
            hpCostRate: config.hpCostRate,
            isSpecialBoss: config.isSpecialBoss,
            targetTroopId: config.targetTroopId,
            healRateMin: config.healRateMin,
            healRateMax: config.healRateMax,
            usedFlag: config.usedFlag
        });
        
        return true;
    }
    
    /**
     * 开始咏唱（优化版）
     */
    startCasting(actorId, targetId = null) {
        if (this.isCasting) {
            console.log('[SpellSystem] 已经在咏唱中');
            return false;
        }
        
        // v3.0新增：懒初始化战斗标记
        if (!$gameTroop._battleInitialized) {
            this.onBattleStart();
            $gameTroop._battleInitialized = true;
        }
        
        // 清理之前的状态
        this.cleanup();
        
        // 临时禁用语音调试器的存储功能
        if (window.$voiceDebugger && window.$voiceDebugger.isVisible) {
            console.log('[SpellSystem] 检测到调试器开启，临时禁用其存储功能');
            this._debuggerWasVisible = true;
            if (window.$voiceRPG && window.$voiceRPG.onResult) {
                this._originalOnResult = window.$voiceRPG.onResult.bind(window.$voiceRPG);
                window.$voiceRPG.onResult = (result) => {
                    if (this.isCasting && result.text) {
                        this.processCastingResult(result.text);
                    }
                };
            }
        }
        
        this.currentActor = $gameActors.actor(actorId);
        if (!this.currentActor) {
            console.error('[SpellSystem] 无效的角色ID:', actorId);
            return false;
        }
        
        // 保存战斗场景引用
        if (SceneManager._scene instanceof Scene_Battle) {
            this.currentBattle = SceneManager._scene;
        } else {
            console.error('[SpellSystem] 不在战斗场景中');
            return false;
        }
        
        // 初始化角色咒语
        if (!this.learnedSpells.has(actorId) || this.learnedSpells.get(actorId).size === 0) {
            console.log('[SpellSystem] 角色还没有学会任何咒语，自动初始化基础咒语');
            this.initializeActorSpells(actorId);
        }
        
        // 设置目标
        if (targetId !== null && targetId !== undefined) {
            this.currentTarget = $gameTroop.members()[targetId];
        } else {
            this.currentTarget = null;
        }
        
        // 初始化咏唱状态
        this.isCasting = true;
        this.castingStartTime = Date.now();
        this.castingText = '';
        this.pendingText = '';
        this.isListening = true;
        this.maxVolume = 0;
        this.averageVolume = 0;
        
        // 显示咏唱UI
        this.showCastingUI();
        
        // 确保UI显示空内容
        if (this.castingUI) {
            this.castingUI.updateCastingText('');
            this.castingUI.updateMatches([]);
        }
        
        // 开始音量监测
        this.startVolumeAnalysis();
        
        console.log('[SpellSystem] 开始咏唱，按ESC退出，空格重新输入');
        return true;
    }
    
    /**
     * 处理语音识别结果（重新设计）
     */
    processCastingResult(text) {
        if (!this.isCasting) {
            console.log('[SpellSystem] 不在咏唱状态，忽略输入');
            return;
        }
        
        const cleanText = text.trim().replace(/\s+/g, '').replace(/[，。！？、]/g, '');
        
        if (!cleanText) {
            return;
        }
        
        console.log('[SpellSystem] 原始输入:', text);
        console.log('[SpellSystem] 清理后:', cleanText);
        
        if (cleanText.includes('火球术火球术') || cleanText.length > 20) {
            console.log('[SpellSystem] 检测到内容累积，只保留最后部分');
            const parts = cleanText.match(/[\u4e00-\u9fa5]+/g);
            if (parts && parts.length > 0) {
                const lastPart = parts[parts.length - 1];
                this.pendingText = lastPart;
                this.castingText = lastPart;
            }
        } else {
            this.pendingText = cleanText;
            this.castingText = cleanText;
        }
        
        console.log('[SpellSystem] 最终咏唱内容:', this.castingText);
        
        if (this.castingUI) {
            this.castingUI._castingText = this.castingText;
            this.castingUI.refresh();
        }
        
        this.resetSilenceTimer();
        this.isListening = true;
    }
    
    /**
     * 处理语音输入结束
     */
    handleSpeechEnd() {
        if (!this.isCasting || !this.pendingText) return;
        
        console.log('[SpellSystem] 语音输入结束，开始咒语判定，当前文本:', this.pendingText);
        this.isListening = false;
        
        // 特殊处理：如果包含"火球"，直接匹配火球术
        if (this.pendingText.includes('火球') || this.pendingText.includes('火求') || 
            this.pendingText.includes('或球') || this.pendingText.includes('伙球')) {
            console.log('[SpellSystem] 检测到火球相关词汇，尝试匹配火球术');
            
            const fireballSpell = this.spells.get('fire_ball');
            if (fireballSpell && this.hasLearnedSpell(this.currentActor.actorId(), 'fire_ball')) {
                const matchedSpell = {
                    spell: fireballSpell,
                    accuracy: 0.8
                };
                console.log('[SpellSystem] 强制匹配火球术成功');
                this.completeCasting(matchedSpell);
                return;
            }
        }
        
        // 进行正常的咒语匹配
        const matchedSpell = this.findMatchingSpell(this.pendingText);
        
        if (matchedSpell) {
            console.log('[SpellSystem] 匹配到咒语:', matchedSpell.spell.name, '准确度:', matchedSpell.accuracy);
            this.completeCasting(matchedSpell);
        } else {
            console.log('[SpellSystem] 未匹配到咒语，继续等待输入');
            if (this.castingUI) {
                this.castingUI.refresh();
            }
        }
    }
    
    /**
     * 重置静音计时器
     */
    resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        this.silenceTimer = setTimeout(() => {
            if (this.isCasting && this.isListening) {
                console.log('[SpellSystem] 检测到静音，判定输入结束');
                this.handleSpeechEnd();
            }
        }, this.config.silenceTimeout);
    }
    
    /**
     * 取消咏唱
     */
    cancelCasting() {
        if (!this.isCasting) return;
        
        console.log('[SpellSystem] 取消咏唱');
        
        this.isCasting = false;
        this.castingText = '';
        this.pendingText = '';
        this.isListening = false;
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        this.stopVolumeAnalysis();
        this.hideCastingUI();
        
        $gameMessage.add('\\C[2]咏唱被取消了\\C[0]');
        
        this.currentBattle = null;
        this.currentTarget = null;
        this.currentActor = null;
    }
    
    /**
     * 重新开始输入（强化版）
     */
    restartInput() {
        if (!this.isCasting) return;
        
        console.log('[SpellSystem] 强制重新开始输入');
        
        this.castingText = '';
        this.pendingText = '';
        this.isListening = true;
        
        this.maxVolume = 0;
        this.averageVolume = 0;
        
        if (this.castingUI) {
            this.castingUI._castingText = '';
            this.castingUI._matches = [];
            this.castingUI.contents.clear();
            this.castingUI.refresh();
        }
        
        this.resetSilenceTimer();
        
        console.log('[SpellSystem] 输入已完全清空');
    }
    
    /**
     * 查找匹配的咒语（支持同音字和技能名）- 增强调试版
     */
    findMatchingSpell(text) {
        let bestMatch = null;
        let bestAccuracy = 0;
        
        console.log('[SpellSystem] 开始匹配咒语，输入文本:', text);
        
        for (const [id, spell] of this.spells) {
            if (!this.hasLearnedSpell(this.currentActor.actorId(), id)) {
                continue;
            }
            
            if (!this.checkRequirements(spell)) continue;
            
            let accuracy = this.calculateAccuracyWithPhonetic(text, spell.incantation);
            let isAlternative = false;
            
            console.log(`[SpellSystem] 测试咒语"${spell.name}"，咒文"${spell.incantation}"，准确度:${accuracy}`);
            
            if (spell.alternativeName) {
                const altAccuracy = this.calculateAccuracyWithPhonetic(text, spell.alternativeName);
                console.log(`[SpellSystem] 测试技能名"${spell.alternativeName}"，准确度:${altAccuracy}`);
                
                if (altAccuracy > accuracy) {
                    accuracy = altAccuracy;
                    isAlternative = true;
                }
            }
            
            const nameAccuracy = this.calculateAccuracyWithPhonetic(text, spell.name);
            if (nameAccuracy > accuracy) {
                accuracy = nameAccuracy;
                isAlternative = true;
            }
            
            if (accuracy >= this.config.minAccuracy && accuracy > bestAccuracy) {
                bestAccuracy = accuracy;
                bestMatch = {
                    spell: spell,
                    accuracy: accuracy,
                    isAlternative: isAlternative
                };
            }
        }
        
        if (bestMatch) {
            console.log(`[SpellSystem] 最佳匹配: ${bestMatch.spell.name}, 准确度: ${bestMatch.accuracy}`);
        } else {
            console.log('[SpellSystem] 没有找到匹配的咒语');
        }
        
        return bestMatch;
    }
    
    /**
     * 计算咒语准确度（支持同音字）- 增强版
     */
    calculateAccuracyWithPhonetic(spoken, target) {
        const spokenNorm = this.normalizeText(spoken);
        const targetNorm = this.normalizeText(target);
        
        if (spokenNorm === targetNorm) {
            return 1.0;
        }
        
        const phoneticVariants = this.phoneticMap[target] || [];
        for (const variant of phoneticVariants) {
            const variantNorm = this.normalizeText(variant);
            if (spokenNorm === variantNorm) {
                return 0.95;
            }
        }
        
        if (target.length <= 4) {
            if (spokenNorm.includes(targetNorm) || targetNorm.includes(spokenNorm)) {
                return 0.8;
            }
            
            if (targetNorm === '火球术' && (spokenNorm.includes('火') || spokenNorm.includes('球') || spokenNorm.includes('术'))) {
                return 0.6;
            }
            
            if ((targetNorm === '普攻' || targetNorm === '普通攻击') && 
                (spokenNorm.includes('普') || spokenNorm.includes('攻'))) {
                return 0.6;
            }
            
            let matchCount = 0;
            for (let i = 0; i < targetNorm.length; i++) {
                if (spokenNorm.includes(targetNorm[i])) {
                    matchCount++;
                }
            }
            if (matchCount >= 2) {
                return 0.5;
            }
        }
        
        let maxSimilarity = this.calculateSimilarity(spokenNorm, targetNorm);
        
        for (const variant of phoneticVariants) {
            const variantNorm = this.normalizeText(variant);
            const similarity = this.calculateSimilarity(spokenNorm, variantNorm);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        const keywords = this.extractKeywords(targetNorm);
        let keywordMatch = 0;
        
        for (const keyword of keywords) {
            if (spokenNorm.includes(keyword)) {
                keywordMatch++;
            }
        }
        
        const keywordScore = keywords.length > 0 ? keywordMatch / keywords.length : 1;
        
        return maxSimilarity * 0.7 + keywordScore * 0.3;
    }

    /**
     * 完成咏唱（优化版）
     */
    completeCasting(matchResult) {
        this.isCasting = false;
        const { spell, accuracy } = matchResult;
        
        console.log('[SpellSystem] 施法成功:', spell.name);
        
        this.stopVolumeAnalysis();
        
        const volumeScore = this.calculateVolumeScore();
        const damage = this.calculateDamage(spell, accuracy, volumeScore, matchResult.isAlternative);
        
        // v3.0新增：检查技能冷却
        if (spell.cooldown && this.isOnCooldown(this.currentActor.actorId(), spell.id)) {
            const remaining = this.getCooldownRemaining(this.currentActor.actorId(), spell.id);
            this.showFailMessage(`${spell.name}冷却中，还需${remaining}回合！`);
            this.hideCastingUI();
            this.cleanup();
            return;
        }
        
        // v3.0新增：究极魔法的使用次数检查
        if (spell.id === 'ultimate_magic') {
            if ($gameTroop._usedUltimateMagic && $gameTroop._usedUltimateMagic[this.currentActor.actorId()]) {
                this.showFailMessage('究极魔法已在本场战斗中使用过！');
                this.hideCastingUI();
                this.cleanup();
                return;
            }
            
            if (this.currentActor.mp <= 0) {
                this.showFailMessage('MP不足！');
                this.hideCastingUI();
                this.cleanup();
                return;
            }
            
            // 究极魔法不在这里消耗MP，在效果中消耗
        } else {
            // 常规MP检查
            if (this.currentActor.mp < spell.mpCost) {
                this.showFailMessage('MP不足！');
                this.hideCastingUI();
                this.cleanup();
                return;
            }
            
            // 消耗MP
            this.currentActor.gainMp(-spell.mpCost);
        }
        
        // v3.0新增：记录本次使用的技能（用于登龙剑连击判定）
        this.currentActor._lastUsedSpell = spell.id;
        
        // v3.0新增：设置技能冷却
        if (spell.cooldown && spell.cooldown > 0) {
            this.setCooldown(this.currentActor.actorId(), spell.id, spell.cooldown);
        }
        
        // 更新统计
        this.updateStats(spell, damage, accuracy, volumeScore);
        
        // 隐藏咏唱UI
        this.hideCastingUI();
        
        // 显示施法提示消息
        this.showCastMessage(spell, damage, accuracy, volumeScore);
        
        // 自动选择目标
        this.autoSelectTarget(spell);
        
        // 保存必要的引用
        const battleScene = this.currentBattle;
        const targetEnemy = this.currentTarget;
        const caster = this.currentActor;

        // 延迟显示结果窗口
        setTimeout(() => {
            this.showCastingResult(spell, damage, accuracy, volumeScore);
            
            // 处理咒语效果
            if (battleScene instanceof Scene_Battle && battleScene.processSpellAction) {
                try {
                    battleScene.processSpellAction(caster, targetEnemy, spell, damage);
                } catch (error) {
                    console.error('[SpellSystem] 处理咒语动作失败:', error);
                    this.executeSpellEffects(spell, damage, caster, targetEnemy, volumeScore);
                }
            } else {
                this.executeSpellEffects(spell, damage, caster, targetEnemy, volumeScore);
            }
            
            // 清理引用
            this.cleanup();
        }, 300);
    }
    
    /**
     * 检查是否需要目标选择
     */
    needsTargetSelection(spell) {
        const allyTargetEffects = ['heal', 'buff', 'purify', 'regen'];
        
        if (spell.effects.some(effect => allyTargetEffects.includes(effect))) {
            return false;
        }
        
        return false;
    }
    
    /**
     * 自动选择目标
     */
    autoSelectTarget(spell) {
        const allyTargetEffects = ['heal', 'buff', 'purify', 'regen'];
        
        if (spell.effects.some(effect => allyTargetEffects.includes(effect))) {
            this.currentTarget = this.currentActor;
        } else {
            this.currentTarget = $gameTroop.aliveMembers()[0];
        }
        
        console.log('[SpellSystem] 自动选择目标:', this.currentTarget ? this.currentTarget.name() : '无');
    }
    
    /**
     * 执行咒语效果（完整版 - 包含v3.0所有新增技能）
     */
    executeSpellEffects(spell, damage, caster, target, volumeScore = 0) {
        for (const effect of spell.effects) {
            switch (effect) {
                case 'damage':
                    if (target) {
                        // 检查普通攻击打带有<NormalOne>标签的Boss时，伤害改为1
                        if (spell.id === 'normal_attack' && target.isEnemy && target.isEnemy()) {
                            const noteEnemy = (target.enemy() && target.enemy().note) || '';
                            const noteHit = /<(NormalOne|NormalAttackOne)>/i.test(noteEnemy) ||
                                (target.states && target.states().some(st => st && /<(NormalOne|NormalAttackOne)>/i.test(st.note || '')));

                            if (noteHit) damage = 1;
                        }
                        target.gainHp(-damage);
                    }
                    break;
                    
                case 'heal':
                    caster.gainHp(damage);
                    break;
                    
                case 'aoe':
                    const enemies = $gameTroop.aliveMembers();
                    const aoeDamage = Math.floor(damage * 0.7);
                    enemies.forEach(enemy => {
                        enemy.gainHp(-aoeDamage);
                    });
                    break;
                    
                case 'buff':
                    if (spell.buffStateId) {
                        caster.addState(spell.buffStateId);
                        $gameMessage.add(`\\C[6]${caster.name()}\\C[0]获得了强化效果！`);
                    }
                    break;
                    
                case 'confuse':
                    if (spell.confuseStateId && target) {
                        target.addState(spell.confuseStateId);
                        $gameMessage.add(`\\C[5]${target.name()}\\C[0]陷入了混乱！`);
                    }
                    break;
                    
                case 'regen':
                    if (spell.regenStateId) {
                        caster.addState(spell.regenStateId);
                        const healAmount = Math.floor(caster.mhp * 0.1);
                        caster.gainHp(healAmount);
                        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]恢复了${healAmount}HP！`);
                    }
                    break;
                    
                case 'burn':
                    if (target) target.addState(2);
                    break;
                    
                case 'freeze':
                    if (target) target.addState(3);
                    break;
                    
                case 'paralyze':
                    if (target) target.addState(4);
                    break;
                    
                case 'slow':
                    if (target) target.addState(5);
                    break;
                    
                case 'buff_all':
                    $gameParty.members().forEach(member => {
                        member.addState(14);
                    });
                    break;
                    
                case 'purify':
                    caster.states().forEach(state => {
                        if (state && state.id > 0 && state.restriction > 0) {
                            caster.removeState(state.id);
                        }
                    });
                    break;

                case 'destiny_draw':
                    this.executeDestinyDraw(caster, target);
                    break;
                    
                case 'evil_eye':
                    this.executeEvilEye(caster, target, spell);
                    break;

                case 'soredowa_dokana':
                    this.executeSoreDowaDokana(caster, target, spell, volumeScore);
                    break;

                case 'laser_eye_fixed':
                    if (target) {
                        target.gainHp(-30);
                        AudioManager.playSe({name: 'Laser1', volume: 90, pitch: 100});
                        $gameMessage.add(`\\C[6]激光从${caster.name()}的眼中射出！\\C[0]`);
                    }
                    break;

                case 'serious_punch':
                    this.executeSeriousPunch(caster, target);
                    break;
                
                // ========== v3.0 新增效果 ==========
                
                case 'defense_buff':
                    // 普通防御效果
                    if (spell.defenseStateId) {
                        caster.addState(spell.defenseStateId);
                        $gameMessage.add(`\\C[6]${caster.name()}\\C[0]获得了\\C[3]女神的加护\\C[0]！`);
                        $gameMessage.add(`\\C[2]下回合伤害减免90%！\\C[0]`);
                        $gameMessage.add(`\\C[5]（提示：下回合使用登龙剑可获得连携加成）\\C[0]`);
                        
                        AudioManager.playSe({name: 'Barrier', volume: 90, pitch: 100});
                        $gameScreen.startFlash([100, 200, 255, 128], 30);
                    }
                    break;
                
                case 'heal_formula':
                    // 普通恢复效果
                    const healAmount = Math.floor(caster.mat * (spell.healMultiplier || 2.0));
                    caster.gainHp(healAmount);
                    
                    $gameMessage.add(`\\C[3]精灵的低语响起...\\C[0]`);
                    $gameMessage.add(`\\C[3]${caster.name()}\\C[0]恢复了\\C[2]${healAmount}\\C[0]点生命值！`);
                    
                    AudioManager.playSe({name: 'Heal1', volume: 90, pitch: 100});
                    
                    if (caster.startDamagePopup) {
                        caster.startDamagePopup();
                    }
                    break;
                
                case 'dragon_sword_damage':
                    // 登龙剑效果
                    this.executeDragonSword(caster, target, spell, volumeScore);
                    break;
                
                case 'thunder_god_damage':
                    // 雷公助我效果
                    this.executeThunderGod(caster, target, spell, volumeScore);
                    break;
                
                case 'konami_revive':
                    // 不死秘籍效果
                    if (spell.reviveStateId) {
                        caster.addState(spell.reviveStateId);
                        
                        if (spell.penaltyStateId) {
                            caster.addState(spell.penaltyStateId);
                        }
                        
                        AudioManager.playSe({name: 'Skill2', volume: 90, pitch: 80});
                        $gameScreen.startFlash([100, 255, 100, 150], 40);
                        
                        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]输入了神秘的指令...`);
                        $gameMessage.add(`\\C[5]↑↑↓↓←←→→\\C[0]`);
                        $gameMessage.add(`\\C[6]【不死秘籍】已激活！\\C[0]`);
                        $gameMessage.add(`\\C[2]下回合若死亡将满血满蓝复活\\C[0]`);
                        $gameMessage.add(`\\C[7]但若未死亡...将付出代价！\\C[0]`);
                    }
                    break;
                
                case 'ultimate_magic_damage':
                    // 究极魔法效果
                    this.executeUltimateMagic(caster, target, spell, volumeScore);
                    break;
                
                case 'excalibur_damage':
                    // 契约胜利之剑效果
                    this.executeExcalibur(caster, target, spell, volumeScore);
                    break;
            }
        }
    }

    /**
     * v3.0新增：登龙剑效果实现
     */
    executeDragonSword(caster, target, spell, volumeScore) {
        if (!target) return;
        
        // 计算物理伤害部分：ATK × 1.2 + 6
        const physicalDamage = Math.floor(caster.atk * 1.2 + 6);
        
        // 计算魔法伤害部分：MAT × 1.0 + 4
        const magicalDamage = Math.floor(caster.mat * 1.0 + 4);
        
        // 基础总伤害
        let totalDamage = physicalDamage + magicalDamage;
        
        // 音量影响暴击率
        let criticalRate = 0.1;
        
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            const multiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            criticalRate = Math.min(0.1 + (multiplier - 0.5) * 0.4, 0.8);
        } else {
            if (volumeScore >= 0.8) criticalRate = 0.6;
            else if (volumeScore >= 0.6) criticalRate = 0.4;
            else if (volumeScore >= 0.4) criticalRate = 0.25;
            else criticalRate = 0.1;
        }
        
        // 暴击判定
        const isCritical = Math.random() < criticalRate;
        if (isCritical) {
            totalDamage = Math.floor(totalDamage * 1.5);
        }
        
        // 检查上回合是否使用了普通防御
        let comboBonus = 1.0;
        if (caster._lastUsedSpell === 'normal_defense') {
            comboBonus = 1.2;
            $gameMessage.add(`\\C[6]【连携奖励】防御后的反击！\\C[0]`);
        }
        
        totalDamage = Math.floor(totalDamage * comboBonus);
        
        // 应用伤害
        target.gainHp(-totalDamage);
        
        if (target.startDamagePopup) {
            target.startDamagePopup();
        }
        
        AudioManager.playSe({name: 'Skill3', volume: 100, pitch: 120});
        
        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]的登龙剑斩出！`);
        $gameMessage.add(`\\C[2]物理伤害：${physicalDamage} + 魔法伤害：${magicalDamage}\\C[0]`);
        
        if (isCritical) {
            $gameMessage.add(`\\C[6]【暴击！】\\C[0]伤害提升50%！`);
        }
        
        $gameMessage.add(`\\C[2]总伤害：${totalDamage}\\C[0]`);
        $gameMessage.add(`\\C[8](暴击率：${(criticalRate * 100).toFixed(0)}%)\\C[0]`);
        
        if (isCritical) {
            $gameScreen.startFlash([255, 255, 0, 128], 30);
        }
    }
    
    /**
     * v3.0新增：雷公助我效果实现
     */
    executeThunderGod(caster, target, spell, volumeScore) {
        if (!target) return;
        
        // 计算基础伤害：MAT × 1.6 + 5
        let baseDamage = Math.floor(caster.mat * 1.6 + (spell.fixedBonus || 5));
        
        // 音量影响伤害浮动
        let volumeMultiplier = 1.0;
        
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            volumeMultiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            volumeMultiplier = Math.max(0.7, Math.min(1.3, volumeMultiplier));
        } else {
            if (volumeScore < 0.2) volumeMultiplier = 0.7;
            else if (volumeScore < 0.4) volumeMultiplier = 0.85;
            else if (volumeScore < 0.6) volumeMultiplier = 1.0;
            else if (volumeScore < 0.8) volumeMultiplier = 1.15;
            else volumeMultiplier = 1.3;
        }
        
        let totalDamage = Math.floor(baseDamage * volumeMultiplier);
        
        // 雷系属性伤害修正
        const thunderElementId = this.getElementId('thunder');
        if (thunderElementId > 0) {
            const elementRate = target.elementRate(thunderElementId);
            totalDamage = Math.floor(totalDamage * elementRate);
        }
        
        // 应用伤害
        target.gainHp(-totalDamage);
        
        if (target.startDamagePopup) {
            target.startDamagePopup();
        }
        
        AudioManager.playSe({name: 'Thunder4', volume: 100, pitch: 100});
        $gameScreen.startFlash([255, 255, 100, 200], 30);
        
        $gameMessage.add(`\\C[5]"苍天已死，黄天当立！"\\C[0]`);
        $gameMessage.add(`\\C[6]雷公之力从天而降！\\C[0]`);
        $gameMessage.add(`\\C[2]造成了${totalDamage}点雷系伤害！\\C[0]`);
        
        // 20%概率麻痹
        if (Math.random() < (spell.paralysisChance || 0.2)) {
            if (spell.paralysisStateId && !target.isDead()) {
                target.addState(spell.paralysisStateId);
                $gameMessage.add(`\\C[4]${target.name()}\\C[0]被雷电\\C[6]麻痹\\C[0]了！`);
                AudioManager.playSe({name: 'Thunder1', volume: 80, pitch: 120});
            }
        }
        
        // 20%概率灼烧
        if (Math.random() < (spell.burnChance || 0.2)) {
            if (spell.burnStateId && !target.isDead()) {
                target.addState(spell.burnStateId);
                $gameMessage.add(`\\C[2]${target.name()}\\C[0]被雷火\\C[6]灼烧\\C[0]了！`);
                AudioManager.playSe({name: 'Fire1', volume: 80, pitch: 110});
            }
        }
        
        $gameMessage.add(`\\C[8](音量倍率：${(volumeMultiplier * 100).toFixed(0)}%)\\C[0]`);
    }
    
    /**
     * v3.0新增：究极魔法效果实现
     */
    executeUltimateMagic(caster, target, spell, volumeScore) {
        if (!target) return;
        
        // 检查是否已在本场战斗中使用过
        if ($gameTroop._usedUltimateMagic && $gameTroop._usedUltimateMagic[caster.actorId()]) {
            $gameMessage.add(`\\C[7]究极魔法已在本场战斗中使用过！\\C[0]`);
            $gameMessage.add(`\\C[7]无法再次发动...\\C[0]`);
            return;
        }
        
        // 记录使用标记
        if (!$gameTroop._usedUltimateMagic) {
            $gameTroop._usedUltimateMagic = {};
        }
        $gameTroop._usedUltimateMagic[caster.actorId()] = true;
        
        // 获取当前所有MP
        const currentMP = caster.mp;
        
        if (currentMP <= 0) {
            $gameMessage.add(`\\C[7]MP不足，无法释放究极魔法！\\C[0]`);
            return;
        }
        
        // 消耗全部MP
        caster._mp = 0;
        
        // 计算伤害：MAT × 2 + 消耗MP × 1.5
        let baseDamage = Math.floor(caster.mat * 2 + currentMP * 1.5);
        
        // 音量浮动影响（低浮动：0.9~1.1）
        let volumeMultiplier = 1.0;
        
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            volumeMultiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            volumeMultiplier = Math.max(0.9, Math.min(1.1, volumeMultiplier));
        } else {
            if (volumeScore < 0.3) volumeMultiplier = 0.9;
            else if (volumeScore < 0.5) volumeMultiplier = 0.95;
            else if (volumeScore < 0.7) volumeMultiplier = 1.0;
            else if (volumeScore < 0.9) volumeMultiplier = 1.05;
            else volumeMultiplier = 1.1;
        }
        
        let totalDamage = Math.floor(baseDamage * volumeMultiplier);
        
        // 应用伤害
        target.gainHp(-totalDamage);
        
        // 施加力竭状态
        if (spell.exhaustStateId) {
            caster.addState(spell.exhaustStateId);
        }
        
        if (target.startDamagePopup) {
            target.startDamagePopup();
        }
        
        // 华丽的演出效果
        AudioManager.playSe({name: 'Saint5', volume: 100, pitch: 90});
        
        $gameScreen.startFlash([255, 100, 255, 200], 20);
        setTimeout(() => {
            $gameScreen.startFlash([100, 255, 255, 200], 20);
        }, 300);
        setTimeout(() => {
            $gameScreen.startFlash([255, 255, 100, 200], 20);
        }, 600);
        
        $gameScreen.startShake(9, 9, 60);
        
        $gameMessage.add(`\\C[5]"生命之色涡旋流转..."\\C[0]`);
        $gameMessage.add(`\\C[6]"七重之门现于世间..."\\C[0]`);
        $gameMessage.add(`\\C[2]"力量之塔君临九天！"\\C[0]`);
        $gameMessage.add(``);
        $gameMessage.add(`\\C[6]【究极魔法发动！】\\C[0]`);
        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]消耗了\\C[4]${currentMP}MP\\C[0]！`);
        $gameMessage.add(`\\C[2]造成了${totalDamage}点毁灭性伤害！\\C[0]`);
        $gameMessage.add(``);
        $gameMessage.add(`\\C[7]${caster.name()}陷入了力竭状态...\\C[0]`);
        $gameMessage.add(`\\C[8](伤害构成: MAT×2[${Math.floor(caster.mat * 2)}] + MP×1.5[${Math.floor(currentMP * 1.5)}])\\C[0]`);
    }
    
    /**
     * v3.0新增：契约胜利之剑效果实现
     */
    executeExcalibur(caster, target, spell, volumeScore) {
        if (!target) return;
        
        // 计算伤害：ATK × 3 + MAT × 2 + 200
        const physicalPart = Math.floor(caster.atk * 3);
        const magicalPart = Math.floor(caster.mat * 2);
        const fixedPart = spell.fixedBonus || 200;
        
        let baseDamage = physicalPart + magicalPart + fixedPart;
        
        // 音量中幅度浮动影响（0.8~1.3倍）
        let volumeMultiplier = 1.0;
        
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            volumeMultiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            volumeMultiplier = Math.max(0.8, Math.min(1.3, volumeMultiplier));
        } else {
            if (volumeScore < 0.2) volumeMultiplier = 0.8;
            else if (volumeScore < 0.4) volumeMultiplier = 0.9;
            else if (volumeScore < 0.6) volumeMultiplier = 1.0;
            else if (volumeScore < 0.8) volumeMultiplier = 1.15;
            else volumeMultiplier = 1.3;
        }
        
        let totalDamage = Math.floor(baseDamage * volumeMultiplier);
        
        // 光属性伤害修正
        const holyElementId = this.getElementId('holy');
        if (holyElementId > 0) {
            const elementRate = target.elementRate(holyElementId);
            totalDamage = Math.floor(totalDamage * elementRate);
        }
        
        // 应用伤害
        target.gainHp(-totalDamage);
        
        if (target.startDamagePopup) {
            target.startDamagePopup();
        }
        
        // 华丽的演出效果
        AudioManager.playSe({name: 'Saint9', volume: 100, pitch: 100});
        $gameScreen.startFlash([255, 255, 200, 200], 40);
        $gameScreen.startShake(5, 5, 30);
        
        $gameMessage.add(`\\C[6]【契约胜利之剑】\\C[0]`);
        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]高举圣剑！`);
        $gameMessage.add(`\\C[5]"以胜利为契，解放真名！"\\C[0]`);
        $gameMessage.add(`\\C[6]圣光从天而降！\\C[0]`);
        $gameMessage.add(`\\C[2]造成了${totalDamage}点光属性伤害！\\C[0]`);
        $gameMessage.add(`\\C[8](构成: ATK×3[${physicalPart}] + MAT×2[${magicalPart}] + 固定[${fixedPart}])\\C[0]`);
        $gameMessage.add(`\\C[8](音量倍率: ${(volumeMultiplier * 100).toFixed(0)}%)\\C[0]`);
    }

    /**
     * 天命抽取效果实现
     */
    executeDestinyDraw(caster, target) {
        const beneficialStates = [14, 15, 16, 17];
        const debuffStates = [2, 3, 4, 5, 6, 7];
        const allStates = [...beneficialStates, ...debuffStates];
        
        const shuffled = allStates.sort(() => Math.random() - 0.5);
        const targetState = shuffled[0];
        const casterState = shuffled[1];
        
        if (target && !target.isDead()) {
            target.addState(targetState);
            const stateName = $dataStates[targetState].name;
            $gameMessage.add(`\\C[5]${target.name()}\\C[0]获得了\\C[2]${stateName}\\C[0]状态！`);
        }
        
        if (caster && !caster.isDead()) {
            caster.addState(casterState);
            const stateName = $dataStates[casterState].name;
            $gameMessage.add(`\\C[3]${caster.name()}\\C[0]获得了\\C[2]${stateName}\\C[0]状态！`);
        }
    }

    /**
     * 邪王真眼效果实现
     */
    executeEvilEye(caster, target, spell) {
        console.log('[SpellSystem] executeEvilEye 参数:', {
            caster: caster ? caster.name() : 'null',
            target: target ? target.name() : 'null',
            spell: spell,
            instantDeathChance: spell ? spell.instantDeathChance : 'spell is null'
        });

        const deathChance = (spell && spell.instantDeathChance) ? spell.instantDeathChance : 0.3;
    
        // 消耗50%当前HP
        const currentHp = caster.hp;
        const hpCost = Math.floor(currentHp * 0.5);
        
        caster.gainHp(-hpCost);
        console.log('[SpellSystem] 扣血:', hpCost, '剩余HP:', caster.hp);
        
        if (caster.startDamagePopup) {
            caster.startDamagePopup();
        }
        
        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]献祭了\\C[2]${hpCost}\\C[0]点生命值！`);
        $gameMessage.add(`\\C[5]"漆黑烈焰在此觉醒..."\\C[0]`);
        
        if (SceneManager._scene && SceneManager._scene._statusWindow) {
            SceneManager._scene._statusWindow.refresh();
        }
        
        if (SceneManager._scene && SceneManager._scene._spriteset) {
            $gameScreen.startTint([-68, -68, -68, 68], 30);
            $gameScreen.startFlash([128, 0, 128, 128], 30);
        }
        
        AudioManager.playSe({name: 'Darkness3', volume: 90, pitch: 90});
        
        setTimeout(() => {
            const deathRoll = Math.random();
            console.log('[SpellSystem] 邪王真眼判定:', deathRoll, '需要小于', spell.instantDeathChance);
            console.log('[SpellSystem] 目标:', target ? target.name() : 'null', '是否死亡:', target ? target.isDead() : 'null');
            
            if (deathRoll < 0.3 && target && !target.isDead()) {
                console.log('[SpellSystem] 邪王真眼即死成功！');
                
                AudioManager.playSe({name: 'Collapse3', volume: 100, pitch: 80});
                
                $gameMessage.add(`\\C[6]【邪王真眼·全开】\\C[0]`);
                $gameMessage.add(`\\C[5]黑暗的力量回应了契约...\\C[0]`);
                $gameMessage.add(`\\C[2]${target.name()}\\C[0]被永劫的黑暗吞噬了！`);
                
                target._hp = 0;
                target.refresh();
                
                if (target.die) {
                    target.die();
                }
                
                if (target.startDamagePopup) {
                    target.startDamagePopup();
                }
                
                if (target.performCollapse) {
                    target.performCollapse();
                }
            
                $gameScreen.startFlash([255, 0, 255, 255], 60);
                
            } else {
                console.log('[SpellSystem] 邪王真眼即死失败');
                
                AudioManager.playSe({name: 'Buzzer2', volume: 90, pitch: 100});
                
                $gameMessage.add(`\\C[7]邪王真眼的力量失控了...\\C[0]`);
                $gameMessage.add(`\\C[8]黑暗拒绝了你的献祭。\\C[0]`);
                $gameMessage.add(`\\C[7]什么都没有发生...\\C[0]`);
                
                $gameScreen.startFlash([64, 0, 64, 64], 30);
            }
            
            setTimeout(() => {
                $gameScreen.startTint([0, 0, 0, 0], 30);
            }, 500);
            
        }, 1000);
    }

    /**
     * 所累哇都塔纳效果实现
     */
    executeSoreDowaDokana(caster, target, spell, volumeScore) {
        console.log('[SpellSystem] 发动陷阱卡！当前敌群ID:', $gameTroop._troopId);
        
        if ($gameTroop._troopId === spell.targetTroopId) {
            console.log('[SpellSystem] 触发逆转陷阱！');
            
            AudioManager.playSe({name: 'Magic3', volume: 100, pitch: 120});
            
            $gameMessage.add(`\\C[5]"那又如何？"\\C[0]`);
            $gameMessage.add(`\\C[6]将大局逆转吧！\\C[0]`);
            $gameMessage.add(`\\C[5]"开！"\\C[0]`);
            
            $gameScreen.startFlash([255, 0, 255, 255], 60);
            
            setTimeout(() => {
                $gameMessage.add(`\\C[2]我集齐了五张艾克佐迪亚！\\C[0]`);
                $gameMessage.add(`\\C[2]艾克佐迪亚，召唤！\\C[0]`);
                $gameMessage.add(`\\C[6]魔神火焰炮！！！\\C[0]`);
                
                const enemies = $gameTroop.aliveMembers();
                enemies.forEach(enemy => {
                    if (enemy.startDamagePopup) {
                        enemy.startDamagePopup();
                    }
                    
                    enemy._hp = 0;
                    enemy.refresh();
                    if (enemy.die) {
                        enemy.die();
                    }
                    if (enemy.performCollapse) {
                        enemy.performCollapse();
                    }
                });
                
                AudioManager.playSe({name: 'Victory2', volume: 90, pitch: 100});
                
            }, 1500);
            
        } else {
            console.log('[SpellSystem] 普通战斗，根据决斗者之魂恢复HP');
            
            let healRate = spell.healRateMin;
            
            if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
                const multiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
                healRate = spell.healRateMin + (spell.healRateMax - spell.healRateMin) * 
                        Math.min((multiplier - 0.5) / 1.5, 1);
            } else {
                if (volumeScore < 0.2) healRate = 0.1;
                else if (volumeScore < 0.4) healRate = 0.2;
                else if (volumeScore < 0.6) healRate = 0.4;
                else if (volumeScore < 0.8) healRate = 0.6;
                else healRate = 0.8;
            }
            
            const healAmount = Math.floor(caster.mhp * healRate);
            
            caster.gainHp(healAmount);
            
            AudioManager.playSe({name: 'Heal3', volume: 90, pitch: 100});
            
            const spiritLevel = healRate >= 0.6 ? '决斗者之魂在燃烧！' : 
                            healRate >= 0.4 ? '相信卡组的力量！' : 
                            '还没到认输的时候！';
            
            $gameMessage.add(`\\C[3]${caster.name()}\\C[0]：\\C[5]"那又如何？"\\C[0]`);
            $gameMessage.add(`\\C[6]${spiritLevel}\\C[0]`);
            $gameMessage.add(`\\C[3]恢复了\\C[2]${healAmount}\\C[0]点生命值！`);
            $gameMessage.add(`\\C[8]（决斗者之魂：${(healRate * 100).toFixed(0)}%）\\C[0]`);
            
            $gameScreen.startFlash([255, 255, 128, 128], 30);
        }
    }

    /**
     * 认真的一拳效果实现
     */
    executeSeriousPunch(caster, target) {
        console.log('[SpellSystem] 发动认真的一拳！');
        
        AudioManager.playSe({name: 'Powerup', volume: 100, pitch: 80});
        $gameScreen.startTint([-68, -68, -68, 68], 30);
        
        $gameMessage.add(`\\C[3]${caster.name()}\\C[0]：\\C[5]"这是...认真的一拳！"\\C[0]`);
        $gameMessage.add(`\\C[6]【认真系列·认真的一拳】\\C[0]`);
        
        setTimeout(() => {
            $gameScreen.startFlash([255, 255, 255, 255], 60);
            AudioManager.playSe({name: 'Collapse4', volume: 100, pitch: 90});
            
            const enemies = $gameTroop.aliveMembers();
            
            if (enemies.length > 0) {
                $gameMessage.add(`\\C[2]一拳的冲击波席卷了整个战场！\\C[0]`);
                
                enemies.forEach((enemy, index) => {
                    setTimeout(() => {
                        if (!enemy.isDead()) {
                            $gameMessage.add(`\\C[2]${enemy.name()}\\C[0]被一拳击飞了！`);
                            
                            enemy._hp = 0;
                            enemy.refresh();
                            
                            if (enemy.die) {
                                enemy.die();
                            }
                            
                            if (enemy.startDamagePopup) {
                                const originalResult = enemy._result;
                                enemy._result = { hpDamage: 9999999 };
                                enemy.startDamagePopup();
                                enemy._result = originalResult;
                            }
                            
                            if (enemy.performCollapse) {
                                enemy.performCollapse();
                            }
                            
                            AudioManager.playSe({name: 'Blow3', volume: 90, pitch: 100});
                        }
                    }, index * 200);
                });
                
                setTimeout(() => {
                    $gameMessage.add(`\\C[6]所有敌人都被击倒了！\\C[0]`);
                    $gameMessage.add(`\\C[5]"果然，认真起来还是太强了..."\\C[0]`);
                    
                    AudioManager.playSe({name: 'Victory1', volume: 100, pitch: 100});
                    $gameScreen.startTint([0, 0, 0, 0], 30);
                }, enemies.length * 200 + 500);
                
            } else {
                $gameMessage.add(`\\C[7]但是战场上已经没有敌人了...\\C[0]`);
                $gameScreen.startTint([0, 0, 0, 0], 30);
            }
            
        }, 1500);
    }

    /**
     * 计算伤害（简化版）
     */
    calculateDamage(spell, accuracy, volumeScore, isAlternative = false) {
        
        if (spell.isFixedDamage) {
            return spell.basePower;
        }

        if (spell.isNoDamage) {
            return 0;
        }
        
        if (spell.effects.includes('evil_eye')) {
            return 0;
        }
        
        // 获取角色的实际属性值
        let baseStat = 0;
        if (spell.isPhysical) {
            baseStat = this.currentActor.atk;
        } else {
            baseStat = this.currentActor.mat;
        }
        
        // 基础伤害 = 属性值 * 基础倍率 * 技能倍率
        let damage = baseStat * (spell.basePower / 100) * (spell.powerMultiplier || 1.0);
        
        // 准确度影响
        damage *= (0.7 + accuracy * 0.3);
        
        // 音量影响
        if (spell.id === 'dragon_roar') {
            damage = this.calculateDragonRoarDamage(spell, volumeScore);
        } else {
            let volumeMultiplier = 1.0;
            
            if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
                volumeMultiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            } else {
                if (volumeScore < 0.2) volumeMultiplier = 0.8;
                else if (volumeScore < 0.4) volumeMultiplier = 0.9;
                else if (volumeScore < 0.6) volumeMultiplier = 1.0;
                else if (volumeScore < 0.8) volumeMultiplier = 1.1;
                else volumeMultiplier = 1.2;
            }
            
            damage *= volumeMultiplier;
        }
        
        // 如果使用技能名版本，降低威力到80%
        if (isAlternative) {
            damage *= 0.8;
        }
        
        // 属性相克
        if (this.currentTarget && spell.element !== 'none') {
            const elementId = this.getElementId(spell.element);
            if (elementId > 0) {
                const elementRate = this.currentTarget.elementRate(elementId);
                damage *= elementRate;
            }
        }
        
        // 随机浮动（±10%）
        const variance = 0.1;
        const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
        damage *= randomFactor;
        
        return Math.floor(damage);
    }

    /**
     * 获取元素ID
     */
    getElementId(elementName) {
        const elementMap = {
            'none': 0,
            'physical': 1,
            'fire': 2,
            'ice': 3,
            'thunder': 4,
            'water': 5,
            'earth': 6,
            'wind': 7,
            'holy': 8,
            'dark': 9
        };
        
        return elementMap[elementName] || 0;
    }

    /**
     * 恶龙咆哮专用伤害计算
     */
    calculateDragonRoarDamage(spell, volumeScore) {
        const mat = this.currentActor.mat;
        
        let multiplier = 0.1;
        
        if (volumeScore < 0.2) {
            multiplier = 0.1;
        } else if (volumeScore < 0.4) {
            multiplier = 0.5;
        } else if (volumeScore < 0.6) {
            multiplier = 2;
        } else if (volumeScore < 0.8) {
            multiplier = 5;
        } else if (volumeScore < 0.9) {
            multiplier = 10;
        } else {
            multiplier = 20;
        }
        
        let damage = mat * (spell.basePower / 100) * multiplier;
        
        damage = Math.max(spell.minDamage || 1, damage);
        damage = Math.min(spell.maxDamage || 9999, damage);
        
        return Math.floor(damage);
    }
    
    /**
     * 清理资源（增强版）
     */
    cleanup() {
        console.log('[SpellSystem] 执行清理');
        
        if (this._debuggerWasVisible && window.$voiceRPG && this._originalOnResult) {
            window.$voiceRPG.onResult = this._originalOnResult;
            this._originalOnResult = null;
            this._debuggerWasVisible = false;
        }
        
        if (this.castingUI) {
            this.castingUI.hide();
            this.castingUI.deactivate();
            
            if (this.castingUI.parent) {
                this.castingUI.parent.removeChild(this.castingUI);
            }
            
            this.castingUI = null;
        }
        
        this.currentBattle = null;
        this.currentTarget = null;
        this.currentActor = null;
        this.castingText = '';
        this.pendingText = '';
        this.isCasting = false;
        this.isListening = false;
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        this.pendingSpellData = null;
    }
    
    /**
     * 战斗结束时的清理（供外部调用）
     */
    onBattleEnd() {
        console.log('[SpellSystem] 战斗结束，执行完整清理');
        
        if (this.isCasting) {
            this.cancelCasting();
        }
        
        this.stopVolumeAnalysis();
        this.cleanup();
        
        if (this.castingUI && this.castingUI.parent) {
            try {
                this.castingUI.parent.removeChild(this.castingUI);
            } catch (e) {
                console.warn('[SpellSystem] 清理窗口时出错:', e);
            }
        }
        this.castingUI = null;
    }
    
    // ========== 辅助方法 ==========
    
    /**
     * 角色学习咒语
     */
    learnSpell(actorId, spellId) {
        if (!this.learnedSpells.has(actorId)) {
            this.learnedSpells.set(actorId, new Set());
        }
        
        this.learnedSpells.get(actorId).add(spellId);
        console.log(`[SpellSystem] 角色${actorId}学会了咒语: ${spellId}`);
        
        const actor = $gameActors.actor(actorId);
        if (actor) {
            actor._learnedSpells = Array.from(this.learnedSpells.get(actorId));
        }
    }
    
    /**
     * 批量学习咒语
     */
    learnSpells(actorId, spellIds) {
        spellIds.forEach(spellId => this.learnSpell(actorId, spellId));
    }
    
    /**
     * 检查角色是否学会了咒语
     */
    hasLearnedSpell(actorId, spellId) {
        if (!this.learnedSpells.has(actorId)) {
            const actor = $gameActors.actor(actorId);
            if (actor && actor._learnedSpells) {
                this.learnedSpells.set(actorId, new Set(actor._learnedSpells));
            } else {
                return false;
            }
        }
        
        return this.learnedSpells.get(actorId).has(spellId);
    }
    
    /**
     * 获取角色已学会的咒语列表
     */
    getLearnedSpells(actorId) {
        const learned = [];
        const spellIds = this.learnedSpells.get(actorId) || new Set();
        
        for (const [id, spell] of this.spells) {
            if (spellIds.has(id)) {
                learned.push(spell);
            }
        }
        
        return learned;
    }
    
    /**
     * 初始化角色的默认咒语
     */
    initializeActorSpells(actorId) {
        // 默认学会基础咒语
        const basicSpells = ['fire_ball', 'normal_attack'];
        this.learnSpells(actorId, basicSpells);
        
        console.log('[SpellSystem] 火球术是否已注册:', this.spells.has('fire_ball'));
        console.log('[SpellSystem] 火球术数据:', this.spells.get('fire_ball'));
    }
    
    /**
     * 检查施法条件
     */
    checkRequirements(spell) {
        if (!spell.requirements) return true;
        
        const req = spell.requirements;
        
        if (req.level && this.currentActor.level < req.level) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 计算音量得分
     */
    calculateVolumeScore() {
        const maxScore = Math.min(this.maxVolume / 0.8, 1);
        const avgScore = Math.min(this.averageVolume / 0.5, 1);
        
        return maxScore * 0.6 + avgScore * 0.4;
    }
    
    /**
     * 计算相似度
     */
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) dp[i][0] = i;
        for (let j = 0; j <= len2; j++) dp[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + 1
                    );
                }
            }
        }
        
        const distance = dp[len1][len2];
        const maxLen = Math.max(len1, len2);
        
        return maxLen > 0 ? 1 - (distance / maxLen) : 1;
    }
    
    /**
     * 提取关键词
     */
    extractKeywords(text) {
        const keywords = [];
        
        if (text.length > 10) {
            if (text.includes('邪王真眼')) {
                keywords.push('邪王', '真眼', '契约', '烈焰');
            }
            else if (text.includes('库洛')) {
                keywords.push('库洛', '力量', '展示');
            }
        } else {
            for (let i = 0; i < text.length - 1; i++) {
                keywords.push(text.substring(i, i + 2));
            }
        }
        
        return [...new Set(keywords)];
    }
    
    /**
     * 标准化文本
     */
    normalizeText(text) {
        return text
            .trim()
            .replace(/\s+/g, '')
            .replace(/[，。！？、]/g, '');
    }
    
    /**
     * 开始音量分析
     */
    startVolumeAnalysis() {
        console.log('[SpellSystem] 开始音量分析，清空输入内容');
        this.castingText = '';
        this.pendingText = '';
        if (this.castingUI) {
            this.castingUI.updateCastingText('');
            this.castingUI.updateMatches([]);
        }
        
        if (!this.volumeAnalyzer) {
            const VolumeAnalyzerClass = window.VolumeAnalyzer || (window.$moduleLoader && window.$moduleLoader.getModule('VolumeAnalyzer'));
            if (!VolumeAnalyzerClass) {
                console.error('[SpellSystem] VolumeAnalyzer未加载');
                return;
            }
            this.volumeAnalyzer = new VolumeAnalyzerClass();
        }
        
        this.volumeAnalyzer.start((volume) => {
            this.currentVolume = volume;
            this.maxVolume = Math.max(this.maxVolume, volume);
            
            if (this.averageVolume === 0) {
                this.averageVolume = volume;
            } else {
                this.averageVolume = this.averageVolume * 0.9 + volume * 0.1;
            }
            
            if (this.castingUI) {
                this.castingUI.updateVolume(volume);
            }
        });
    }
    
    /**
     * 停止音量分析
     */
    stopVolumeAnalysis() {
        if (this.volumeAnalyzer) {
            this.volumeAnalyzer.stop();
        }
    }
    
    /**
     * 显示咏唱UI
     */
    showCastingUI() {
        console.log('[SpellSystem] 准备显示咏唱UI');
        
        if (!this.castingUI) {
            const WindowClass = window.Window_SpellCasting || (window.$moduleLoader && window.$moduleLoader.getModule('Window_SpellCasting'));
            if (!WindowClass) {
                console.error('[SpellSystem] Window_SpellCasting未加载');
                return;
            }
            this.castingUI = new WindowClass();
        }
        
        const scene = SceneManager._scene;
        if (scene) {
            if (!this.castingUI.parent) {
                if (scene._windowLayer) {
                    scene._windowLayer.addChild(this.castingUI);
                } else if (scene.addWindow) {
                    scene.addWindow(this.castingUI);
                } else {
                    scene.addChild(this.castingUI);
                }
            }
        }
        
        this.castingUI.show();
        this.castingUI.activate();
        this.castingUI.setActor(this.currentActor);
        
        const availableSpells = this.getLearnedSpells(this.currentActor.actorId());
        this.castingUI.setSpellList(availableSpells);
        
        this.castingUI.refresh();
    }
    
    /**
     * 更新咏唱UI
     */
    updateCastingUI(text) {
        if (this.castingUI) {
            this.castingUI.updateCastingText(text);
            
            const matches = [];
            for (const [id, spell] of this.spells) {
                if (this.hasLearnedSpell(this.currentActor.actorId(), id) && this.checkRequirements(spell)) {
                    const accuracy = this.calculateAccuracyWithPhonetic(text, spell.incantation);
                    if (accuracy > 0.3) {
                        matches.push({
                            spell: spell,
                            accuracy: accuracy
                        });
                    }
                }
            }
            
            matches.sort((a, b) => b.accuracy - a.accuracy);
            this.castingUI.updateMatches(matches);
        }
    }
    
    /**
     * 隐藏咏唱UI
     */
    hideCastingUI() {
        if (this.castingUI) {
            this.castingUI.hide();
            this.castingUI.deactivate();
        }
    }
    
    /**
     * 显示失败消息
     */
    showFailMessage(message) {
        $gameMessage.add('\\C[2]' + message + '\\C[0]');
    }
    
    /**
     * 显示施法提示消息
     */
    showCastMessage(spell, damage, accuracy, volumeScore) {
        const grade = this.calculateGrade(accuracy, volumeScore);
        
        const actorName = this.currentActor.name();
        const targetName = this.currentTarget ? this.currentTarget.name() : '敌人';
        const spellName = spell.name;
        
        $gameMessage.add(`\\C[3]${actorName}\\C[0]使用了\\C[2]${spellName}\\C[0]！`);
        
        if (spell.isNoDamage) {
            if (spell.effects.includes('heal')) {
                $gameMessage.add(`恢复了生命值！`);
            } else if (spell.effects.includes('buff')) {
                $gameMessage.add(`获得了强化效果！`);
            } else if (spell.effects.includes('regen')) {
                $gameMessage.add(`获得了持续恢复效果！`);
            }
        } else {
            if (spell.effects.includes('damage')) {
                $gameMessage.add(`对\\C[3]${targetName}\\C[0]造成了\\C[2]${damage}\\C[0]点伤害！`);
            }
        }
        
        const gradeColors = {
            'SSS': '\\C[6]',
            'SS': '\\C[5]',
            'S': '\\C[2]',
            'A': '\\C[1]',
            'B': '\\C[3]',
            'C': '\\C[4]',
            'D': '\\C[7]'
        };
        
        const gradeColor = gradeColors[grade] || '\\C[0]';
        
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            const multiplier = window.$voiceCalibration.calculateDamageMultiplier(volumeScore);
            $gameMessage.add(`${gradeColor}【${grade}评级】\\C[0] 音量倍率:${(multiplier * 100).toFixed(0)}%`);
        } else {
            $gameMessage.add(`${gradeColor}【${grade}评级】\\C[0] 音量:${(volumeScore * 100).toFixed(0)}%`);
        }
    }
    
    /**
     * 显示施法结果
     */
    showCastingResult(spell, damage, accuracy, volumeScore) {
        const WindowClass = window.Window_SpellResult || (window.$moduleLoader && window.$moduleLoader.getModule('Window_SpellResult'));
        if (!WindowClass) {
            console.error('[SpellSystem] Window_SpellResult未加载');
            return;
        }
        
        const resultWindow = new WindowClass();
        resultWindow.setResult({
            spell: spell,
            damage: damage,
            accuracy: accuracy,
            volume: volumeScore,
            grade: this.calculateGrade(accuracy, volumeScore),
            actor: this.currentActor,
            target: this.currentTarget
        });
        
        const scene = SceneManager._scene;
        if (scene) {
            if (scene._windowLayer) {
                scene._windowLayer.addChild(resultWindow);
            } else {
                scene.addChild(resultWindow);
            }
        }
        
        resultWindow.show();
        
        setTimeout(() => {
            resultWindow.hide();
            if (resultWindow.parent) {
                resultWindow.parent.removeChild(resultWindow);
            }
        }, 4000);
    }
    
    /**
     * 计算评级
     */
    calculateGrade(accuracy, volume) {
        if (window.$voiceCalibration && window.$voiceCalibration.isCalibrated()) {
            const multiplier = window.$voiceCalibration.calculateDamageMultiplier(volume);
            
            if (multiplier >= 1.2) return 'SSS';
            if (multiplier >= 1.0) return 'SS';
            if (multiplier >= 0.8) return 'S';
            if (multiplier >= 0.6) return 'A';
            if (multiplier >= 0.5) return 'B';
            if (multiplier >= 0.3) return 'C';
            return 'D';
        } else {
            if (volume >= 0.90) return 'SSS';
            if (volume >= 0.80) return 'SS';
            if (volume >= 0.70) return 'S';
            if (volume >= 0.60) return 'A';
            if (volume >= 0.50) return 'B';
            if (volume >= 0.40) return 'C';
            return 'D';
        }
    }
    
    /**
     * 更新统计
     */
    updateStats(spell, damage, accuracy, volume) {
        this.stats.totalCasts++;
        this.stats.successfulCasts++;
        this.stats.totalDamage += damage;
        
        if (damage > this.stats.highestDamage) {
            this.stats.highestDamage = damage;
        }
        
        if (accuracy >= 0.95 && volume >= 0.9) {
            this.stats.perfectCasts++;
        }
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            averageDamage: this.stats.totalCasts > 0 
                ? Math.floor(this.stats.totalDamage / this.stats.totalCasts) 
                : 0,
            successRate: this.stats.totalCasts > 0
                ? (this.stats.successfulCasts / this.stats.totalCasts * 100).toFixed(1) + '%'
                : '0%',
            perfectRate: this.stats.successfulCasts > 0
                ? (this.stats.perfectCasts / this.stats.successfulCasts * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

// 创建全局实例
window.$spellSystem = new SpellSystem();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellSystem;
} else {
    window.SpellSystem = SpellSystem;
}
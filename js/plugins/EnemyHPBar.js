/*:
 * @target MZ
 * @plugindesc Enemy HP Bar v1.1.0 - 敌人血条显示（修复版）
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 敌人血条显示插件 - 修复版
 * ============================================================================
 * 
 * 修复内容：
 * 1. 正确管理血条精灵的生命周期
 * 2. 战斗结束时清理所有血条
 * 3. 敌人死亡时立即隐藏血条
 * 4. 防止内存泄漏
 * 
 * @param barWidth
 * @text 血条宽度
 * @desc 血条的宽度
 * @type number
 * @min 50
 * @max 200
 * @default 100
 * 
 * @param barHeight
 * @text 血条高度
 * @desc 血条的高度
 * @type number
 * @min 4
 * @max 20
 * @default 8
 * 
 * @param barOffsetY
 * @text 血条Y偏移
 * @desc 血条相对于敌人的Y轴偏移
 * @type number
 * @min -100
 * @max 100
 * @default -10
 * 
 * @param showName
 * @text 显示名称
 * @desc 是否显示敌人名称
 * @type boolean
 * @default true
 * 
 * @param showNumbers
 * @text 显示数值
 * @desc 是否显示HP数值
 * @type boolean
 * @default true
 * 
 * @param alwaysShow
 * @text 始终显示
 * @desc 是否始终显示血条（否则只在受伤时显示）
 * @type boolean
 * @default true
 * 
 * @param fadeOutTime
 * @text 淡出时间
 * @desc 敌人死亡后血条淡出时间（毫秒）
 * @type number
 * @min 0
 * @max 2000
 * @default 500
 */

(() => {
    'use strict';
    
    const pluginName = 'EnemyHPBar';
    const parameters = PluginManager.parameters(pluginName);
    const barWidth = Number(parameters['barWidth'] || 100);
    const barHeight = Number(parameters['barHeight'] || 8);
    const barOffsetY = Number(parameters['barOffsetY'] || -10);
    const showName = parameters['showName'] === 'true';
    const showNumbers = parameters['showNumbers'] === 'true';
    const alwaysShow = parameters['alwaysShow'] === 'true';
    const fadeOutTime = Number(parameters['fadeOutTime'] || 500);
    
    // 全局血条管理器
    class EnemyHPBarManager {
        constructor() {
            this.hpBars = new Map(); // enemy -> hpBar sprite
        }
        
        createHPBar(enemy, parent) {
            if (this.hpBars.has(enemy)) {
                console.log('[EnemyHPBar] 血条已存在，返回现有血条:', enemy.name());
                return this.hpBars.get(enemy);
            }
            
            try {
                console.log('[EnemyHPBar] 创建新血条:', enemy.name());
                const hpBar = new Sprite_EnemyHPGauge(enemy);
                parent.addChild(hpBar);
                this.hpBars.set(enemy, hpBar);
                
                console.log('[EnemyHPBar] 血条创建成功，当前血条数量:', this.hpBars.size);
                return hpBar;
            } catch (error) {
                console.error('[EnemyHPBar] 创建血条失败:', error, enemy.name());
                return null;
            }
        }
        
        removeHPBar(enemy) {
            const hpBar = this.hpBars.get(enemy);
            if (hpBar) {
                console.log('[EnemyHPBar] 移除血条:', enemy ? enemy.name() : '未知敌人');
                try {
                    if (hpBar.parent) {
                        hpBar.parent.removeChild(hpBar);
                    }
                    hpBar.destroy();
                    this.hpBars.delete(enemy);
                    console.log('[EnemyHPBar] 血条移除成功，剩余血条数量:', this.hpBars.size);
                } catch (error) {
                    console.error('[EnemyHPBar] 移除血条失败:', error);
                }
            }
        }
        
        clearAll() {
            console.log('[EnemyHPBar] 清理所有血条，当前数量:', this.hpBars.size);
            for (const [enemy, hpBar] of this.hpBars) {
                try {
                    if (hpBar.parent) {
                        hpBar.parent.removeChild(hpBar);
                    }
                    hpBar.destroy();
                } catch (error) {
                    console.error('[EnemyHPBar] 清理血条时出错:', error);
                }
            }
            this.hpBars.clear();
            console.log('[EnemyHPBar] 所有血条已清理');
        }
        
        update() {
            for (const [enemy, hpBar] of this.hpBars) {
                if (!enemy || enemy.isDead()) {
                    this.removeHPBar(enemy);
                }
            }
        }
    }
    
    // 创建全局管理器实例
    window.$enemyHPBarManager = new EnemyHPBarManager();
    
    // 调试功能
    window.testEnemyHPBar = function() {
        console.log('[EnemyHPBar] 手动测试血条功能...');
        
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Battle)) {
            console.log('[EnemyHPBar] 不在战斗场景中');
            return;
        }
        
        if (!scene._spriteset || !scene._spriteset._enemySprites) {
            console.log('[EnemyHPBar] 找不到敌人精灵');
            return;
        }
        
        console.log('[EnemyHPBar] 敌人精灵数量:', scene._spriteset._enemySprites.length);
        scene._spriteset._enemySprites.forEach((sprite, index) => {
            console.log(`[EnemyHPBar] 敌人${index}:`, {
                hasEnemy: !!sprite._enemy,
                enemyName: sprite._enemy ? sprite._enemy.name() : '无',
                hasParent: !!sprite.parent,
                hasHPBar: !!sprite._hpGaugeSprite,
                spriteVisible: sprite.visible,
                spriteOpacity: sprite.opacity,
                appeared: sprite._appeared,
                isHidden: sprite._enemy ? (sprite._enemy.isHidden ? sprite._enemy.isHidden() : '无isHidden方法') : '无敌人',
                hpBarVisible: sprite._hpGaugeSprite ? sprite._hpGaugeSprite.visible : '无血条'
            });
        });
        
        console.log('[EnemyHPBar] 当前血条数量:', window.$enemyHPBarManager.hpBars.size);
        
        // 尝试重新初始化血条
        scene.initializeEnemyHPBars();
    };
    
    // 测试隐藏/显示敌人功能
    window.testEnemyVisibility = function(enemyIndex, hide = true) {
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Battle)) {
            console.log('[EnemyHPBar] 不在战斗场景中');
            return;
        }
        
        if (!scene._spriteset || !scene._spriteset._enemySprites) {
            console.log('[EnemyHPBar] 找不到敌人精灵');
            return;
        }
        
        const sprite = scene._spriteset._enemySprites[enemyIndex];
        if (!sprite) {
            console.log('[EnemyHPBar] 敌人索引无效:', enemyIndex);
            return;
        }
        
        if (hide) {
            sprite._appeared = false;
            sprite.opacity = 0;
            sprite.visible = false;
            console.log('[EnemyHPBar] 隐藏敌人:', sprite._enemy ? sprite._enemy.name() : '未知');
        } else {
            sprite._appeared = true;
            sprite.opacity = 255;
            sprite.visible = true;
            console.log('[EnemyHPBar] 显示敌人:', sprite._enemy ? sprite._enemy.name() : '未知');
        }
    };
    
    // 敌人血条精灵（改进版）
    class Sprite_EnemyHPGauge extends Sprite {
        constructor(enemy) {
            super();
            this._enemy = enemy;
            this._battlerSprite = null;
            this._fadeOut = false;
            this._fadeOutDuration = fadeOutTime / 1000 * 60; // 转换为帧数
            this._fadeOutTimer = 0;
            
            this.createBitmap();
            this.update();
        }
        
        createBitmap() {
            const width = barWidth + 32;
            const height = 60;
            this.bitmap = new Bitmap(width, height);
            this.anchor.x = 0.5;
            this.anchor.y = 1;
        }
        
        setBattlerSprite(sprite) {
            this._battlerSprite = sprite;
        }
        
        update() {
            super.update();
            
            // 处理淡出
            if (this._fadeOut) {
                this._fadeOutTimer++;
                this.opacity = 255 * (1 - this._fadeOutTimer / this._fadeOutDuration);
                
                if (this._fadeOutTimer >= this._fadeOutDuration) {
                    this.visible = false;
                    // 通知管理器移除自己
                    window.$enemyHPBarManager.removeHPBar(this._enemy);
                    return;
                }
            }
            
            this.updatePosition();
            this.updateVisibility();
            
            // 同步敌人精灵的透明度（用于出现/消失效果）
            if (this._battlerSprite && this.visible) {
                this.opacity = Math.min(this.opacity, this._battlerSprite.opacity);
            }
            
            if (this.visible && this._enemy && !this._fadeOut) {
                this.redraw();
            }
        }
        
        updatePosition() {
            if (this._battlerSprite) {
                this.x = this._battlerSprite.x;
                this.y = this._battlerSprite.y + barOffsetY;
            }
        }
        
        updateVisibility() {
            if (this._fadeOut) return; // 淡出中不改变可见性
            
            if (!this._enemy) {
                this.visible = false;
                return;
            }
            
            // 敌人死亡时开始淡出
            if (this._enemy.isDead() && !this._fadeOut) {
                this.startFadeOut();
                return;
            }
            
            // 检查敌人精灵的可见性状态
            if (this._battlerSprite) {
                // 如果敌人精灵不可见，血条也不显示
                if (!this._battlerSprite.visible || this._battlerSprite.opacity === 0) {
                    this.visible = false;
                    return;
                }
                
                // 检查敌人是否已经"出现"（_appeared属性）
                if (this._battlerSprite._appeared === false) {
                    this.visible = false;
                    return;
                }
                
                // 检查敌人是否隐藏
                if (this._enemy.isHidden && this._enemy.isHidden()) {
                    this.visible = false;
                    return;
                }
            }
            
            if (alwaysShow) {
                this.visible = true;
            } else {
                // 只在受伤时显示
                this.visible = this._enemy.hp < this._enemy.mhp;
            }
        }
        
        startFadeOut() {
            this._fadeOut = true;
            this._fadeOutTimer = 0;
        }
        
        redraw() {
            const bitmap = this.bitmap;
            bitmap.clear();
            
            if (!this._enemy || this._enemy.isDead()) return;
            
            const width = barWidth;
            const height = barHeight;
            const x = Math.floor((bitmap.width - width) / 2);
            let y = 30;
            
            // 绘制名称
            if (showName) {
                bitmap.fontSize = 16;
                bitmap.textColor = ColorManager.normalColor();
                bitmap.drawText(this._enemy.name(), 0, 0, bitmap.width, 24, 'center');
                y += 2;
            }
            
            // 绘制血条背景
            bitmap.fillRect(x - 2, y - 2, width + 4, height + 4, '#000000');
            bitmap.fillRect(x - 1, y - 1, width + 2, height + 2, '#ffffff');
            bitmap.fillRect(x, y, width, height, '#222222');
            
            // 计算血条长度
            const hpRate = Math.max(0, this._enemy.hp / this._enemy.mhp);
            const fillWidth = Math.floor(width * hpRate);
            
            // 绘制血条
            if (fillWidth > 0) {
                const color1 = this.hpGaugeColor1();
                const color2 = this.hpGaugeColor2();
                bitmap.gradientFillRect(x, y, fillWidth, height, color1, color2);
            }
            
            // 绘制HP数值
            if (showNumbers) {
                bitmap.fontSize = 14;
                bitmap.textColor = ColorManager.normalColor();
                const text = `${Math.max(0, this._enemy.hp)}/${this._enemy.mhp}`;
                bitmap.drawText(text, 0, y + height + 2, bitmap.width, 20, 'center');
            }
        }
        
        hpGaugeColor1() {
            const hpRate = this._enemy.hp / this._enemy.mhp;
            if (hpRate > 0.5) {
                return ColorManager.hpGaugeColor1();
            } else if (hpRate > 0.25) {
                return '#ffff00';
            } else {
                return '#ff0000';
            }
        }
        
        hpGaugeColor2() {
            const hpRate = this._enemy.hp / this._enemy.mhp;
            if (hpRate > 0.5) {
                return ColorManager.hpGaugeColor2();
            } else if (hpRate > 0.25) {
                return '#ff9900';
            } else {
                return '#990000';
            }
        }
        
        destroy() {
            // 停止所有动画
            this._fadeOut = false;
            this._fadeOutTimer = 0;
            
            // 清理bitmap
            if (this.bitmap) {
                this.bitmap.destroy();
                this.bitmap = null;
            }
            
            // 清理引用
            this._enemy = null;
            this._battlerSprite = null;
            
            super.destroy();
        }
    }
    
    // 扩展敌人精灵
    const _Sprite_Enemy_initMembers = Sprite_Enemy.prototype.initMembers;
    Sprite_Enemy.prototype.initMembers = function() {
        _Sprite_Enemy_initMembers.call(this);
        this._hpGaugeSprite = null;
    };
    
    const _Sprite_Enemy_setBattler = Sprite_Enemy.prototype.setBattler;
    Sprite_Enemy.prototype.setBattler = function(battler) {
        // 如果更换了敌人，清理旧的血条
        if (this._enemy && this._enemy !== battler) {
            console.log('[EnemyHPBar] 清理旧血条:', this._enemy.name());
            window.$enemyHPBarManager.removeHPBar(this._enemy);
        }
        
        _Sprite_Enemy_setBattler.call(this, battler);
        
        // 延迟创建血条，确保精灵已经正确初始化
        if (battler) {
            setTimeout(() => {
                this.createHPGauge();
            }, 100);
        }
    };
    
    Sprite_Enemy.prototype.createHPGauge = function() {
        if (!this._enemy) {
            console.warn('[EnemyHPBar] 无法创建血条：敌人不存在');
            return;
        }
        
        // 查找合适的父容器
        let parentContainer = this.parent;
        if (!parentContainer) {
            // 尝试从场景中找到敌人容器
            const scene = SceneManager._scene;
            if (scene && scene._spriteset && scene._spriteset._enemySprites) {
                parentContainer = scene._spriteset._enemySprites.find(sprite => sprite === this)?.parent;
            }
            
            if (!parentContainer && scene && scene._spriteset) {
                parentContainer = scene._spriteset;
            }
        }
        
        if (!parentContainer) {
            console.warn('[EnemyHPBar] 无法创建血条：找不到父容器', this._enemy.name());
            return;
        }
        
        console.log('[EnemyHPBar] 为敌人创建血条:', this._enemy.name());
        this._hpGaugeSprite = window.$enemyHPBarManager.createHPBar(this._enemy, parentContainer);
        this._hpGaugeSprite.setBattlerSprite(this);
    };
    
    const _Sprite_Enemy_update = Sprite_Enemy.prototype.update;
    Sprite_Enemy.prototype.update = function() {
        _Sprite_Enemy_update.call(this);
        this.updateHPGauge();
    };
    
    Sprite_Enemy.prototype.updateHPGauge = function() {
        if (this._hpGaugeSprite) {
            this._hpGaugeSprite.setBattlerSprite(this);
        }
    };
    
    // 战斗场景管理
    const _Scene_Battle_createEnemies = Scene_Battle.prototype.createEnemies;
    Scene_Battle.prototype.createEnemies = function() {
        _Scene_Battle_createEnemies.call(this);
        
        // 延迟初始化血条，确保所有敌人精灵都已创建
        setTimeout(() => {
            this.initializeEnemyHPBars();
        }, 200);
    };
    
    Scene_Battle.prototype.initializeEnemyHPBars = function() {
        console.log('[EnemyHPBar] 初始化敌人血条...');
        
        if (this._spriteset && this._spriteset._enemySprites) {
            this._spriteset._enemySprites.forEach(sprite => {
                if (sprite._enemy && !sprite._hpGaugeSprite) {
                    sprite.createHPGauge();
                }
            });
        }
    };
    
    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        // 清理所有血条
        console.log('[EnemyHPBar] 战斗结束，清理所有血条');
        window.$enemyHPBarManager.clearAll();
        _Scene_Battle_terminate.call(this);
    };
    
    // 定期清理死亡敌人的血条
    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);
        if (window.$enemyHPBarManager) {
            window.$enemyHPBarManager.update();
        }
    };
    
    // 敌人被击败时的处理
    const _Game_Enemy_die = Game_Enemy.prototype.die;
    Game_Enemy.prototype.die = function() {
        _Game_Enemy_die.call(this);
        
        // 触发血条淡出
        const hpBar = window.$enemyHPBarManager.hpBars.get(this);
        if (hpBar) {
            hpBar.startFadeOut();
        }
    };
    
})();
/*:
 * @target MZ
 * @plugindesc [v1.3 Lite] 普通攻击→打带<NormalOne>的Boss：结算与所有显示均=1；不依赖全局 SpellSystem
 * @author 接桀桀
 */
(() => {
  const TAG = /<(NormalOne|NormalAttackOne)>/i;

  function targetHasTag(target) {
    if (!target) return false;
    if (target.isEnemy && target.isEnemy()) {
      const noteEnemy = (target.enemy() && target.enemy().note) || "";
      if (TAG.test(noteEnemy)) return true;
    }
    if (target.states && target.states()) {
      if (target.states().some(st => st && TAG.test(st.note || ""))) return true;
    }
    return false;
  }

  function markAndReturnOne(spell, target, damage) {
    // 命中条件：普通攻击 + 目标带标签 + 原本会造成正伤害
    if (spell && spell.id === 'normal_attack' && targetHasTag(target) && damage > 0) {
      // —— 标记一下：下一次对该目标的 HP 变动要“强制只掉 1” ——
      try { target._normalOnePending = true; } catch(_) {}

      // —— 同步默认弹框读数（大多数 UI 走 result().hpDamage）——
      try {
        const r = target.result && target.result();
        if (r) { r.hpDamage = 1; r.hpAffected = true; /* r.critical = false; 可选 */ }
      } catch(_) {}

      // 兜底给一个旗标，供特殊弹框修正
      target._normalOnePopupFix = true;
      return 1;
    }
    return damage;
  }

  /* Hook A：大多数情况经过这里 */
  if (Scene_Battle.prototype.processSpellAction) {
    const _proc = Scene_Battle.prototype.processSpellAction;
    Scene_Battle.prototype.processSpellAction = function(caster, target, spell, damage) {
      damage = markAndReturnOne(spell, target, damage);
      return _proc.call(this, caster, target, spell, damage);
    };
  }

  /* Hook B：如果拿得到 SpellSystem，再兜底一次 */
  function tryPatchSpellSystem() {
    if (typeof SpellSystem !== 'undefined' && SpellSystem && SpellSystem.prototype && !SpellSystem._normalOnePatched) {
      const _exec = SpellSystem.prototype.executeSpellEffects;
      SpellSystem.prototype.executeSpellEffects = function(spell, damage, caster, target) {
        damage = markAndReturnOne(spell, target, damage);
        return _exec.call(this, spell, damage, caster, target);
      };
      SpellSystem._normalOnePatched = true;
    }
  }
  tryPatchSpellSystem();
  if (Scene_Boot && Scene_Boot.prototype.start) {
    const _start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { tryPatchSpellSystem(); _start.call(this); };
  }

  /* Hook C（关键兜底）：真正改血的瞬间再钳一次，保证“实际 HP 只掉 1” */
  const _gainHp = Game_Battler.prototype.gainHp;
  Game_Battler.prototype.gainHp = function(value) {
    // 只有当我们刚刚把目标标记为“本次普通攻击需钳 1”时才生效
    if (this._normalOnePending && value < 0) {
      value = -1;                      // 实际扣血
      const r = this.result && this.result();
      if (r) { r.hpDamage = 1; r.hpAffected = true; }  // 再同步一次显示
      this._normalOnePending = false;  // 用一次就清除标记，避免影响后续
    }
    _gainHp.call(this, value);
  };

  /* 兜底：一些自绘弹字直接在 Sprite 层改值，这里再修一次 */
  if (Sprite_Battler && Sprite_Battler.prototype && Sprite_Battler.prototype.startDamagePopup) {
    const _startPopup = Sprite_Battler.prototype.startDamagePopup;
    Sprite_Battler.prototype.startDamagePopup = function() {
      const b = this._battler;
      if (b && b._normalOnePopupFix && b.result && b.result()) {
        const r = b.result();
        if (r.hpDamage > 1) r.hpDamage = 1;
        b._normalOnePopupFix = false;
      }
      _startPopup.call(this);
    };
  }
})();

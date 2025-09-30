/*:
 * @target MZ
 * @plugindesc [v2.1] “普通攻击”打带<NormalOne>的Boss：只本次伤害=1（结算/弹字/消息/结果窗全一致）。标记绑定在本次 result 上，绝不污染后续技能。
 * @author 接桀桀
 */
(() => {
  const TAG = /<(NormalOne|NormalAttackOne)>/i;
  const NORMAL_ID = 'normal_attack';          // 你的“普通攻击”咒语ID；如改过请同步
  const KEY = '_normalOneThisHit';            // 一次性标记，绑在当前 result 对象上

  function targetHasTag(target) {
    if (!target) return false;
    if (target.isEnemy && target.isEnemy()) {
      const note = (target.enemy() && target.enemy().note) || "";
      if (TAG.test(note)) return true;
    }
    if (target.states && target.states()) {
      if (target.states().some(st => st && TAG.test(st.note || ""))) return true;
    }
    return false;
  }
  const isNormalOnTagged = (spell, target) =>
    spell && spell.id === NORMAL_ID && targetHasTag(target);

  /** 给“本次伤害”的 result 打一次性标记，并把显示用伤害统一为 1 */
  function markThisHit(result, target) {
    if (!result || !target) return;
    result[KEY] = true;                 // 只在这一次生效
    result.hpDamage = 1;                // 默认弹字/窗口读这个
    result.hpAffected = true;
    // 可选：result.critical = false;
    // 给少数自绘弹字做兜底
    target._normalOnePopupFix = true;
  }

  /** 如果命中规则，则把 damage 改成 1，并“给本次 result 打标记” */
  function clampDamageIfNeed(spell, caster, target, damage) {
    if (isNormalOnTagged(spell, target) && damage > 0) {
      try {
        const r = target.result && target.result();
        if (r) markThisHit(r, target);
      } catch (_) {}
      return 1;
    }
    return damage;
  }

  /* A. 入口（多数情况经过这里） */
  if (Scene_Battle.prototype.processSpellAction) {
    const _proc = Scene_Battle.prototype.processSpellAction;
    Scene_Battle.prototype.processSpellAction = function(caster, target, spell, damage) {
      damage = clampDamageIfNeed(spell, caster, target, damage);
      return _proc.call(this, caster, target, spell, damage);
    };
  }

  /* B. 兜底：如果能拿到 SpellSystem，再把另一路入口也钳一下 */
  function tryPatchSpellSystem() {
    if (typeof SpellSystem !== 'undefined' && SpellSystem && SpellSystem.prototype && !SpellSystem._normalOnePatched_v21) {
      const _exec = SpellSystem.prototype.executeSpellEffects;
      if (_exec) {
        SpellSystem.prototype.executeSpellEffects = function(spell, damage, caster, target) {
          damage = clampDamageIfNeed(spell, caster, target, damage);
          return _exec.call(this, spell, damage, caster, target);
        };
      }
      // 修正系统消息：优先用“本次 result 标记”，否则再按规则判断
      const _msg = SpellSystem.prototype.showCastMessage;
      if (_msg) {
        SpellSystem.prototype.showCastMessage = function(spell, damage, accuracy, volumeScore) {
          const t = this.currentTarget;
          const r = t && t.result && t.result();
          if ((r && r[KEY]) || (isNormalOnTagged(spell, t) && damage > 0)) damage = 1;
          return _msg.call(this, spell, damage, accuracy, volumeScore);
        };
      }
      // 修正结果窗入参：同理按“本次标记”优先
      const _res = SpellSystem.prototype.showCastingResult;
      if (_res) {
        SpellSystem.prototype.showCastingResult = function(spell, damage, accuracy, volumeScore) {
          const t = this.currentTarget;
          const r = t && t.result && t.result();
          if ((r && r[KEY]) || (isNormalOnTagged(spell, t) && damage > 0)) damage = 1;
          return _res.call(this, spell, damage, accuracy, volumeScore);
        };
      }
      SpellSystem._normalOnePatched_v21 = true;
    }
  }

  /* C. 真正扣血时，只在“本次 result 被标记”的情况下把扣血量钳为 1；用后即清 */
  const _gainHp = Game_Battler.prototype.gainHp;
  Game_Battler.prototype.gainHp = function(value) {
    const r = this.result && this.result();
    if (r && r[KEY] && value < 0) {
      value = -1;         // 实际扣血
      r.hpDamage = 1;     // 再同步一次（保险）
      r[KEY] = false;     // —— 用完立刻清除本次标记！防止影响后续技能 ——
    }
    _gainHp.call(this, value);
  };

  /* D. 某些自绘弹字直接读 result 以外的变量，这里做兜底修正一次 */
  if (Sprite_Battler && Sprite_Battler.prototype && Sprite_Battler.prototype.startDamagePopup) {
    const _start = Sprite_Battler.prototype.startDamagePopup;
    Sprite_Battler.prototype.startDamagePopup = function() {
      const b = this._battler;
      const r = b && b.result && b.result();
      if (b && b._normalOnePopupFix) {
        if (r && r.hpDamage > 1) r.hpDamage = 1;
        b._normalOnePopupFix = false;
      }
      _start.call(this);
    };
  }

  /* E. 结果窗：把传入的 result.damage 也统一（只改“本次被标记”的情况） */
  function tryPatchWindowSpellResult() {
    if (window.Window_SpellResult && Window_SpellResult.prototype && Window_SpellResult.prototype.setResult && !Window_SpellResult._normalOnePatched_v21) {
      const _set = Window_SpellResult.prototype.setResult;
      Window_SpellResult.prototype.setResult = function(result) {
        try {
          if (result && result.target && result.target.result && result.target.result()[KEY] && result.damage > 0) {
            result = Object.assign({}, result, { damage: 1 });
          }
        } catch(_) {}
        _set.call(this, result);
      };
      Window_SpellResult._normalOnePatched_v21 = true;
    }
  }

  // 启动与进入战斗时都尝试打补丁，确保命中
  const _bootStart = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    tryPatchSpellSystem();
    tryPatchWindowSpellResult();
    _bootStart.call(this);
  };
  const _sbCreate = Scene_Battle.prototype.create;
  Scene_Battle.prototype.create = function() {
    _sbCreate.call(this);
    tryPatchSpellSystem();
    tryPatchWindowSpellResult();
  };
})();

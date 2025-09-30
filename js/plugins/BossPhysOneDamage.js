/*:
 * @target MZ
 * @plugindesc [v1.0] Boss机制：被物理攻击命中时最终伤害恒为1（可用备注开关）
 * @author You+Chat
 *
 * @help
 * 在“敌人 Enemy”或“状态 State”的备注里添加任意其一：
 *   <PhysOne>
 *   <PhysicalOne: true>
 *
 * 作用：当该备注对目标生效时，所有【物理】命中后的最终伤害被强制=1。
 * 说明：
 * - 只影响物理攻撃（Hit Type = Physical）。魔法/必中不受影响。
 * - 生效点在原版伤害全部计算完之后（含暴击、元素、守护减伤、浮动等），确保最终显示就是 1。
 * - Miss/回避仍按原有判定；未命中不会播放 1。
 * - 可以把标签写在状态上，做阶段开关（例如护甲未破＝1点，破甲状态解除＝恢复正常）。
 *
 * 版权：自由商用、可改可二创。
 */

(() => {
  const TAG_REGEX = /<(PhysOne|PhysicalOne)(?::\s*true\s*)?>/i;

  function hasPhysOneTagFromStates(target) {
    return target.states().some(st => st && TAG_REGEX.test(st.note || ""));
  }

  function targetHasPhysOne(target) {
    if (!target) return false;
    // 来自敌人备注
    if (target.isEnemy() && TAG_REGEX.test(target.enemy().note || "")) return true;
    // 来自身上状态备注
    return hasPhysOneTagFromStates(target);
  }

  const _makeDamageValue = Game_Action.prototype.makeDamageValue;
  Game_Action.prototype.makeDamageValue = function(target, critical) {
    // 先按原版把所有计算跑完
    let value = _makeDamageValue.call(this, target, critical);

    // 命中后且为物理，且目标带有<PhysOne>标签，则强制=1
    if (this.isPhysical() && value > 0 && targetHasPhysOne(target)) {
      value = 1;
    }
    return value;
  };
})();

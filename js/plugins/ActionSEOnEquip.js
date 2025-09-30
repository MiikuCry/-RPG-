/*:
 * @target MZ
 * @plugindesc [v1.0] 装备后：我方角色每次行动结束自动播放SE（普攻/技能皆可）
 * @author 接桀桀
 *
 * @param DefaultSEName
 * @text 默认音效名
 * @type file
 * @dir audio/se/
 * @default Bell1
 *
 * @param DefaultVolume
 * @text 默认音量
 * @type number
 * @min 0
 * @max 100
 * @default 90
 *
 * @param DefaultPitch
 * @text 默认音调
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 * @param DefaultPan
 * @text 默认声像
 * @type number
 * @min -100
 * @max 100
 * @default 0
 *
 * @help
 * 在“装备”的备注里写：
 *   <ActionSE>
 * 或
 *   <ActionSE: 名称, 音量, 音调, 声像>
 *
 * 示例：
 *   <ActionSE>
 *   <ActionSE: Dang, 90, 100, 0>
 *
 * 触发时机：该装备在身的“我方角色”每次行动结束（普攻/技能）
 * 不需要额外插件，兼容原版战斗流程。
 *
 * 制作提示：
 * - 请把对应的SE放到 audio/se/ 下（如 Dang.ogg / Dang.m4a）。
 * - 如果备注里没写数值，则使用插件参数的默认值。
 *
 * 版权：可随意商用/改写，署名可选。
 */

(() => {
  const PLUGIN_NAME = "ActionSEOnEquip";
  const parameters = PluginManager.parameters(PLUGIN_NAME);

  const DEF_NAME   = String(parameters["DefaultSEName"] || "Bell1");
  const DEF_VOLUME = Number(parameters["DefaultVolume"] || 90);
  const DEF_PITCH  = Number(parameters["DefaultPitch"] || 100);
  const DEF_PAN    = Number(parameters["DefaultPan"] || 0);

  function parseActionSeNote(note) {
    // 匹配 <ActionSE> 或 <ActionSE: name, vol, pitch, pan>
    const tag = /<ActionSE(?::\s*([^>]+))?>/i.exec(note || "");
    if (!tag) return null;

    if (!tag[1]) {
      // 只写了 <ActionSE>
      return { name: DEF_NAME, volume: DEF_VOLUME, pitch: DEF_PITCH, pan: DEF_PAN };
    }

    const parts = tag[1].split(",").map(s => s.trim());
    const name   = parts[0] && parts[0].length ? parts[0] : DEF_NAME;
    const volume = parts[1] !== undefined ? Number(parts[1]) || DEF_VOLUME : DEF_VOLUME;
    const pitch  = parts[2] !== undefined ? Number(parts[2]) || DEF_PITCH  : DEF_PITCH;
    const pan    = parts[3] !== undefined ? Number(parts[3]) || DEF_PAN    : DEF_PAN;

    return { name, volume, pitch, pan };
  }

  function actorHasActionSeEquip(actor) {
    if (!actor || !actor.isActor()) return null;
    const equips = actor.equips();
    for (const eq of equips) {
      if (eq && eq.note) {
        const se = parseActionSeNote(eq.note);
        if (se) return se;
      }
    }
    return null;
  }

  // 别名 BattleManager.endAction，在行动结束点触发
  const _BM_endAction = BattleManager.endAction;
  BattleManager.endAction = function() {
    try {
      const subject = this._subject;
      const se = actorHasActionSeEquip(subject);
      if (se) {
        AudioManager.playSe({
          name: se.name,
          volume: se.volume,
          pitch: se.pitch,
          pan: se.pan
        });
      }
    } catch (e) {
      console.error(PLUGIN_NAME, e);
    }
    _BM_endAction.call(this);
  };
})();

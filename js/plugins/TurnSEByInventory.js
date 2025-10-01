/*:
 * @target MZ
 * @plugindesc [v1.0] 背包里有某道具时，每个战斗回合自动播放SE（可设间隔/可选叠加）
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
 * 在“道具 Item”备注中写：
 *   <TurnSE>
 * 或
 *   <TurnSE: 名称, 音量, 音调, 声像, 间隔回合>
 * 可选：叠加播放（按数量）：<TurnSEStack: true>
 *
 * 说明：
 * - 只在战斗中生效。每当进入新回合（全队行动条重置时）检查背包。
 * - 默认不按数量叠加：背包里有N个也只播放1次；若想叠加，写 <TurnSEStack:true>。
 * - “间隔回合”默认=1（每回合）。如果设为2，则第2、4、6…回合播放。
 * - 多个带标签的道具会各自播放（注意别太嘈杂）。
 * - 自由商用，可改。
 */

(() => {
  const PLUGIN_NAME = "TurnSEByInventory";
  const params = PluginManager.parameters(PLUGIN_NAME);
  const DEF_NAME   = String(params["DefaultSEName"] || "Bell1");
  const DEF_VOL    = Number(params["DefaultVolume"] || 90);
  const DEF_PITCH  = Number(params["DefaultPitch"] || 100);
  const DEF_PAN    = Number(params["DefaultPan"] || 0);

  // 解析备注：<TurnSE> 或 <TurnSE: name, vol, pitch, pan, interval>
  function parseTurnSeNote(note) {
    const m = /<TurnSE(?::\s*([^>]+))?>/i.exec(note || "");
    if (!m) return null;

    if (!m[1]) {
      return { name: DEF_NAME, volume: DEF_VOL, pitch: DEF_PITCH, pan: DEF_PAN, interval: 1 };
    }
    const parts = m[1].split(",").map(s => s.trim());
    const name = parts[0] && parts[0].length ? parts[0] : DEF_NAME;
    const volume = parts[1] !== undefined ? Number(parts[1]) || DEF_VOL : DEF_VOL;
    const pitch  = parts[2] !== undefined ? Number(parts[2]) || DEF_PITCH : DEF_PITCH;
    const pan    = parts[3] !== undefined ? Number(parts[3]) || DEF_PAN : DEF_PAN;
    const interval = Math.max(1, parts[4] !== undefined ? Number(parts[4]) || 1 : 1);
    return { name, volume, pitch, pan, interval };
  }

  function hasStackNote(note) {
    return /<TurnSEStack:\s*true\s*>/i.test(note || "");
  }

  // 缓存：当前战斗有哪些“背包触发”的道具配置（每回合检查数量）
  let _turnSeItems = null;

  const _BM_startBattle = BattleManager.startBattle;
  BattleManager.startBattle = function() {
    // 建立缓存：所有带 <TurnSE> 的 Item
    try {
      _turnSeItems = $dataItems
        .filter(it => it && it.note && /<TurnSE/i.test(it.note))
        .map(it => ({
          item: it,
          cfg: parseTurnSeNote(it.note),
          stack: hasStackNote(it.note)
        }));
      if (_turnSeItems && _turnSeItems.length) {
        console.log(`[${PLUGIN_NAME}] 发现带 <TurnSE> 的道具:`, _turnSeItems.map(e => ({ id: e.item.id, name: e.item.name, cfg: e.cfg, stack: e.stack })));
      } else {
        console.log(`[${PLUGIN_NAME}] 本场战斗未发现任何带 <TurnSE> 的道具。`);
      }
    } catch (e) {
      console.error(PLUGIN_NAME, e);
      _turnSeItems = [];
    }
    _BM_startBattle.call(this);
  };

  const _BM_endBattle = BattleManager.endBattle;
  BattleManager.endBattle = function(result) {
    _turnSeItems = null;
    _BM_endBattle.call(this, result);
  };

  // 在每回合开始播放
  const _BM_startTurn = BattleManager.startTurn;
  BattleManager.startTurn = function() {
    _BM_startTurn.call(this);
    try {
      if (!_turnSeItems || _turnSeItems.length === 0) return;
      const turn = this._turnCount || 1;
      _turnSeItems.forEach(entry => {
        const { item, cfg, stack } = entry;
        if (!cfg) return;
        if (turn % cfg.interval !== 0) return;

        const count = $gameParty.numItems(item);
        if (count <= 0) return;

        const times = stack ? count : 1;
        console.log(`[${PLUGIN_NAME}] 第${turn}回合触发: 道具#${item.id}(${item.name}) 数量=${count} 次数=${times} SE=${cfg.name}@${cfg.volume}/${cfg.pitch}/${cfg.pan}`);
        for (let i = 0; i < times; i++) {
          AudioManager.playSe({
            name: cfg.name, volume: cfg.volume, pitch: cfg.pitch, pan: cfg.pan
          });
        }
      });
    } catch (e) {
      console.error(PLUGIN_NAME, e);
    }
  };
})();

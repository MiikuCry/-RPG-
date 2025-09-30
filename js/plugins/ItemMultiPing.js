/*:
 * @target MZ
 * @plugindesc 物品备注：回合末多次打击，90%敌方 / 10%我方随机（<MultiPing:H,D>）
 * @author you+chat
 *
 * @param delayFrames
 * @text 两击间隔（帧）
 * @type number
 * @min 0
 * @default 2
 *
 * @param allyHitPercent
 * @text 我方命中概率（%）
 * @type number
 * @min 0
 * @max 100
 * @desc 每一击落在我方（含主角）的概率；其余落在敌方。默认10。
 * @default 10
 *
 * @help
 * 在【道具】备注写：<MultiPing:H,D>
 *   H = 每回合末命中次数，如 18
 *   D = 每次伤害，如 1
 * 例：<MultiPing:18,1>
 *
 * 说明：
 * - 触发条件：战斗中，队伍物品栏中“拥有”该道具。
 * - 道具数量会叠加触发轮数（两件=打两轮）。
 * - 命中目标：默认 10% 打我方（含主角、同伴），90% 打敌方；某一侧无人时自动打另一侧。
 */

(() => {
  const PN = "ItemMultiPingBias";
  const P = PluginManager.parameters(PN);
  const DELAY_FRAMES = Number(P.delayFrames || 2);
  const ALLY_RATE = Math.max(0, Math.min(100, Number(P.allyHitPercent || 10))) / 100;
  const FRAME_MS = 1000 / 60;

  function parseTag(note) {
    const m = /<\s*MultiPing\s*:\s*(\d+)\s*,\s*(\d+)\s*>/i.exec(note || "");
    return m ? { hits: Number(m[1]), dmg: Number(m[2]) } : null;
  }

  function partyPings() {
    const out = [];
    for (const it of $gameParty.items()) {
      const tag = parseTag(it.note);
      if (tag && tag.hits > 0 && tag.dmg !== 0) {
        const n = $gameParty.numItems(it);
        for (let i = 0; i < n; i++) out.push(tag);
      }
    }
    return out;
  }

  function randomTargetBiased() {
    const allies = $gameParty.aliveMembers();
    const foes = $gameTroop.aliveMembers();
    if (allies.length === 0 && foes.length === 0) return null;

    const wantAlly = Math.random() < ALLY_RATE;
    if (wantAlly && allies.length > 0) {
      return allies[(Math.random() * allies.length) | 0];
    }
    if (!wantAlly && foes.length > 0) {
      return foes[(Math.random() * foes.length) | 0];
    }
    // 某侧没活人，回退到另一侧
    const pool = allies.length > 0 ? allies : foes;
    return pool[(Math.random() * pool.length) | 0];
  }

  function runRound(hits, dmg) {
    const scene = SceneManager._scene;
    if (!(scene instanceof Scene_Battle)) return;
    const delayMs = Math.max(0, DELAY_FRAMES) * FRAME_MS;

    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        const t = randomTargetBiased();
        if (!t) return;
        t.gainHp(-dmg);
        t.startDamagePopup();
        t.performDamage();
        if (t.isDead()) t.performCollapse();

        scene._statusWindow?.refresh();
        scene._enemyWindow?.refresh?.();
      }, i * delayMs);
    }
  }

  const _endTurn = BattleManager.endTurn;
  BattleManager.endTurn = function() {
    _endTurn.call(this);
    if (!$gameParty.inBattle()) return;
    if ($gameTroop.aliveMembers().length === 0 && $gameParty.aliveMembers().length === 0) return;

    for (const p of partyPings()) runRound(p.hits, p.dmg);
  };
})();

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

    // 统计攻击目标
    const attackStats = new Map(); // target -> count
    const allyStats = new Map();   // ally -> count
    const enemyStats = new Map();  // enemy -> count

    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        const t = randomTargetBiased();
        if (!t) return;
        
        // 记录攻击统计
        attackStats.set(t, (attackStats.get(t) || 0) + 1);
        
        if (t.isActor()) {
          allyStats.set(t, (allyStats.get(t) || 0) + 1);
        } else {
          enemyStats.set(t, (enemyStats.get(t) || 0) + 1);
        }
        
        t.gainHp(-dmg);
        t.startDamagePopup();
        t.performDamage();
        if (t.isDead()) t.performCollapse();

        scene._statusWindow?.refresh();
        scene._enemyWindow?.refresh?.();
        
        // 在最后一击后显示统计信息
        if (i === hits - 1) {
          setTimeout(() => {
            showAttackSummary(attackStats, allyStats, enemyStats, dmg);
          }, delayMs + 100);
        }
      }, i * delayMs);
    }
  }

  function showAttackSummary(attackStats, allyStats, enemyStats, dmg) {
    const messages = [];
    
    // 统计我方攻击
    if (allyStats.size > 0) {
      const allyNames = [];
      for (const [ally, count] of allyStats) {
        if (count > 0) {
          allyNames.push(`${ally.name()}(${count}次)`);
        }
      }
      if (allyNames.length > 0) {
        messages.push(`\\C[7]【警告】【昔日游侠】赫拉芬分别对${allyNames.join('、')}造成了攻击！\\C[0]`);
        messages.push(`\\C[7]对自己造成了${Array.from(allyStats.values()).reduce((a, b) => a + b, 0)}次攻击！\\C[0]`);
      }
    }
    
    // 统计敌方攻击
    if (enemyStats.size > 0) {
      const enemyNames = [];
      for (const [enemy, count] of enemyStats) {
        if (count > 0) {
          enemyNames.push(`${enemy.name()}(${count}次)`);
        }
      }
      if (enemyNames.length > 0) {
        messages.push(`\\C[2]【昔日游侠】赫拉芬分别对${enemyNames.join('、')}造成了攻击！\\C[0]`);
      }
    }
    
    // 显示消息
    if (messages.length > 0) {
      const scene = SceneManager._scene;
      if (scene && scene._logWindow) {
        messages.forEach(msg => {
          scene._logWindow.push("addText", msg);
        });
      }
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

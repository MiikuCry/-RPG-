/*:
 * @target MZ
 * @plugindesc 持有特定道具时，每回合消耗1000金币并触发慕斯药剂效果
 * @author 接桀桀
 *
 * @param ItemID
 * @type item
 * @text 触发道具ID
 * @desc 玩家必须持有此道具才会触发效果
 * @default 1
 */

(() => {
    const parameters = PluginManager.parameters("MousseItemEffect");
    const triggerItemId = Number(parameters["ItemID"] || 1);

    const _BattleManager_endTurn = BattleManager.endTurn;
    BattleManager.endTurn = function() {
        _BattleManager_endTurn.call(this);

        const actor = $gameParty.leader();
        if (!actor) return;

        // 检查玩家是否持有指定道具
        if ($gameParty.numItems($dataItems[triggerItemId]) > 0) {
            // 检查金币
            if ($gameParty.gold() >= 1000) {
                $gameParty.loseGold(1000);

                const roll = Math.random(); // 0~1 随机
                if (roll < 0.5) {
                    // 50% 回复HP
                    actor.gainHp(30);
                    $gameMessage.add("慕斯向你扔来了恢复药剂！");
                } else if (roll < 0.9) {
                    // 40% 回复MP
                    actor.gainMp(20);
                    $gameMessage.add("慕斯向你扔来了魔力药剂！");
                } else {
                    // 10% 添加状态36
                    actor.addState(36);
                    $gameMessage.add("慕斯错误把剧毒药剂扔来了！");
                }
            }
        }
    };
})();

/**
 * Window_SpellCasting.js - 咒语咏唱界面（修复版）
 * 
 * 功能说明：
 * 1. 显示咏唱进度和实时反馈
 * 2. 显示可用咒语列表
 * 3. 实时匹配度显示
 * 4. 音量条显示
 * 5. 操作提示显示
 * 
 * @author 不想做工-接桀桀
 * @version 1.2.0
 */

// 防止重复定义
if (!window.Window_SpellCasting) {

// 咏唱窗口
class Window_SpellCasting extends Window_Base {
    constructor() {
        const width = 720;
        const height = 480;
        const x = (Graphics.width - width) / 2;
        const y = 40;
        
        super(new Rectangle(x, y, width, height));
        
        this._actor = null;
        this._spellList = [];
        this._castingText = '';
        this._matches = [];
        this._volume = 0;
        this._animationCount = 0;
        
        // 设置窗口背景透明度
        this.setBackgroundType(1); // 1=暗色背景
        this.createContents();
        this.hide();
    }
    
    setActor(actor) {
        this._actor = actor;
        this.refresh();
    }
    
    setSpellList(spells) {
        this._spellList = spells;
        this.refresh();
    }
    
    updateCastingText(text) {
        this._castingText = text;
        this.refresh();
    }
    
    updateMatches(matches) {
        this._matches = matches;
        this.refresh();
    }
    
    updateVolume(volume) {
        this._volume = volume;
        this.drawVolumeBar();
    }
    
    refresh() {
        this.contents.clear();
        
        // 标题区域
        this.drawTitle();
        
        // 左侧：角色信息和咏唱区
        this.drawLeftSection();
        
        // 右侧：可用咒语列表
        this.drawRightSection();
        
        // 底部：操作提示
        this.drawFooter();
    }
    
    drawTitle() {
        // 标题背景
        const titleHeight = 48;
        this.contents.fillRect(0, 0, this.innerWidth, titleHeight, 'rgba(0,0,0,0.6)');
        
        // 标题文字
        this.contents.fontSize = 28;
        this.changeTextColor(ColorManager.systemColor());
        const titleText = '🔮 咒语咏唱中...';
        this.drawText(titleText, 0, 8, this.innerWidth, 'center');
        
        this.contents.fontSize = 24;
    }
    
    drawLeftSection() {
        const leftWidth = 420;
        const startY = 60;
        
        // 角色信息
        if (this._actor) {
            this.drawActorInfo(20, startY);
        }
        
        // 咏唱框
        this.drawCastingArea(20, startY + 80);
        
        // 音量条
        this.drawVolumeBar();
        
        // 匹配结果
        this.drawMatches(20, startY + 240);
    }
    
    drawRightSection() {
        const rightX = 440;
        const rightWidth = 260;
        const startY = 60;
        
        // 背景
        this.contents.fillRect(rightX - 10, startY - 10, rightWidth + 20, 360, 'rgba(0,0,0,0.4)');
        
        // 标题
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 20;
        this.drawText('📖 可用咒语', rightX, startY, rightWidth, 'center');
        
        // 咒语列表
        this.drawSpellList(rightX, startY + 30);
    }
    
    drawFooter() {
        const footerY = this.innerHeight - 50;
        
        // 背景
        this.contents.fillRect(0, footerY - 5, this.innerWidth, 50, 'rgba(0,0,0,0.6)');
        
        // 操作提示
        this.changeTextColor(ColorManager.normalColor());
        this.contents.fontSize = 16;
        
        // 第一行提示
        const tips1 = '大声念出咒语进行施法';
        this.drawText(tips1, 0, footerY, this.innerWidth, 'center');
        
        // 第二行提示（突出显示）
        this.contents.fontSize = 20;
        this.changeTextColor(ColorManager.powerUpColor());
        const tips2 = '按 ESC 退出咏唱 | 按 两次空格 重新录制';
        this.drawText(tips2, 0, footerY + 22, this.innerWidth, 'center');
        
        // 第三行提示（更明显的说明）
        this.contents.fontSize = 16;
        this.changeTextColor(ColorManager.textColor());
        const tips3 = '※ 如果识别错误，请按两次空格键清除后重新录制';
        this.drawText(tips3, 0, footerY + 45, this.innerWidth, 'center');
    }
    
    drawActorInfo(x, y) {
        // 角色名称
        this.changeTextColor(ColorManager.hpColor(this._actor));
        this.contents.fontSize = 22;
        this.drawText(this._actor.name(), x, y, 200);
        
        // MP条
        const mpY = y + 30;
        this.drawActorMp(x, mpY, 200);
        
        this.contents.fontSize = 24;
    }
    
    drawActorMp(x, y, width) {
        const mpRate = this._actor.mp / this._actor.mmp;
        const height = 12;
        
        // 背景
        this.contents.fillRect(x - 1, y - 1, width + 2, height + 2, '#000000');
        this.contents.fillRect(x, y, width, height, ColorManager.gaugeBackColor());
        
        // MP条
        if (mpRate > 0) {
            const fillWidth = Math.floor(width * mpRate);
            const gradient = this.contents.context.createLinearGradient(x, y, x + fillWidth, y);
            gradient.addColorStop(0, ColorManager.mpGaugeColor1());
            gradient.addColorStop(1, ColorManager.mpGaugeColor2());
            this.contents.context.fillStyle = gradient;
            this.contents.context.fillRect(x, y, fillWidth, height);
        }
        
        // 数值
        this.changeTextColor(ColorManager.mpColor(this._actor));
        this.contents.fontSize = 18;
        this.drawText(`MP: ${this._actor.mp}/${this._actor.mmp}`, x + width + 10, y - 4, 120);
    }
    
    drawCastingArea(x, y) {
        const width = 400;
        const height = 80;
        
        // 标签
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 18;
        this.drawText('咏唱内容:', x, y - 25, 100);
        
        // 咏唱框
        this.contents.fillRect(x - 2, y - 2, width + 4, height + 4, '#ffffff');
        this.contents.fillRect(x, y, width, height, '#1a1a1a');
        
        // 咏唱文本
        if (this._castingText) {
            this.contents.fontSize = 32;
            const alpha = Math.sin(this._animationCount * 0.1) * 0.3 + 0.7;
            this.contents.paintOpacity = alpha * 255;
            this.changeTextColor(ColorManager.powerUpColor());
            this.drawText(this._castingText, x + 10, y + 22, width - 20, 'center');
            this.contents.paintOpacity = 255;
        } else {
            this.changeTextColor(ColorManager.dimColor1());
            this.contents.fontSize = 20;
            this.drawText('请大声念出咒语...', x + 10, y + 28, width - 20, 'center');
        }
        
        this.contents.fontSize = 24;
    }
    
    drawVolumeBar() {
        const x = 20;
        const y = 210;
        const width = 400;
        const height = 20;
        
        // 标签
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 18;
        this.drawText('音量:', x, y - 25, 50);
        
        // 背景
        this.contents.fillRect(x - 1, y - 1, width + 2, height + 2, '#ffffff');
        this.contents.fillRect(x, y, width, height, ColorManager.gaugeBackColor());
        
        // 音量条
        if (this._volume > 0) {
            const fillWidth = Math.floor(width * this._volume);
            
            // 根据音量选择颜色
            let color1, color2;
            if (this._volume < 0.3) {
                color1 = '#00ff00';
                color2 = '#00cc00';
            } else if (this._volume < 0.7) {
                color1 = '#ffff00';
                color2 = '#ffcc00';
            } else {
                color1 = '#ff3333';
                color2 = '#cc0000';
            }
            
            const gradient = this.contents.context.createLinearGradient(x, y, x + fillWidth, y);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            this.contents.context.fillStyle = gradient;
            this.contents.context.fillRect(x, y, fillWidth, height);
        }
        
        // 音量百分比
        this.changeTextColor(ColorManager.normalColor());
        this.contents.fontSize = 16;
        this.drawText(Math.round(this._volume * 100) + '%', x + width + 10, y, 60);
    }
    
    drawMatches(x, y) {
        // 标题
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 18;
        this.drawText('匹配度:', x, y, 100);
        
        if (this._matches.length === 0) {
            this.changeTextColor(ColorManager.dimColor1());
            this.contents.fontSize = 16;
            this.drawText('继续咏唱中...', x, y + 25, 200);
            return;
        }
        
        // 显示前3个匹配
        const maxMatches = Math.min(3, this._matches.length);
        for (let i = 0; i < maxMatches; i++) {
            const match = this._matches[i];
            const yPos = y + 30 + i * 35;
            
            this.drawMatchBar(x, yPos, match, i === 0);
        }
    }
    
    drawMatchBar(x, y, match, isTop) {
        const barWidth = 250;
        const barHeight = 24;
        
        // 背景
        this.contents.fillRect(x, y, barWidth, barHeight, ColorManager.dimColor1());
        
        // 匹配度条
        const fillWidth = Math.floor(barWidth * match.accuracy);
        
        // 颜色
        let color;
        if (match.accuracy >= 0.8) {
            color = isTop ? '#FFD700' : ColorManager.powerUpColor();
        } else if (match.accuracy >= 0.6) {
            color = '#ffff00';
        } else {
            color = ColorManager.normalColor();
        }
        
        this.contents.fillRect(x, y, fillWidth, barHeight, color);
        
        // 咒语名称
        this.changeTextColor(color);
        this.contents.fontSize = 16;
        this.drawText(match.spell.name, x + 5, y + 2, 150);
        
        // 百分比（移到条内右侧）
        const percentText = (match.accuracy * 100).toFixed(0) + '%';
        this.changeTextColor('#ffffff');
        this.drawText(percentText, x + barWidth - 45, y + 2, 40, 'right');
    }
    
    drawSpellList(x, y) {
        const maxSpells = Math.min(8, this._spellList.length);
        
        for (let i = 0; i < maxSpells; i++) {
            const spell = this._spellList[i];
            const yPos = y + i * 38;
            
            this.drawSpellItem(x, yPos, spell);
        }
    }
    
    drawSpellItem(x, y, spell) {
        // 检查MP是否足够
        const canCast = this._actor && this._actor.mp >= spell.mpCost;
        
        // 背景（如果MP不足）
        if (!canCast) {
            this.contents.fillRect(x, y, 250, 36, 'rgba(255,0,0,0.1)');
        }
        
        // 咒语名称
        this.changeTextColor(canCast ? ColorManager.normalColor() : ColorManager.dimColor1());
        this.contents.fontSize = 18;
        this.drawText(spell.name, x + 5, y, 140);
        
        // MP消耗
        this.changeTextColor(canCast ? ColorManager.mpColor(this._actor) : ColorManager.deathColor());
        this.contents.fontSize = 16;
        this.drawText(`${spell.mpCost}MP`, x + 190, y, 60, 'right');
        
        // 咒语文本
        this.contents.fontSize = 14;
        this.changeTextColor(ColorManager.textColor(8));
        this.drawText(`"${spell.incantation}"`, x + 5, y + 18, 245);
    }
    
    update() {
        super.update();
        this._animationCount++;
        
        // 更新闪烁效果
        if (this._animationCount % 5 === 0 && this._castingText) {
            this.drawCastingArea(20, 140);
        }
        
        // 更新操作提示（让空格和ESC提示更明显）
        if (this._animationCount % 30 === 0) {
            this.drawFooter();
        }
    }
    
    // 重写show方法，确保在战斗场景上层显示
    show() {
        super.show();
        this.activate();
        this.refresh();
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Window_SpellCasting;
} else {
    window.Window_SpellCasting = Window_SpellCasting;
}

} // 结束防重复定义检查
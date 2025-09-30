/**
 * Window_SpellResult.js - 咒语施法结果窗口（左右布局版）
 * 
 * @author 不想做工-接桀桀
 * @version 1.3.0
 */

// 防止重复定义
if (!window.Window_SpellResult) {

// 施法结果窗口
class Window_SpellResult extends Window_Base {
    constructor() {
        const width = 540;
        const height = 320;
        const x = (Graphics.width - width) / 2;
        const y = (Graphics.height - height) / 2 - 20;
        
        super(new Rectangle(x, y, width, height));
        
        this._result = null;
        this._animationCount = 0;
        
        // 设置窗口样式
        this.setBackgroundType(1); // 暗色背景
        this.createContents();
        this.hide();
    }
    
    setResult(result) {
        this._result = result;
        this._animationCount = 0;
        this.refresh();
    }
    
    refresh() {
        if (!this._result) return;
        
        this.contents.clear();
        
        const { spell, damage, accuracy, volume, grade, actor, target } = this._result;
        
        // 绘制背景
        this.drawBackground();
        
        // 标题区域
        this.drawHeader(spell);
        
        // 主要内容区域（左右布局）
        this.drawMainContent(grade, accuracy, volume, damage);
    }
    
    drawBackground() {
        // 简单的渐变背景
        const gradient = this.contents.context.createLinearGradient(0, 0, 0, this.innerHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        this.contents.context.fillStyle = gradient;
        this.contents.context.fillRect(0, 0, this.innerWidth, this.innerHeight);
    }
    
    drawHeader(spell) {
        // 标题背景条
        const headerHeight = 50;
        this.contents.fillRect(0, 0, this.innerWidth, headerHeight, 'rgba(255, 255, 255, 0.1)');
        
        // 咒语名称
        this.contents.fontSize = 28;
        this.changeTextColor(ColorManager.powerUpColor());
        this.drawText(spell.name, 0, 10, this.innerWidth, 'center');
        
        // 分隔线
        this.contents.fillRect(20, headerHeight - 1, this.innerWidth - 40, 1, 'rgba(255, 255, 255, 0.3)');
    }
    
    drawMainContent(grade, accuracy, volume, damage) {
        const contentY = 70;
        
        // 左侧：评级
        this.drawGradeSection(20, contentY, grade);
        
        // 右侧：数据
        this.drawDataSection(200, contentY, accuracy, volume, damage);
    }
    
    drawGradeSection(x, y, grade) {
        const gradeColors = {
            'SSS': '#FFD700',
            'SS': '#FF69B4',
            'S': '#FF4500',
            'A': '#1E90FF',
            'B': '#32CD32',
            'C': '#FFD700',
            'D': '#808080'
        };
        
        // 评级框
        const boxWidth = 160;
        const boxHeight = 160;
        
        // 背景框
        this.contents.fillRect(x, y, boxWidth, boxHeight, 'rgba(0, 0, 0, 0.5)');
        this.contents.strokeRect(x, y, boxWidth, boxHeight, gradeColors[grade] || '#FFFFFF', 2);
        
        // 评级文字（垂直居中）
        this.contents.fontSize = 72;
        this.contents.textColor = gradeColors[grade] || '#FFFFFF';
        const gradeY = y + (boxHeight - 72) / 2 - 10; // 调整垂直位置
        this.drawText(grade, x, gradeY, boxWidth, 'center');
        
        // 评级说明
        this.contents.fontSize = 16;
        this.changeTextColor(ColorManager.normalColor());
        this.drawText('评级', x, y + boxHeight + 10, boxWidth, 'center');
    }
    
    drawDataSection(x, y, accuracy, volume, damage) {
        const barWidth = 200;
        const spacing = 50;
        
        // 准确度
        this.drawDataBar('咒语准确度', accuracy, x, y, barWidth);
        
        // 音量
        this.drawDataBar('咏唱音量', volume, x, y + spacing, barWidth);
        
        // 伤害
        this.drawDamageInfo(damage, x, y + spacing * 2, barWidth);
    }
    
    drawDataBar(label, value, x, y, width) {
        // 标签（左对齐）
        this.changeTextColor(ColorManager.systemColor());
        this.contents.fontSize = 18;
        this.drawText(label, x, y, width, 'left');
        
        // 进度条和百分比（同一行）
        const barY = y + 22;
        const barHeight = 14;
        const barWidth = width - 50; // 留出空间给百分比
        
        // 进度条背景
        this.contents.fillRect(x, barY, barWidth, barHeight, 'rgba(255, 255, 255, 0.2)');
        
        // 进度条填充
        const fillWidth = Math.floor(barWidth * value);
        const color = this.getScoreColor(value);
        
        const gradient = this.contents.context.createLinearGradient(x, barY, x + fillWidth, barY);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.shadeColor(color, -20));
        
        this.contents.context.fillStyle = gradient;
        this.contents.context.fillRect(x, barY, fillWidth, barHeight);
        
        // 百分比（右侧）
        this.changeTextColor(color);
        this.contents.fontSize = 20;
        this.drawText((value * 100).toFixed(0) + '%', x + barWidth + 10, barY - 2, 40, 'left');
    }
    
    drawDamageInfo(damage, x, y, width) {
        // 伤害标签
        this.contents.fontSize = 18;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText('造成伤害', x, y, width, 'left');
        
        // 伤害数值（同行右侧）
        this.contents.fontSize = 36;
        this.changeTextColor(ColorManager.damageColor());
        this.drawText(damage, x + 100, y - 8, width - 100, 'left');
    }
    
    getScoreColor(score) {
        if (score >= 0.9) return '#FFD700';
        if (score >= 0.8) return '#FF69B4';
        if (score >= 0.7) return '#FF4500';
        if (score >= 0.5) return '#1E90FF';
        return '#32CD32';
    }
    
    shadeColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    update() {
        super.update();
        this._animationCount++;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Window_SpellResult;
} else {
    window.Window_SpellResult = Window_SpellResult;
}

} // 结束防重复定义检查
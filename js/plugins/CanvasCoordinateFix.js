/*:
 * @target MZ
 * @plugindesc Canvas Coordinate Fix v1.0.0 - 修复Canvas坐标浮点数错误
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * Canvas坐标修复插件
 * ============================================================================
 * 
 * 这个插件修复了当传入浮点数坐标给Canvas方法时可能出现的getImageData错误。
 * 
 * 问题：
 * - ColorManager.textColor等方法可能计算出浮点数坐标
 * - 传递给getPixel/getAlphaPixel时导致getImageData错误
 * - 错误信息：Failed to execute 'getImageData' on 'CanvasRenderingContext2D': Value is not of type 'long'
 * 
 * 解决方案：
 * - 重写相关方法，确保传入整数坐标
 * - 添加错误处理和边界检查
 * - 不修改RPG Maker MZ核心文件
 * 
 * 注意：此插件应该放在插件列表的最前面，确保在其他插件之前加载。
 */

(() => {
    'use strict';
    
    console.log('[CanvasCoordinateFix] 开始修复Canvas坐标问题...');
    
    // 备份原始方法
    const _Bitmap_getPixel = Bitmap.prototype.getPixel;
    const _Bitmap_getAlphaPixel = Bitmap.prototype.getAlphaPixel;
    const _Bitmap_fillRect = Bitmap.prototype.fillRect;
    const _Bitmap_gradientFillRect = Bitmap.prototype.gradientFillRect;
    
    // 重写getPixel方法，添加坐标修正和错误处理
    Bitmap.prototype.getPixel = function(x, y) {
        // 确保参数为整数
        x = Math.floor(Number(x) || 0);
        y = Math.floor(Number(y) || 0);
        
        // 边界检查
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            console.warn('[CanvasCoordinateFix] getPixel坐标越界:', { x, y, width: this.width, height: this.height });
            return "#000000"; // 返回黑色作为默认值
        }
        
        try {
            return _Bitmap_getPixel.call(this, x, y);
        } catch (error) {
            console.warn('[CanvasCoordinateFix] getPixel错误:', error, { x, y });
            return "#000000"; // 出错时返回黑色
        }
    };
    
    // 重写getAlphaPixel方法，添加坐标修正和错误处理
    Bitmap.prototype.getAlphaPixel = function(x, y) {
        // 确保参数为整数
        x = Math.floor(Number(x) || 0);
        y = Math.floor(Number(y) || 0);
        
        // 边界检查
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            console.warn('[CanvasCoordinateFix] getAlphaPixel坐标越界:', { x, y, width: this.width, height: this.height });
            return 0; // 返回透明作为默认值
        }
        
        try {
            return _Bitmap_getAlphaPixel.call(this, x, y);
        } catch (error) {
            console.warn('[CanvasCoordinateFix] getAlphaPixel错误:', error, { x, y });
            return 0; // 出错时返回透明
        }
    };
    
    // 重写fillRect方法，确保坐标为整数
    Bitmap.prototype.fillRect = function(x, y, width, height, color) {
        // 确保所有参数为整数
        x = Math.floor(Number(x) || 0);
        y = Math.floor(Number(y) || 0);
        width = Math.floor(Number(width) || 0);
        height = Math.floor(Number(height) || 0);
        
        // 调用原始方法
        return _Bitmap_fillRect.call(this, x, y, width, height, color);
    };
    
    // 重写gradientFillRect方法，确保坐标为整数
    Bitmap.prototype.gradientFillRect = function(x, y, width, height, color1, color2, vertical) {
        // 确保所有参数为整数
        x = Math.floor(Number(x) || 0);
        y = Math.floor(Number(y) || 0);
        width = Math.floor(Number(width) || 0);
        height = Math.floor(Number(height) || 0);
        
        // 调用原始方法
        return _Bitmap_gradientFillRect.call(this, x, y, width, height, color1, color2, vertical);
    };
    
    // 修复ColorManager中可能产生浮点数的计算
    if (typeof ColorManager !== 'undefined') {
        const _ColorManager_textColor = ColorManager.textColor;
        ColorManager.textColor = function(n) {
            // 确保计算结果为整数
            const px = Math.floor(96 + (n % 8) * 12 + 6);
            const py = Math.floor(144 + Math.floor(n / 8) * 12 + 6);
            
            // 直接调用getPixel，现在已经有保护了
            return this._windowskin.getPixel(px, py);
        };
        
        const _ColorManager_pendingColor = ColorManager.pendingColor;
        ColorManager.pendingColor = function() {
            // 确保坐标为整数
            return this._windowskin.getPixel(120, 120);
        };
    }
    
    // 为直接调用context.fillRect的情况提供全局修复函数
    window.safeContextFillRect = function(context, x, y, width, height) {
        context.fillRect(
            Math.floor(Number(x) || 0),
            Math.floor(Number(y) || 0), 
            Math.floor(Number(width) || 0),
            Math.floor(Number(height) || 0)
        );
    };
    
    console.log('[CanvasCoordinateFix] Canvas坐标修复完成');
    
})();


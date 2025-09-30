/**
 * VolumeAnalyzer.js - 音量分析器模块
 * 
 * 功能说明：
 * 1. 实时音量监测
 * 2. 音量峰值检测
 * 3. 平均音量计算
 * 4. 音量可视化数据
 * 
 * @author 不想做工-接桀桀
 * @version 1.0.0
 */

class VolumeAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.processor = null;
        this.stream = null;
        
        this.isAnalyzing = false;
        this.currentVolume = 0;
        this.maxVolume = 0;
        this.averageVolume = 0;
        this.volumeHistory = [];
        
        // 配置
        this.config = {
            fftSize: 1024,
            smoothingTimeConstant: 0.8,
            historySize: 100,
            updateInterval: 50 // ms
        };
        
        // 回调
        this.onVolumeUpdate = null;
    }
    
    /**
     * 开始音量分析
     * @param {Function} callback - 音量更新回调
     */
    async start(callback) {
        if (this.isAnalyzing) {
            console.log('[VolumeAnalyzer] 已经在分析中');
            return;
        }
        
        this.onVolumeUpdate = callback;
        
        try {
            // 获取麦克风权限
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建分析器
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.config.fftSize;
            this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
            
            // 连接麦克风
            this.microphone = this.audioContext.createMediaStreamSource(this.stream);
            this.microphone.connect(this.analyser);
            
            // 创建处理器（用于实时分析）
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
            this.analyser.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            // 处理音频数据
            this.processor.onaudioprocess = () => {
                if (!this.isAnalyzing) return;
                this.analyzeVolume();
            };
            
            this.isAnalyzing = true;
            this.resetStats();
            
            console.log('[VolumeAnalyzer] 音量分析已启动');
            
        } catch (error) {
            console.error('[VolumeAnalyzer] 启动失败:', error);
            this.cleanup();
            throw error;
        }
    }
    
    /**
     * 分析音量
     * @private
     */
    analyzeVolume() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // 计算平均音量
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedVolume = average / 255; // 归一化到0-1
        
        // 更新当前音量
        this.currentVolume = normalizedVolume;
        
        // 更新最大音量
        if (normalizedVolume > this.maxVolume) {
            this.maxVolume = normalizedVolume;
        }
        
        // 更新历史记录
        this.volumeHistory.push(normalizedVolume);
        if (this.volumeHistory.length > this.config.historySize) {
            this.volumeHistory.shift();
        }
        
        // 计算平均音量
        this.calculateAverageVolume();
        
        // 触发回调
        if (this.onVolumeUpdate) {
            this.onVolumeUpdate(normalizedVolume, {
                max: this.maxVolume,
                average: this.averageVolume,
                history: this.volumeHistory
            });
        }
    }
    
    /**
     * 计算平均音量
     * @private
     */
    calculateAverageVolume() {
        if (this.volumeHistory.length === 0) {
            this.averageVolume = 0;
            return;
        }
        
        const sum = this.volumeHistory.reduce((a, b) => a + b, 0);
        this.averageVolume = sum / this.volumeHistory.length;
    }
    
    /**
     * 停止音量分析
     */
    stop() {
        if (!this.isAnalyzing) return;
        
        this.isAnalyzing = false;
        this.cleanup();
        
        console.log('[VolumeAnalyzer] 音量分析已停止');
    }
    
    /**
     * 清理资源
     * @private
     */
    cleanup() {
        // 断开音频节点
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
            this.processor = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        // 关闭音频上下文
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // 停止媒体流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.onVolumeUpdate = null;
    }
    
    /**
     * 重置统计数据
     */
    resetStats() {
        this.currentVolume = 0;
        this.maxVolume = 0;
        this.averageVolume = 0;
        this.volumeHistory = [];
    }
    
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isAnalyzing: this.isAnalyzing,
            currentVolume: this.currentVolume,
            maxVolume: this.maxVolume,
            averageVolume: this.averageVolume,
            historyLength: this.volumeHistory.length
        };
    }
    
    /**
     * 获取音量等级
     * @returns {string} - 音量等级（silent/quiet/normal/loud/very_loud）
     */
    getVolumeLevel() {
        if (this.currentVolume < 0.1) return 'silent';
        if (this.currentVolume < 0.3) return 'quiet';
        if (this.currentVolume < 0.6) return 'normal';
        if (this.currentVolume < 0.8) return 'loud';
        return 'very_loud';
    }
    
    /**
     * 获取音量百分比
     * @returns {number} - 0-100的百分比
     */
    getVolumePercentage() {
        return Math.round(this.currentVolume * 100);
    }
    
    /**
     * 设置配置
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        Object.assign(this.config, config);
        
        // 如果正在分析，应用新配置
        if (this.isAnalyzing && this.analyser) {
            if (config.fftSize) {
                this.analyser.fftSize = config.fftSize;
            }
            if (config.smoothingTimeConstant !== undefined) {
                this.analyser.smoothingTimeConstant = config.smoothingTimeConstant;
            }
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VolumeAnalyzer;
} else {
    window.VolumeAnalyzer = VolumeAnalyzer;
}
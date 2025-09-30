/**
 * VoiceCalibration.js - 音量校准系统
 * 
 * 功能说明：
 * 1. 个性化音量校准
 * 2. 平常音量和喊叫音量采样
 * 3. 生成自适应伤害曲线
 * 4. 保存校准数据
 * 
 * @author 不想做工-接桀桀
 * @version 1.0.0
 */

class VoiceCalibration {
    constructor() {
        this.calibrationData = {
            normalVolume: 0,      // 平常说话音量
            shoutVolume: 0,       // 喊叫音量
            whisperVolume: 0,     // 轻声音量（可选）
            calibrated: false,    // 是否已校准
            timestamp: null       // 校准时间
        };
        
        this.currentStep = 0;
        this.samples = [];
        this.isCalibrating = false;
        
        // 音量分析器
        this.volumeAnalyzer = null;
        this.audioContext = null;
        this.microphone = null;
        
        // 配置
        this.config = {
            sampleDuration: 3000,     // 每次采样时长
            sampleCount: 5,           // 采样次数
            normalVolumeTarget: 0.3,  // 平常音量目标值（30%）
            shoutVolumeTarget: 0.8,   // 喊叫音量目标值（80%）
            minShoutRatio: 2.0        // 喊叫音量至少是平常音量的2倍
        };
        
        // 加载已保存的校准数据
        this.loadCalibration();
    }
    
    /**
     * 开始校准流程
     */
    async startCalibration(callback) {
        if (this.isCalibrating) {
            console.warn('[VoiceCalibration] 已经在校准中');
            return;
        }
        
        this.isCalibrating = true;
        this.currentStep = 0;
        this.samples = [];
        this.callback = callback;
        
        try {
            // 初始化音频分析
            await this.initAudioAnalysis();
            
            // 开始第一步
            this.nextStep();
            
        } catch (error) {
            console.error('[VoiceCalibration] 初始化失败:', error);
            this.endCalibration(false, '麦克风初始化失败');
        }
    }
    
    /**
     * 初始化音频分析
     */
    async initAudioAnalysis() {
        // 获取麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        // 创建音频上下文
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 创建分析器
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        
        // 连接麦克风
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(analyser);
        
        // 创建音量分析器
        this.volumeAnalyzer = new RealtimeVolumeAnalyzer(analyser);
    }
    
    /**
     * 进入下一步
     */
    nextStep() {
        this.currentStep++;
        
        switch (this.currentStep) {
            case 1:
                this.calibrateNormalVolume();
                break;
            case 2:
                this.calibrateShoutVolume();
                break;
            case 3:
                this.validateCalibration();
                break;
            default:
                this.endCalibration(true);
        }
    }
    
    /**
     * 校准平常说话音量
     */
    calibrateNormalVolume() {
        if (this.callback) {
            this.callback({
                type: 'step',
                step: 1,
                title: '平常音量校准',
                instruction: '请用您平常说话的音量，清晰地说出以下句子：',
                text: '今天天气真好，我要去冒险了',
                duration: this.config.sampleDuration
            });
        }
        
        this.startSampling('normal');
    }
    
    /**
     * 校准喊叫音量
     */
    calibrateShoutVolume() {
        if (this.callback) {
            this.callback({
                type: 'step',
                step: 2,
                title: '喊叫音量校准',
                instruction: '请大声喊出以下咒语（不要害羞！）：',
                text: '烈焰焚天！',
                duration: this.config.sampleDuration
            });
        }
        
        this.startSampling('shout');
    }
    
    /**
     * 开始采样
     */
    startSampling(type) {
        this.samples = [];
        let sampleCount = 0;
        
        // 采样定时器
        const sampleInterval = setInterval(() => {
            const volume = this.volumeAnalyzer.getVolume();
            this.samples.push(volume);
            sampleCount++;
            
            // 实时反馈
            if (this.callback) {
                this.callback({
                    type: 'sampling',
                    volume: volume,
                    progress: sampleCount / (this.config.sampleDuration / 100)
                });
            }
            
            // 采样完成
            if (sampleCount >= this.config.sampleDuration / 100) {
                clearInterval(sampleInterval);
                this.processSamples(type);
            }
        }, 100);
    }
    
    /**
     * 处理采样数据
     */
    processSamples(type) {
        // 去除最低10%和最高10%的数据
        const sorted = [...this.samples].sort((a, b) => a - b);
        const trimStart = Math.floor(sorted.length * 0.1);
        const trimEnd = Math.floor(sorted.length * 0.9);
        const trimmed = sorted.slice(trimStart, trimEnd);
        
        // 计算平均值
        const average = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
        
        // 保存结果
        if (type === 'normal') {
            this.calibrationData.normalVolume = average;
            console.log('[VoiceCalibration] 平常音量校准完成:', average);
        } else if (type === 'shout') {
            this.calibrationData.shoutVolume = average;
            console.log('[VoiceCalibration] 喊叫音量校准完成:', average);
        }
        
        // 进入下一步
        this.nextStep();
    }
    
    /**
     * 验证校准结果
     */
    validateCalibration() {
        const ratio = this.calibrationData.shoutVolume / this.calibrationData.normalVolume;
        
        if (ratio < this.config.minShoutRatio) {
            // 喊叫音量不够大
            if (this.callback) {
                this.callback({
                    type: 'error',
                    message: '您的喊叫音量不够大！请再试一次，记得要大声喊哦！',
                    canRetry: true
                });
            }
            
            // 重新校准喊叫音量
            this.currentStep = 1;
            this.nextStep();
            
        } else {
            // 校准成功
            this.calibrationData.calibrated = true;
            this.calibrationData.timestamp = Date.now();
            
            // 生成伤害曲线参数
            this.generateDamageCurve();
            
            // 保存校准数据
            this.saveCalibration();
            
            // 显示结果
            if (this.callback) {
                this.callback({
                    type: 'complete',
                    normalVolume: this.calibrationData.normalVolume,
                    shoutVolume: this.calibrationData.shoutVolume,
                    ratio: ratio,
                    curve: this.getDamageCurve()
                });
            }
            
            this.endCalibration(true);
        }
    }
    
    /**
     * 生成伤害曲线
     */
    generateDamageCurve() {
        const normal = this.calibrationData.normalVolume;
        const shout = this.calibrationData.shoutVolume;
        
        // 创建三段式曲线
        // 0 ~ normal*0.8: 低伤害区（0% ~ 30%）
        // normal*0.8 ~ normal*1.2: 正常伤害区（30% ~ 60%）
        // normal*1.2 ~ shout: 高伤害区（60% ~ 100%）
        // shout以上: 额外加成区（100% ~ 150%）
        
        this.damageCurve = {
            whisperThreshold: normal * 0.5,
            normalLow: normal * 0.8,
            normalHigh: normal * 1.2,
            shoutThreshold: shout,
            maxThreshold: shout * 1.2,
            
            // 伤害映射
            whisperDamage: 0.1,    // 10%
            normalMinDamage: 0.3,  // 30%
            normalMaxDamage: 0.6,  // 60%
            shoutDamage: 1.0,      // 100%
            maxDamage: 1.5         // 150%
        };
    }

    /**
     * 根据音量计算伤害倍率
     */
    calculateDamageMultiplier(volume) {
        if (!this.calibrationData.calibrated) {
            // 未校准时使用默认曲线
            if (volume < 0.2) return 0.3;
            if (volume < 0.4) return 0.5;
            if (volume < 0.6) return 0.8;
            if (volume < 0.8) return 1.0;
            return 1.2;
        }
        
        // === 添加安全检查 ===
        if (!this.damageCurve) {
            console.warn('[VoiceCalibration] 伤害曲线未生成，生成默认曲线');
            // 生成默认曲线
            this.generateDefaultDamageCurve();
        }
        
        const curve = this.damageCurve;
        
        // === 再次检查，确保曲线存在 ===
        if (!curve || !curve.whisperThreshold) {
            console.error('[VoiceCalibration] 伤害曲线数据异常，使用默认计算');
            // 使用简单的线性计算
            return Math.min(Math.max(volume * 1.5, 0.1), 1.5);
        }
        
        // 太小声
        if (volume < curve.whisperThreshold) {
            return curve.whisperDamage;
        }
        
        // 正常音量下限
        if (volume < curve.normalLow) {
            const ratio = (volume - curve.whisperThreshold) / (curve.normalLow - curve.whisperThreshold);
            return curve.whisperDamage + (curve.normalMinDamage - curve.whisperDamage) * ratio;
        }
        
        // 正常音量范围
        if (volume < curve.normalHigh) {
            const ratio = (volume - curve.normalLow) / (curve.normalHigh - curve.normalLow);
            return curve.normalMinDamage + (curve.normalMaxDamage - curve.normalMinDamage) * ratio;
        }
        
        // 高音量
        if (volume < curve.shoutThreshold) {
            const ratio = (volume - curve.normalHigh) / (curve.shoutThreshold - curve.normalHigh);
            return curve.normalMaxDamage + (curve.shoutDamage - curve.normalMaxDamage) * ratio;
        }
        
        // 超高音量
        if (volume < curve.maxThreshold) {
            const ratio = (volume - curve.shoutThreshold) / (curve.maxThreshold - curve.shoutThreshold);
            return curve.shoutDamage + (curve.maxDamage - curve.shoutDamage) * ratio;
        }
        
        // 最大伤害
        return curve.maxDamage;
    }

    /**
     * 生成默认伤害曲线（新增方法）
     */
    generateDefaultDamageCurve() {
        // 使用默认值或已有的校准数据生成曲线
        const normal = this.calibrationData.normalVolume || 0.3;
        const shout = this.calibrationData.shoutVolume || 0.8;
        
        this.damageCurve = {
            whisperThreshold: normal * 0.5,
            normalLow: normal * 0.8,
            normalHigh: normal * 1.2,
            shoutThreshold: shout,
            maxThreshold: shout * 1.2,
            
            // 伤害映射
            whisperDamage: 0.1,    // 10%
            normalMinDamage: 0.3,  // 30%
            normalMaxDamage: 0.6,  // 60%
            shoutDamage: 1.0,      // 100%
            maxDamage: 1.5         // 150%
        };
        
        console.log('[VoiceCalibration] 已生成默认伤害曲线:', this.damageCurve);
    }
    
    /**
     * 获取伤害曲线数据
     */
    getDamageCurve() {
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const volume = i / 100;
            const damage = this.calculateDamageMultiplier(volume);
            points.push({ volume: volume, damage: damage });
        }
        return points;
    }
    
    /**
     * 结束校准
     */
    endCalibration(success, message = null) {
        this.isCalibrating = false;
        
        // 清理音频资源
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.volumeAnalyzer) {
            this.volumeAnalyzer.destroy();
            this.volumeAnalyzer = null;
        }
        
        // 通知完成
        if (this.callback) {
            this.callback({
                type: 'end',
                success: success,
                message: message
            });
        }
    }
    
    /**
     * 保存校准数据
     */
    saveCalibration() {
        const data = {
            ...this.calibrationData,
            damageCurve: this.damageCurve
        };
        
        localStorage.setItem('VoiceRPG_Calibration', JSON.stringify(data));
        
        // 同时更新到配置管理器
        if (window.$voiceConfig) {
            window.$voiceConfig.set('audio.volumeCalibration', data);
        }
    }
    
    /**
     * 加载校准数据
     */
    loadCalibration() {
        try {
            const saved = localStorage.getItem('VoiceRPG_Calibration');
            if (saved) {
                const data = JSON.parse(saved);
                this.calibrationData = data;
                this.damageCurve = data.damageCurve;
                
                // === 添加：如果加载的数据中没有伤害曲线，生成一个 ===
                if (this.calibrationData.calibrated && !this.damageCurve) {
                    console.log('[VoiceCalibration] 校准数据中缺少伤害曲线，重新生成');
                    this.generateDamageCurve();
                }
                
                console.log('[VoiceCalibration] 已加载校准数据');
            }
        } catch (error) {
            console.error('[VoiceCalibration] 加载校准数据失败:', error);
        }
    }
    
    /**
     * 重置校准
     */
    resetCalibration() {
        this.calibrationData = {
            normalVolume: 0,
            shoutVolume: 0,
            whisperVolume: 0,
            calibrated: false,
            timestamp: null
        };
        
        this.damageCurve = null;
        localStorage.removeItem('VoiceRPG_Calibration');
    }
    
    /**
     * 是否已校准
     */
    isCalibrated() {
        return this.calibrationData.calibrated;
    }
    
    /**
     * 获取校准信息
     */
    getCalibrationInfo() {
        return {
            calibrated: this.calibrationData.calibrated,
            normalVolume: this.calibrationData.normalVolume,
            shoutVolume: this.calibrationData.shoutVolume,
            ratio: this.calibrationData.shoutVolume / this.calibrationData.normalVolume,
            timestamp: this.calibrationData.timestamp,
            age: this.calibrationData.timestamp ? Date.now() - this.calibrationData.timestamp : null
        };
    }
}

/**
 * 实时音量分析器
 */
class RealtimeVolumeAnalyzer {
    constructor(analyser) {
        this.analyser = analyser;
        this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    
    getVolume() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        
        return sum / (this.dataArray.length * 255);
    }
    
    destroy() {
        this.analyser = null;
        this.dataArray = null;
    }
}

// 创建全局实例
window.$voiceCalibration = new VoiceCalibration();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceCalibration;
} else {
    window.VoiceCalibration = VoiceCalibration;
}
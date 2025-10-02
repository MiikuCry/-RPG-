/*:
 * @target MZ
 * @plugindesc Voice Calibration Scene v4.0.0 - 音量校准场景（真实版）
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 音量校准场景插件 - 真实版
 * ============================================================================
 * 
 * 真实的音量检测和校准功能
 * 
 * @param skipable
 * @text 可跳过
 * @desc 是否允许跳过校准
 * @type boolean
 * @default true
 * 
 * @param sampleDuration
 * @text 采样时长
 * @desc 每次采样的时长（秒）
 * @type number
 * @min 2
 * @max 10
 * @default 3
 */

(() => {
    'use strict';
    
    const pluginName = 'Scene_VoiceCalibration';
    const parameters = PluginManager.parameters(pluginName);
    const skipable = parameters['skipable'] !== 'false';
    const sampleDuration = Number(parameters['sampleDuration'] || 3);
    
    // ============================================
    // 简单音量检测器 - 内置版本
    // ============================================
    class SimpleVolumeDetector {
        constructor() {
            this.stream = null;
            this.audioContext = null;
            this.analyser = null;
            this.microphone = null;
            this.isActive = false;
            this.volumeCallback = null;
        }
        
        async start(callback) {
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
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256; // 减小FFT大小以提高性能
                this.analyser.smoothingTimeConstant = 0.8;
                
                // 连接麦克风
                this.microphone = this.audioContext.createMediaStreamSource(this.stream);
                this.microphone.connect(this.analyser);
                
                this.volumeCallback = callback;
                this.isActive = true;
                
                // 开始检测循环
                this.detectVolume();
                
                console.log('[VolumeDetector] 启动成功');
                return true;
            } catch (error) {
                console.error('[VolumeDetector] 启动失败:', error);
                throw error;
            }
        }
        
        detectVolume() {
            if (!this.isActive) return;
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            
            // 计算平均音量
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volume = average / 255; // 归一化到 0-1
            
            if (this.volumeCallback) {
                this.volumeCallback(volume);
            }
            
            // 继续检测
            requestAnimationFrame(() => this.detectVolume());
        }
        
        stop() {
            this.isActive = false;
            
            if (this.microphone) {
                this.microphone.disconnect();
                this.microphone = null;
            }
            
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            console.log('[VolumeDetector] 已停止');
        }
    }
    
    // ============================================
    // 音量校准场景
    // ============================================
    class Scene_VoiceCalibration extends Scene_MenuBase {
        create() {
            super.create();
            
            this._step = 0;
            this._volume = 0;
            this._volumeSamples = [];
            this._normalVolume = 0;
            this._shoutVolume = 0;
            this._detector = null;
            this._isDetecting = false;
            this._countdown = 0;
            
            // 创建窗口
            this.createHelpWindow();
            this.createMainWindow();
            
            this._helpWindow.setText('音量校准系统');
            
            // 显示初始菜单
            this.showMainMenu();
        }
        
        createMainWindow() {
            const rect = new Rectangle(
                (Graphics.boxWidth - 650) / 2,
                (Graphics.boxHeight - 400) / 2,
                650,
                400
            );
            this._mainWindow = new Window_Base(rect);
            this.addWindow(this._mainWindow);
        }
        
        showMainMenu() {
            this._mainWindow.contents.clear();
            
            const lines = [
                '欢迎使用音量校准系统！',
                '',
                '此系统将帮助您校准个人音量范围，',
                '以获得更好的咒语伤害体验。',
                '',
                '需要使用麦克风进行实际音量检测。',
                '',
                '按 确认键(Z/Space/Enter) 开始校准',
                skipable ? '按 取消键(X/Esc) 跳过校准' : ''
            ];
            
            this._mainWindow.contents.fontSize = 20;
            lines.forEach((line, index) => {
                if (line) { // 确保不是空行才绘制
                    this._mainWindow.drawText(line, 0, index * 40, this._mainWindow.innerWidth, 'center');
                }
            });
            
            this._step = 0;
        }
        
        async showStep1() {
            this._mainWindow.contents.clear();
            
            this._mainWindow.contents.fontSize = 24;
            this._mainWindow.changeTextColor(ColorManager.systemColor());
            this._mainWindow.drawText('第一步：平常音量测试', 0, 20, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 20;
            this._mainWindow.changeTextColor(ColorManager.normalColor());
            this._mainWindow.drawText('请用平常说话的音量说：', 0, 80, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 28;
            this._mainWindow.changeTextColor(ColorManager.powerUpColor());
            this._mainWindow.drawText('"今天天气真好"', 0, 130, this._mainWindow.innerWidth, 'center');
            
            // 初始化检测器
            if (!this._detector) {
                try {
                    this._detector = new SimpleVolumeDetector();
                    await this._detector.start((volume) => {
                        this._volume = volume;
                        this.updateVolumeDisplay();
                    });
                    
                    // 开始倒计时和采样
                    this._countdown = sampleDuration;
                    this._volumeSamples = [];
                    this._isDetecting = true;
                    
                } catch (error) {
                    console.error('[VoiceCalibration] 麦克风初始化失败:', error);
                    this.showError('麦克风访问失败：\n' + error.message);
                    return;
                }
            }
        }
        
        async showStep2() {
            // 保存第一步的结果
            this._normalVolume = this.calculateAverageVolume();
            console.log('[VoiceCalibration] 平常音量:', this._normalVolume);
            
            this._mainWindow.contents.clear();
            
            this._mainWindow.contents.fontSize = 24;
            this._mainWindow.changeTextColor(ColorManager.systemColor());
            this._mainWindow.drawText('第二步：喊叫音量测试', 0, 20, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 20;
            this._mainWindow.changeTextColor(ColorManager.normalColor());
            this._mainWindow.drawText('请大声喊出：', 0, 80, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 28;
            this._mainWindow.changeTextColor(ColorManager.powerUpColor());
            this._mainWindow.drawText('"烈焰焚天！"', 0, 130, this._mainWindow.innerWidth, 'center');
            
            // 重置采样
            this._countdown = sampleDuration;
            this._volumeSamples = [];
            this._isDetecting = true;
        }
        
        updateVolumeDisplay() {
            if (!this._isDetecting) return;
            
            const y = 200;
            const barWidth = 400;
            const barHeight = 30;
            const barX = (this._mainWindow.innerWidth - barWidth) / 2;
            
            // 清除音量条区域
            this._mainWindow.contents.clearRect(barX - 60, y - 30, barWidth + 120, 100);
            
            // 标签
            this._mainWindow.changeTextColor(ColorManager.systemColor());
            this._mainWindow.contents.fontSize = 18;
            this._mainWindow.drawText('音量:', barX - 60, y, 50, 'right');
            
            // 背景
            this._mainWindow.contents.fillRect(barX - 1, y - 1, barWidth + 2, barHeight + 2, '#ffffff');
            this._mainWindow.contents.fillRect(barX, y, barWidth, barHeight, ColorManager.gaugeBackColor());
            
            // 音量条
            const fillWidth = Math.floor(barWidth * this._volume);
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
            
            if (fillWidth > 0) {
                const gradient = this._mainWindow.contents.context.createLinearGradient(barX, y, barX + fillWidth, y);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                this._mainWindow.contents.context.fillStyle = gradient;
                // 使用安全的fillRect调用
                if (window.safeContextFillRect) {
                    window.safeContextFillRect(this._mainWindow.contents.context, barX, y, fillWidth, barHeight);
                } else {
                    this._mainWindow.contents.context.fillRect(Math.floor(barX), Math.floor(y), Math.floor(fillWidth), Math.floor(barHeight));
                }
            }
            
            // 百分比
            this._mainWindow.changeTextColor(ColorManager.normalColor());
            this._mainWindow.contents.fontSize = 16;
            this._mainWindow.drawText(Math.round(this._volume * 100) + '%', barX + barWidth + 10, y + 5, 60);
            
            // 倒计时
            if (this._countdown > 0) {
                this._mainWindow.contents.fontSize = 20;
                this._mainWindow.changeTextColor(ColorManager.systemColor());
                this._mainWindow.drawText(
                    `剩余时间: ${this._countdown.toFixed(1)}秒`, 
                    0, y + 50, this._mainWindow.innerWidth, 'center'
                );
            }
        }
        
        calculateAverageVolume() {
            if (this._volumeSamples.length === 0) return 0;
            
            // 去除最低和最高的10%
            const sorted = [...this._volumeSamples].sort((a, b) => a - b);
            const start = Math.floor(sorted.length * 0.1);
            const end = Math.floor(sorted.length * 0.9);
            const trimmed = sorted.slice(start, end || 1); // 确保至少有一个元素
            
            // 计算平均值
            const sum = trimmed.reduce((a, b) => a + b, 0);
            return trimmed.length > 0 ? sum / trimmed.length : 0;
        }
        
        showComplete() {
            // 保存第二步的结果
            this._shoutVolume = this.calculateAverageVolume();
            console.log('[VoiceCalibration] 喊叫音量:', this._shoutVolume);
            
            this._mainWindow.contents.clear();
            
            this._mainWindow.contents.fontSize = 28;
            this._mainWindow.changeTextColor(ColorManager.systemColor());
            this._mainWindow.drawText('✨ 校准完成！', 0, 40, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 20;
            this._mainWindow.changeTextColor(ColorManager.normalColor());
            
            const ratio = (this._normalVolume > 0 && this._shoutVolume > 0) 
                ? (this._shoutVolume / this._normalVolume).toFixed(1) 
                : '0';
                
            const lines = [
                `平常音量：${Math.round(this._normalVolume * 100)}%`,
                `喊叫音量：${Math.round(this._shoutVolume * 100)}%`,
                `音量比率：${ratio}x`,
                '',
                '您的个人音量曲线已保存！'
            ];
            
            lines.forEach((line, index) => {
                this._mainWindow.drawText(line, 0, 120 + index * 35, this._mainWindow.innerWidth, 'center');
            });
            
            // 保存校准数据
            this.saveCalibrationData();
            
            // 播放成功音效
            AudioManager.playSe({ name: 'Skill3', volume: 90, pitch: 100 });
            
            // 清理检测器
            if (this._detector) {
                this._detector.stop();
                this._detector = null;
            }
            
            // 2秒后返回
            setTimeout(() => {
                this.popScene();
            }, 2000);
        }
        
        saveCalibrationData() {
            // 创建或更新全局校准对象
            if (!window.$voiceCalibration) {
                window.$voiceCalibration = {};
            }
            
            // 保存数据
            window.$voiceCalibration.normalVolume = this._normalVolume;
            window.$voiceCalibration.shoutVolume = this._shoutVolume;
            window.$voiceCalibration.calibrated = true;
            window.$voiceCalibration.timestamp = Date.now();
            
            // 添加方法
            window.$voiceCalibration.isCalibrated = function() {
                return this.calibrated;
            };
            
            window.$voiceCalibration.getCalibrationInfo = function() {
                return {
                    calibrated: this.calibrated,
                    normalVolume: this.normalVolume,
                    shoutVolume: this.shoutVolume,
                    ratio: this.normalVolume > 0 ? this.shoutVolume / this.normalVolume : 0
                };
            };
            
            window.$voiceCalibration.calculateDamageMultiplier = function(volume) {
                if (!this.calibrated || this.normalVolume === 0) {
                    // 默认曲线
                    if (volume < 0.2) return 0.3;
                    if (volume < 0.4) return 0.5;
                    if (volume < 0.6) return 0.8;
                    if (volume < 0.8) return 1.0;
                    return 1.2;
                }
                
                // 个性化曲线
                const normal = this.normalVolume;
                const shout = this.shoutVolume;
                
                // 音量太小
                if (volume < normal * 0.5) return 0.1;
                
                // 低于平常音量
                if (volume < normal) {
                    return 0.1 + (volume / normal) * 0.4; // 0.1 ~ 0.5
                }
                
                // 平常音量到喊叫音量之间
                if (volume < shout) {
                    const ratio = (volume - normal) / (shout - normal);
                    return 0.5 + ratio * 0.5; // 0.5 ~ 1.0
                }
                
                // 超过喊叫音量
                const excess = (volume - shout) / shout;
                return Math.min(1.0 + excess * 0.5, 1.5); // 1.0 ~ 1.5
            };
            
            // 保存到localStorage
            const saveData = {
                normalVolume: this._normalVolume,
                shoutVolume: this._shoutVolume,
                calibrated: true,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem('VoiceRPG_Calibration', JSON.stringify(saveData));
                console.log('[VoiceCalibration] 校准数据已保存:', window.$voiceCalibration.getCalibrationInfo());
            } catch (error) {
                console.error('[VoiceCalibration] 保存数据失败:', error);
            }
        }
        
        showError(message) {
            this._mainWindow.contents.clear();
            
            this._mainWindow.contents.fontSize = 24;
            this._mainWindow.changeTextColor(ColorManager.deathColor());
            this._mainWindow.drawText('错误', 0, 50, this._mainWindow.innerWidth, 'center');
            
            this._mainWindow.contents.fontSize = 18;
            this._mainWindow.changeTextColor(ColorManager.normalColor());
            
            const lines = message.split('\n');
            lines.forEach((line, index) => {
                this._mainWindow.drawText(line, 20, 120 + index * 30, this._mainWindow.innerWidth - 40, 'center');
            });
            
            this._mainWindow.drawText('按任意键返回', 0, 300, this._mainWindow.innerWidth, 'center');
            
            this._step = -1; // 错误状态
            
            // 清理检测器
            if (this._detector) {
                this._detector.stop();
                this._detector = null;
            }
        }
        
        update() {
            super.update();
            
            // 更新倒计时和采样
            if (this._isDetecting && this._countdown > 0) {
                this._countdown -= 1/60; // 每帧减少
                
                // 收集音量样本
                if (this._volume > 0.01) { // 过滤掉太小的值
                    this._volumeSamples.push(this._volume);
                }
                
                // 更新显示
                this.updateVolumeDisplay();
                
                // 倒计时结束
                if (this._countdown <= 0) {
                    this._isDetecting = false;
                    
                    if (this._step === 1) {
                        this._step = 2;
                        this.showStep2();
                    } else if (this._step === 2) {
                        this._step = 3;
                        this.showComplete();
                    }
                }
            }
            
            // 按键处理
            if (Input.isTriggered('ok')) {
                if (this._step === 0) {
                    this._step = 1;
                    this.showStep1();
                } else if (this._step === -1) {
                    this.popScene();
                }
            }
            
            if (Input.isTriggered('cancel')) {
                if (this._step === 0 && skipable) {
                    // 跳过校准，使用默认值
                    this.saveDefaultCalibration();
                    this.popScene();
                } else if (this._step === -1) {
                    this.popScene();
                }
            }
        }
        
        saveDefaultCalibration() {
            this._normalVolume = 0.3;
            this._shoutVolume = 0.8;
            this.saveCalibrationData();
            
            $gameMessage.add('已跳过校准，使用默认音量曲线。');
        }
        
        terminate() {
            // 清理音量检测器
            if (this._detector) {
                this._detector.stop();
                this._detector = null;
            }
            
            super.terminate();
        }
    }
    
    // 注册场景
    window.Scene_VoiceCalibration = Scene_VoiceCalibration;
    
    // 启动时加载已保存的校准数据
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        // 延迟加载，确保系统初始化完成
        setTimeout(() => {
            try {
                const saved = localStorage.getItem('VoiceRPG_Calibration');
                if (saved) {
                    const data = JSON.parse(saved);
                    
                    // 恢复校准数据
                    window.$voiceCalibration = {
                        ...data,
                        isCalibrated: () => true,
                        getCalibrationInfo: function() {
                            return {
                                calibrated: this.calibrated,
                                normalVolume: this.normalVolume,
                                shoutVolume: this.shoutVolume,
                                ratio: this.normalVolume > 0 ? this.shoutVolume / this.normalVolume : 0
                            };
                        },
                        calculateDamageMultiplier: function(volume) {
                            // === 确保有伤害曲线 ===
                            if (!this.damageCurve) {
                                // 使用保存的数据重新生成曲线
                                const normal = this.normalVolume || 0.3;
                                const shout = this.shoutVolume || 0.8;
                                
                                this.damageCurve = {
                                    whisperThreshold: normal * 0.5,
                                    normalLow: normal * 0.8,
                                    normalHigh: normal * 1.2,
                                    shoutThreshold: shout,
                                    maxThreshold: shout * 1.2,
                                    whisperDamage: 0.1,
                                    normalMinDamage: 0.3,
                                    normalMaxDamage: 0.6,
                                    shoutDamage: 1.0,
                                    maxDamage: 1.5
                                };
                            }
                            
                            const curve = this.damageCurve;
                            
                            // ... 其余计算逻辑 ...
                            if (volume < curve.whisperThreshold) return curve.whisperDamage;
                            if (volume < curve.normalLow) {
                                const ratio = (volume - curve.whisperThreshold) / (curve.normalLow - curve.whisperThreshold);
                                return curve.whisperDamage + (curve.normalMinDamage - curve.whisperDamage) * ratio;
                            }
                            if (volume < curve.normalHigh) {
                                const ratio = (volume - curve.normalLow) / (curve.normalHigh - curve.normalLow);
                                return curve.normalMinDamage + (curve.normalMaxDamage - curve.normalMinDamage) * ratio;
                            }
                            if (volume < curve.shoutThreshold) {
                                const ratio = (volume - curve.normalHigh) / (curve.shoutThreshold - curve.normalHigh);
                                return curve.normalMaxDamage + (curve.shoutDamage - curve.normalMaxDamage) * ratio;
                            }
                            if (volume < curve.maxThreshold) {
                                const ratio = (volume - curve.shoutThreshold) / (curve.maxThreshold - curve.shoutThreshold);
                                return curve.shoutDamage + (curve.maxDamage - curve.shoutDamage) * ratio;
                            }
                            return curve.maxDamage;
                        }
                    };
                    
                    console.log('[VoiceCalibration] 已加载保存的校准数据');
                }
            } catch (error) {
                console.error('[VoiceCalibration] 加载校准数据失败:', error);
            }
        }, 100);
    };
    
})();
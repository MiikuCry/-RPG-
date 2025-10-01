/**
 * GoogleProvider.js - Google语音服务提供商（极速响应版）
 * 
 * 功能说明：
 * 1. 基于Web Speech API的Google语音识别
 * 2. 极速响应优化
 * 3. 减少静音检测时间
 * 4. 快速重启机制
 * 5. 语言锁定功能
 * 
 * @author 不想做工-接桀桀
 * @version 1.4.0
 */

class GoogleProvider extends BaseProvider {
    constructor() {
        super('Google');
        this.recognition = null;
        this.restartTimer = null;
        this.noSpeechTimer = null;
        this.silenceTimer = null;  
        this.lastSpeechTime = null; 
        this.needsClear = false;    
        this.lockedLanguage = 'zh-CN';
        this.turboMode = false; // 极速模式标志
        
        // Google特有配置 - 极速优化
        this.config = {
            ...this.config,
            autoRestart: true,
            restartDelay: 30,           // 保持30ms
            noSpeechTimeout: 3000,      // 保持3秒
            silenceTimeout: 800,        // 保持0.8秒
            autoStopOnSilence: true,
            forceLanguage: true,
            turboSilenceTimeout: 400    // 从500改为400，更快响应
        };

        // === 新增：重启控制 ===
        this.lastRestartTime = 0;
        this.minRestartInterval = 100; // 最小重启间隔
    }
    
    /**
     * 检查Google语音服务可用性
     */
    async checkAvailability() {
        // 检查浏览器支持
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('[Google] Web Speech API 不支持');
            return false;
        }
        
        // 检查HTTPS（语音识别需要HTTPS）
        if (window.location.protocol === 'file:') {
            console.warn('[Google] file:// 协议下可能无法使用语音识别');
        }
        
        // 检查网络连接
        if (!navigator.onLine) {
            console.warn('[Google] 无网络连接');
            return false;
        }
        
        return true;
    }
    
    /**
     * 初始化Google语音识别
     */
    async doInitialize() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        this.recognition = new SpeechRecognition();
        
        // 设置识别参数
        this.recognition.lang = this.lockedLanguage;
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        
        // 绑定事件处理器
        this.setupEventHandlers();
        
        // 设置语言锁定监控
        this.setupLanguageLock();
    }
    
    /**
     * 启用极速模式
     */
    enableTurboMode() {
        this.turboMode = true;
        this.config.silenceTimeout = this.config.turboSilenceTimeout;
        this.config.restartDelay = 30;
        this.config.noSpeechTimeout = 2000;
        console.log('[Google] 极速模式已启用');
    }
    
    /**
     * 设置语言锁定监控
     */
    setupLanguageLock() {
        if (!this.config.forceLanguage) return;
        
        // 定期检查语言设置（极速模式下更频繁）
        const checkInterval = this.turboMode ? 200 : 500;
        this.languageCheckInterval = setInterval(() => {
            if (this.recognition && this.recognition.lang !== this.lockedLanguage) {
                console.warn('[Google] 检测到语言变化，强制恢复为:', this.lockedLanguage);
                this.recognition.lang = this.lockedLanguage;
            }
        }, checkInterval);
    }
    
    /**
     * 设置事件处理器 - 极速优化版
     * @private
     */
    setupEventHandlers() {
        // 识别开始
        this.recognition.onstart = () => {
            console.log('[Google] 识别已开始，语言:', this.recognition.lang);
            
            // 确保语言设置正确
            if (this.config.forceLanguage && this.recognition.lang !== this.lockedLanguage) {
                console.warn('[Google] 语言设置不正确，强制设置为:', this.lockedLanguage);
                this.recognition.lang = this.lockedLanguage;
            }
            
            this.clearTimers();
            this.updateStatus('listening');
            this.lastSpeechTime = Date.now();
            this.needsClear = false;
        };
        
        // 识别结果 - 极速处理
        this.recognition.onresult = (event) => {
            const results = event.results;
            const lastResult = results[results.length - 1];
            
            if (!lastResult || !lastResult[0]) return;
            
            const transcript = lastResult[0].transcript;
            const confidence = lastResult[0].confidence || 0.9;
            const isFinal = lastResult.isFinal;
            
            // 极速模式下的日志简化
            if (!this.turboMode || isFinal) {
                console.log('[Google] 识别结果:', transcript, '(最终:', isFinal, ')');
            }
            
            // 更新最后语音时间
            this.lastSpeechTime = Date.now();
            
            // 重置计时器
            this.resetNoSpeechTimer();
            this.clearSilenceTimer();
            
            // === 修复：确保使用正确的父类方法 ===
            if (isFinal) {
                // 最终结果
                super.handleResult(transcript, true, confidence);
            } else {
                // 部分结果 - 触发部分结果回调
                const result = {
                    text: transcript,
                    isFinal: false,
                    confidence: confidence,
                    timestamp: Date.now(),
                    provider: this.name
                };
                
                if (this.callbacks.onPartialResult) {
                    this.callbacks.onPartialResult(result);
                }
            }
            
            // 极速模式下的静音检测
            if (isFinal && this.turboMode) {
                this.needsClear = true;
                this.startTurboSilenceTimer();
            }
        };
        
        // 识别错误
        this.recognition.onerror = (event) => {
            // 忽略常见的非致命错误
            if (event.error === 'no-speech' && this.turboMode) {
                return; // 极速模式下忽略无语音错误
            }
            
            console.error('[Google] 识别错误:', event.error);
            
            // 处理不同类型的错误
            switch (event.error) {
                case 'no-speech':
                    this.updateStatus('no-speech');
                    if (this.config.autoStopOnSilence && !this.turboMode) {
                        this.handleNoSpeech();
                    }
                    break;
                    
                case 'audio-capture':
                    this.handleError(new Error('无法访问麦克风'));
                    this.isActive = false;
                    break;
                    
                case 'not-allowed':
                    this.handleError(new Error('麦克风权限被拒绝'));
                    this.isActive = false;
                    break;
                    
                case 'network':
                    this.handleError(new Error('网络连接错误'));
                    break;
                    
                case 'language-not-supported':
                    console.warn('[Google] 语言不支持，尝试使用默认语言');
                    this.recognition.lang = this.lockedLanguage;
                    break;
                    
                case 'aborted':
                    // 极速模式下的正常中断，忽略
                    if (this.turboMode) {
                        return;
                    }
                    break;
                    
                default:
                    this.handleError(new Error(`识别错误: ${event.error}`));
            }
            
            // 根据配置决定是否自动重启
            if (this.isActive && this.config.autoRestart && 
                ['no-speech', 'network', 'aborted'].includes(event.error)) {
                this.scheduleRestart();
            }
        };
        
        // 识别结束 - 极速重启
        this.recognition.onend = () => {
            console.log('[Google] 识别已结束');
            this.clearTimers();
            
            // 如果仍处于激活状态，极速重启
            if (this.isActive && this.config.autoRestart) {
                // 极速模式下立即重启
                const delay = this.turboMode ? 10 : 500;
                setTimeout(() => {
                    if (this.isActive) {
                        this.scheduleRestart();
                    }
                }, delay);
            } else {
                this.updateStatus('stopped');
            }
        };
        
        // 语音开始
        this.recognition.onspeechstart = () => {
            console.log('[Google] 检测到语音');
            this.updateStatus('speech-detected');
            this.lastSpeechTime = Date.now();
            this.clearSilenceTimer();
        };
        
        // 语音结束
        this.recognition.onspeechend = () => {
            if (!this.turboMode) {
                console.log('[Google] 语音结束');
            }
            // 开始静音计时
            if (this.config.autoStopOnSilence) {
                if (this.turboMode) {
                    this.startTurboSilenceTimer();
                } else {
                    this.startSilenceTimer();
                }
            }
        };
        
        // 音频事件（极速模式下不记录）
        if (!this.turboMode) {
            this.recognition.onaudiostart = () => {
                console.log('[Google] 音频捕获开始');
            };
            
            this.recognition.onaudioend = () => {
                console.log('[Google] 音频捕获结束');
            };
        }
    }
    
    /**
     * 极速静音计时器
     */
    startTurboSilenceTimer() {
        this.clearSilenceTimer();
        
        // 极速模式下更短的静音检测
        this.silenceTimer = setTimeout(() => {
            if (this.isActive) {
                // 不停止，只是重启
                console.log('[Google] 极速静音检测，准备重启');
                this.scheduleRestart();
            }
        }, this.config.turboSilenceTimeout);
    }
    
    /**
     * 开始静音计时器
     */
    startSilenceTimer() {
        this.clearSilenceTimer();
        
        console.log('[Google] 开始静音计时...');
        
        this.silenceTimer = setTimeout(() => {
            console.log('[Google] 检测到持续静音，停止识别');
            if (this.isActive) {
                // 临时设置不自动重启
                const originalAutoRestart = this.config.autoRestart;
                this.config.autoRestart = false;
                
                // 停止识别
                this.recognition.stop();
                
                // 更新状态
                this.updateStatus('silence-timeout');
                
                // 延迟恢复自动重启设置
                setTimeout(() => {
                    this.config.autoRestart = originalAutoRestart;
                    // 如果仍然激活，重新开始
                    if (this.isActive) {
                        console.log('[Google] 静音超时后重新启动');
                        this.scheduleRestart();
                    }
                }, 1000);
            }
        }, this.config.silenceTimeout);
    }
    
    /**
     * 清除静音计时器
     */
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    /**
     * 处理长时间无语音
     */
    handleNoSpeech() {
        if (this.turboMode) return; // 极速模式下不处理
        
        const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
        if (timeSinceLastSpeech > this.config.noSpeechTimeout) {
            console.log('[Google] 长时间无语音，停止识别');
            if (this.isActive) {
                // 临时禁用自动重启
                const originalAutoRestart = this.config.autoRestart;
                this.config.autoRestart = false;
                
                this.recognition.stop();
                
                setTimeout(() => {
                    this.config.autoRestart = originalAutoRestart;
                }, 1000);
            }
        }
    }
    
    /**
     * 开始识别 - 极速版
     */
    async doStart() {
        try {
            // 请求麦克风权限
            await this.requestMicrophonePermission();
            
            // 确保语言设置正确
            if (this.recognition) {
                this.recognition.lang = this.lockedLanguage;
                console.log('[Google] 开始识别，语言设置:', this.recognition.lang);
            }
            
            // 启动识别
            this.recognition.start();
            
            // 设置无语音超时
            if (!this.turboMode) {
                this.resetNoSpeechTimer();
            }
            
        } catch (error) {
            // 如果已经在识别中，忽略错误
            if (error.name === 'InvalidStateError') {
                console.log('[Google] 识别器已经在运行中');
            } else {
                throw error;
            }
        }
    }
    
    /**
     * 停止识别
     */
    async doStop() {
        this.clearTimers();
        
        try {
            this.recognition.stop();
        } catch (error) {
            // 忽略停止时的错误
            console.warn('[Google] 停止识别时出错:', error);
        }
    }
    
    /**
     * 极速停止（不触发end事件）
     */
    async turboStop() {
        this.clearTimers();
        
        try {
            this.recognition.abort();
        } catch (error) {
            // 忽略错误
        }
    }
    
    /**
     * 请求麦克风权限
     * @private
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 立即停止流，我们只需要权限
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('麦克风权限被拒绝');
            } else {
                throw new Error('无法访问麦克风: ' + error.message);
            }
        }
    }
    
    /**
     * 计划重启识别 - 极速版
     * @private
     */
    scheduleRestart() {
        this.clearTimers();
        
        // === 新增：防止过于频繁的重启 ===
        const now = Date.now();
        if (now - this.lastRestartTime < this.minRestartInterval) {
            console.log('[Google] 跳过过于频繁的重启');
            return;
        }
        
        const delay = this.turboMode ? this.config.restartDelay : 100;
        
        this.restartTimer = setTimeout(() => {
            if (this.isActive) {
                console.log('[Google] 自动重启识别');
                
                this.lastRestartTime = Date.now();
                
                // 重启前确保语言设置
                if (this.recognition) {
                    this.recognition.lang = this.lockedLanguage;
                }
                
                this.doStart().catch(error => {
                    console.error('[Google] 重启失败:', error);
                    this.handleError(error);
                });
            }
        }, delay);
    }
    
    /**
     * 重置无语音计时器
     * @private
     */
    resetNoSpeechTimer() {
        if (this.turboMode) return; // 极速模式下不使用
        
        if (this.noSpeechTimer) {
            clearTimeout(this.noSpeechTimer);
        }
        
        this.noSpeechTimer = setTimeout(() => {
            if (this.isActive) {
                console.log('[Google] 长时间无语音输入');
                this.updateStatus('no-speech-timeout');
            }
        }, this.config.noSpeechTimeout);
    }
    
    /**
     * 清除所有计时器
     * @private
     */
    clearTimers() {
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        
        if (this.noSpeechTimer) {
            clearTimeout(this.noSpeechTimer);
            this.noSpeechTimer = null;
        }
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    /**
     * 重置当前识别会话 - 极速版
     */
    async resetRecognition() {
        console.log('[Google] 重置识别会话（极速）');
        
        if (this.recognition && this.isActive) {
            try {
                // 极速停止
                if (this.turboMode) {
                    this.recognition.abort();
                } else {
                    this.recognition.stop();
                }
                
                // 极短延迟后重启
                await new Promise(resolve => setTimeout(resolve, this.turboMode ? 20 : 100));
                
                // 如果仍然激活，重新开始
                if (this.isActive) {
                    // 确保语言设置
                    this.recognition.lang = this.lockedLanguage;
                    await this.doStart();
                }
            } catch (error) {
                console.warn('[Google] 重置识别时出错:', error);
            }
        }
    }
    
    /**
     * 完全重置识别器状态（新增 - 用于咒语系统）
     */
    async resetRecognitionState() {
        console.log('[Google] 完全重置识别器状态');
        
        if (this.recognition && this.isActive) {
            try {
                // 先停止当前识别
                this.recognition.stop();
                
                // 等待停止完成
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 清空所有内部状态
                this.lastSpeechTime = null;
                this.needsClear = false;
                this.clearTimers();
                
                // 重新初始化识别器以清空内部缓冲区
                await this.doInitialize();
                
                // 如果仍然激活，重新开始
                if (this.isActive) {
                    await this.doStart();
                }
                
                console.log('[Google] 识别器状态已完全重置');
            } catch (error) {
                console.warn('[Google] 重置识别器状态时出错:', error);
            }
        }
    }
    
    /**
     * 设置语言（会被锁定）
     */
    setLanguage(language) {
        console.log('[Google] 尝试设置语言:', language);
        if (this.config.forceLanguage) {
            console.warn('[Google] 语言已锁定为:', this.lockedLanguage);
            return;
        }
        
        this.lockedLanguage = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }
    
    /**
     * 销毁服务
     */
    async doDestroy() {
        this.clearTimers();
        
        // 清除语言检查定时器
        if (this.languageCheckInterval) {
            clearInterval(this.languageCheckInterval);
            this.languageCheckInterval = null;
        }
        
        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
            this.recognition.onspeechstart = null;
            this.recognition.onspeechend = null;
            this.recognition.onaudiostart = null;
            this.recognition.onaudioend = null;
            this.recognition = null;
        }
    }
    
    /**
     * 设置配置
     */
    setConfig(config) {
        Object.assign(this.config, config);
        
        // 如果设置了语言，更新锁定语言
        if (config.language) {
            this.lockedLanguage = config.language;
        }
        
        // 如果启用了极速模式
        if (config.turboMode) {
            this.enableTurboMode();
        }
        
        console.log('[Google] 配置已更新:', this.config);
    }
    
    /**
     * 获取配置
     */
    getConfig() {
        return { 
            ...this.config,
            lockedLanguage: this.lockedLanguage,
            turboMode: this.turboMode
        };
    }
    
    /**
     * 获取Google特有的信息
     */
    getInfo() {
        const info = super.getInfo();
        
        return {
            ...info,
            browserSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
            isSecureContext: window.isSecureContext,
            supportedLanguages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
            currentLanguage: this.recognition ? this.recognition.lang : this.lockedLanguage,
            lockedLanguage: this.lockedLanguage,
            silenceTimeout: this.config.silenceTimeout,
            autoStopOnSilence: this.config.autoStopOnSilence,
            needsClear: this.needsClear,
            turboMode: this.turboMode
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleProvider;
} else {
    window.GoogleProvider = GoogleProvider;
}
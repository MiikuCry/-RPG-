// SimpleVolumeDetector.js - 放在 js/plugins/VoiceRPG/features/ 目录下
/**
 * SimpleVolumeDetector.js - 简单音量检测器
 * 专门为音量校准设计的轻量级实现
 */
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
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // 连接麦克风
            this.microphone = this.audioContext.createMediaStreamSource(this.stream);
            this.microphone.connect(this.analyser);
            
            this.volumeCallback = callback;
            this.isActive = true;
            
            // 开始检测循环
            this.detectVolume();
            
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
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

window.SimpleVolumeDetector = SimpleVolumeDetector;
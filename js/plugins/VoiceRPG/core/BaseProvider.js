/**
 * BaseProvider.js - 语音服务提供商基类
 * 
 * 功能说明：
 * 1. 定义语音服务提供商的标准接口
 * 2. 提供通用功能实现
 * 3. 统一的事件处理机制
 * 
 * @author 不想做工-接桀桀
 * @version 1.0.0
 */

class BaseProvider {
    constructor(name) {
        this.name = name || 'BaseProvider';
        this.isAvailable = false;
        this.isInitialized = false;
        this.isActive = false;
        this.requiresNetwork = true;
        
        // 配置
        this.config = {
            language: 'zh-CN',
            continuous: true,
            interimResults: true,
            maxAlternatives: 1
        };
        
        // 回调函数
        this.callbacks = {
            onResult: null,
            onPartialResult: null,
            onError: null,
            onStart: null,
            onEnd: null,
            onStatusChange: null
        };
        
        // 状态信息
        this.status = {
            lastError: null,
            lastResult: null,
            startTime: null,
            recognitionCount: 0
        };
    }
    
    /**
     * 检查服务可用性
     * @returns {Promise<boolean>}
     */
    async checkAvailability() {
        throw new Error('checkAvailability() must be implemented by subclass');
    }
    
    /**
     * 初始化服务
     * @param {Object} config - 配置参数
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        if (this.isInitialized) {
            console.log(`[${this.name}] 已经初始化`);
            return;
        }
        
        // 合并配置
        Object.assign(this.config, config);
        
        // 检查可用性
        this.isAvailable = await this.checkAvailability();
        if (!this.isAvailable) {
            throw new Error(`${this.name} 服务不可用`);
        }
        
        console.log(`[${this.name}] 初始化中...`);
        
        // 子类实现具体初始化
        await this.doInitialize();
        
        this.isInitialized = true;
        console.log(`[${this.name}] 初始化完成`);
    }
    
    /**
     * 子类实现的初始化逻辑
     * @protected
     */
    async doInitialize() {
        throw new Error('doInitialize() must be implemented by subclass');
    }
    
    /**
     * 开始识别
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error(`${this.name} 未初始化`);
        }
        
        if (this.isActive) {
            console.log(`[${this.name}] 已经在识别中`);
            return;
        }
        
        console.log(`[${this.name}] 开始识别`);
        
        this.isActive = true;
        this.status.startTime = Date.now();
        
        // 触发开始回调
        this.triggerCallback('onStart');
        this.updateStatus('listening');
        
        // 子类实现具体启动逻辑
        await this.doStart();
    }
    
    /**
     * 子类实现的启动逻辑
     * @protected
     */
    async doStart() {
        throw new Error('doStart() must be implemented by subclass');
    }
    
    /**
     * 停止识别
     */
    async stop() {
        if (!this.isActive) {
            console.log(`[${this.name}] 当前未在识别中`);
            return;
        }
        
        console.log(`[${this.name}] 停止识别`);
        
        this.isActive = false;
        
        // 子类实现具体停止逻辑
        await this.doStop();
        
        // 触发结束回调
        this.triggerCallback('onEnd');
        this.updateStatus('stopped');
    }
    
    /**
     * 子类实现的停止逻辑
     * @protected
     */
    async doStop() {
        throw new Error('doStop() must be implemented by subclass');
    }
    
    /**
     * 设置回调函数
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        } else {
            console.warn(`[${this.name}] 未知的事件类型:`, event);
        }
    }
    
    /**
     * 触发回调
     * @protected
     */
    triggerCallback(event, ...args) {
        const callback = this.callbacks[event];
        if (callback && typeof callback === 'function') {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[${this.name}] 回调执行错误:`, error);
            }
        }
    }
    
    /**
     * 处理识别结果
     * @protected
     */
    handleResult(text, isFinal = true, confidence = 0.9) {
        const result = {
            text: text,
            isFinal: isFinal,
            confidence: confidence,
            timestamp: Date.now(),
            provider: this.name
        };
        
        this.status.lastResult = result;
        this.status.recognitionCount++;
        
        if (isFinal) {
            console.log(`[${this.name}] 识别结果:`, text);
            this.triggerCallback('onResult', result);
        } else {
            this.triggerCallback('onPartialResult', result);
        }
    }
    
    /**
     * 处理错误
     * @protected
     */
    handleError(error) {
        console.error(`[${this.name}] 错误:`, error);
        
        this.status.lastError = {
            message: error.message || error.toString(),
            code: error.code || 'unknown',
            timestamp: Date.now()
        };
        
        this.triggerCallback('onError', error);
        this.updateStatus('error');
    }
    
    /**
     * 更新状态
     * @protected
     */
    updateStatus(status) {
        this.triggerCallback('onStatusChange', status);
    }
    
    /**
     * 获取服务信息
     */
    getInfo() {
        return {
            name: this.name,
            available: this.isAvailable,
            initialized: this.isInitialized,
            active: this.isActive,
            requiresNetwork: this.requiresNetwork,
            config: { ...this.config },
            status: { ...this.status }
        };
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const duration = this.status.startTime 
            ? Date.now() - this.status.startTime 
            : 0;
            
        return {
            recognitionCount: this.status.recognitionCount,
            activeDuration: duration,
            lastError: this.status.lastError,
            lastResult: this.status.lastResult
        };
    }
    
    /**
     * 重置服务
     */
    async reset() {
        if (this.isActive) {
            await this.stop();
        }
        
        this.status = {
            lastError: null,
            lastResult: null,
            startTime: null,
            recognitionCount: 0
        };
        
        console.log(`[${this.name}] 服务已重置`);
    }
    
    /**
     * 销毁服务
     */
    async destroy() {
        if (this.isActive) {
            await this.stop();
        }
        
        // 子类实现具体的清理逻辑
        await this.doDestroy();
        
        // 清空回调
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
        
        this.isInitialized = false;
        console.log(`[${this.name}] 服务已销毁`);
    }
    
    /**
     * 子类实现的销毁逻辑
     * @protected
     */
    async doDestroy() {
        // 子类可选实现
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseProvider;
} else {
    window.BaseProvider = BaseProvider;
}
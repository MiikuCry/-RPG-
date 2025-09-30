/**
 * ConfigManager.js - 配置管理器
 * 
 * 功能说明：
 * 1. 统一管理语音系统配置
 * 2. 配置持久化（localStorage）
 * 3. 默认配置和用户配置合并
 * 4. 配置验证和迁移
 * 
 * @author 不想做工-接桀桀
 * @version 1.1.0
 */

class VoiceConfigManager {
    constructor() {
        this.configKey = 'VoiceRPG_Config';
        this.version = '1.1.0';
        
        // 默认配置
        this.defaultConfig = {
            // 基础设置
            general: {
                enabled: true,
                autoStart: false,
                language: 'zh-CN',
                debugMode: true
            },
            
            // 语音识别设置
            recognition: {
                provider: 'google',         // 固定为 google (Web Speech API)
                continuous: true,
                interimResults: true,
                maxAlternatives: 1,
                microphoneId: 'default'
            },
            
            // 命令系统设置
            commands: {
                fuzzyMatch: true,
                fuzzyThreshold: 0.7,
                contextAware: true,
                customCommands: []
            },
            
            // 输入设置
            input: {
                keyPressDuration: 100,
                queueProcessDelay: 50,
                enableSound: true,
                soundVolume: 90
            },
            
            // UI设置
            ui: {
                showDebugger: true,
                debuggerPosition: 'top-right',
                debuggerTheme: 'dark',
                showStats: true,
                showNotifications: true
            },
            
            // 音频设置
            audio: {
                outputDeviceId: 'default',
                enableEarback: true,
                earbackVolume: 0.7
            },
            
            // 高级设置
            advanced: {
                autoRestartOnError: true,
                restartDelay: 1000,
                maxRestartAttempts: 3,
                logLevel: 'info'          // debug, info, warn, error
            }
        };
        
        // 当前配置
        this.config = null;
        
        // 配置变更监听器
        this.listeners = new Set();
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化配置管理器
     */
    initialize() {
        // 加载配置
        this.load();
        
        // 监听存储变化（多标签页同步）
        if (window.addEventListener) {
            window.addEventListener('storage', (e) => {
                if (e.key === this.configKey) {
                    console.log('[ConfigManager] 检测到配置变化');
                    this.load();
                    this.notifyListeners('external');
                }
            });
        }
    }
    
    /**
     * 加载配置
     */
    load() {
        try {
            const stored = localStorage.getItem(this.configKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // 版本检查和迁移
                if (parsed.version !== this.version) {
                    console.log('[ConfigManager] 配置版本不匹配，执行迁移');
                    this.config = this.migrateConfig(parsed);
                } else {
                    this.config = this.mergeWithDefaults(parsed.config);
                }
            } else {
                // 首次使用，创建默认配置
                this.config = { ...this.defaultConfig };
                this.save();
            }
            
            console.log('[ConfigManager] 配置已加载');
        } catch (error) {
            console.error('[ConfigManager] 加载配置失败:', error);
            this.config = { ...this.defaultConfig };
        }
    }
    
    /**
     * 保存配置
     */
    save() {
        try {
            const data = {
                version: this.version,
                config: this.config,
                lastModified: Date.now()
            };
            
            localStorage.setItem(this.configKey, JSON.stringify(data));
            console.log('[ConfigManager] 配置已保存');
            
            // 通知监听器
            this.notifyListeners('save');
            
            return true;
        } catch (error) {
            console.error('[ConfigManager] 保存配置失败:', error);
            return false;
        }
    }
    
    /**
     * 获取配置值
     * @param {string} path - 配置路径，如 'recognition.provider'
     * @param {*} defaultValue - 默认值
     */
    get(path, defaultValue = undefined) {
        if (!path) return this.config;
        
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    /**
     * 设置配置值
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     */
    set(path, value) {
        if (!path) return false;
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        // 创建嵌套对象
        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        // 检查值是否改变
        const oldValue = target[lastKey];
        if (oldValue === value) return true;
        
        // 设置新值
        target[lastKey] = value;
        
        // 保存并通知
        this.save();
        this.notifyListeners('change', { path, oldValue, newValue: value });
        
        return true;
    }
    
    /**
     * 批量更新配置
     * @param {Object} updates - 更新对象
     */
    update(updates) {
        const changes = [];
        
        const applyUpdates = (target, source, path = '') => {
            for (const key in source) {
                const fullPath = path ? `${path}.${key}` : key;
                const value = source[key];
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    applyUpdates(target[key], value, fullPath);
                } else {
                    if (target[key] !== value) {
                        changes.push({
                            path: fullPath,
                            oldValue: target[key],
                            newValue: value
                        });
                        target[key] = value;
                    }
                }
            }
        };
        
        applyUpdates(this.config, updates);
        
        if (changes.length > 0) {
            this.save();
            this.notifyListeners('batch', changes);
        }
        
        return changes.length;
    }
    
    /**
     * 重置配置
     * @param {string} section - 要重置的部分，不指定则重置全部
     */
    reset(section = null) {
        if (section && this.defaultConfig[section]) {
            // 重置特定部分
            this.config[section] = { ...this.defaultConfig[section] };
            this.save();
            this.notifyListeners('reset', { section });
        } else {
            // 重置全部
            this.config = { ...this.defaultConfig };
            this.save();
            this.notifyListeners('reset', { section: 'all' });
        }
    }
    
    /**
     * 验证配置
     * @param {Object} config - 要验证的配置
     * @returns {Object} - 验证结果
     */
    validate(config = null) {
        const target = config || this.config;
        const errors = [];
        const warnings = [];
        
        // 基础验证
        if (!target.general || typeof target.general !== 'object') {
            errors.push('缺少基础设置');
        }
        
        // 语言验证
        const validLanguages = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
        if (target.general && !validLanguages.includes(target.general.language)) {
            warnings.push('不支持的语言设置');
        }
        
        // 提供商验证
        if (target.recognition && target.recognition.provider !== 'google') {
            warnings.push('只支持 Web Speech API (google)');
        }
        
        // 阈值验证
        if (target.commands) {
            const threshold = target.commands.fuzzyThreshold;
            if (threshold < 0 || threshold > 1) {
                errors.push('模糊匹配阈值必须在0-1之间');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * 导出配置
     * @returns {string} - 配置JSON字符串
     */
    export() {
        return JSON.stringify({
            version: this.version,
            config: this.config,
            exportTime: Date.now()
        }, null, 2);
    }
    
    /**
     * 导入配置
     * @param {string} json - 配置JSON字符串
     * @returns {boolean} - 是否成功
     */
    import(json) {
        try {
            const data = JSON.parse(json);
            
            // 验证格式
            if (!data.config || !data.version) {
                throw new Error('无效的配置格式');
            }
            
            // 验证配置
            const validation = this.validate(data.config);
            if (!validation.valid) {
                throw new Error('配置验证失败: ' + validation.errors.join(', '));
            }
            
            // 应用配置
            this.config = this.mergeWithDefaults(data.config);
            this.save();
            this.notifyListeners('import');
            
            return true;
        } catch (error) {
            console.error('[ConfigManager] 导入配置失败:', error);
            return false;
        }
    }
    
    /**
     * 添加配置变更监听器
     * @param {Function} listener - 监听函数
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    
    /**
     * 移除配置变更监听器
     * @param {Function} listener - 监听函数
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    
    /**
     * 通知所有监听器
     * @private
     */
    notifyListeners(type, data = null) {
        this.listeners.forEach(listener => {
            try {
                listener({ type, data, config: this.config });
            } catch (error) {
                console.error('[ConfigManager] 监听器执行错误:', error);
            }
        });
    }
    
    /**
     * 合并默认配置
     * @private
     */
    mergeWithDefaults(config) {
        const merge = (target, source) => {
            const result = { ...target };
            
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = merge(target[key] || {}, source[key]);
                } else if (!(key in result)) {
                    result[key] = source[key];
                }
            }
            
            return result;
        };
        
        return merge(config, this.defaultConfig);
    }
    
    /**
     * 迁移旧版本配置
     * @private
     */
    migrateConfig(oldData) {
        console.log('[ConfigManager] 迁移配置从版本', oldData.version, '到', this.version);
        
        let config = oldData.config || {};
        
        // 迁移旧的提供商设置
        if (config.recognition && config.recognition.provider) {
            const oldProvider = config.recognition.provider;
            if (oldProvider !== 'google') {
                console.log('[ConfigManager] 将提供商从', oldProvider, '迁移到 google');
                config.recognition.provider = 'google';
            }
        }
        
        // 删除不再使用的配置项
        if (config.recognition) {
            delete config.recognition.hkProxyUrl;
            delete config.recognition.apiKey;
            delete config.recognition.appId;
        }
        
        return this.mergeWithDefaults(config);
    }
}

// 创建全局实例
window.$voiceConfig = new VoiceConfigManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceConfigManager;
} else {
    window.VoiceConfigManager = VoiceConfigManager;
}
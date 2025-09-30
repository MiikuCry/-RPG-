/*:
 * @target MZ
 * @plugindesc Voice Recognition Adapter v2.2.0 - Web Speech API 版
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 语音识别适配器 - Web Speech API 版
 * ============================================================================
 * 
 * 更新内容 v2.2.0：
 * 1. 简化为单一 Web Speech API 支持
 * 2. 移除其他语音服务提供商
 * 3. 保留适配器架构以便未来扩展
 * 
 * @param enableAutoInit
 * @text 启用自动初始化
 * @desc 是否在游戏启动时自动初始化语音识别
 * @type boolean
 * @default true
 */

(() => {
    'use strict';
    
    const pluginName = 'VoiceRecognitionAdapter';
    const parameters = PluginManager.parameters(pluginName);
    const enableAutoInit = parameters['enableAutoInit'] !== 'false';
    
    class VoiceRecognitionAdapter {
        constructor() {
            this.currentProvider = null;
            this.currentProviderName = 'google';
            this.isInitialized = false;
            this.initializationAttempts = 0;
            this.maxAttempts = 3;
            
            // 回调函数
            this.callbacks = {
                onResult: null,
                onError: null,
                onProviderChange: null
            };
            
            console.log('[VoiceAdapter] 适配器创建');
        }
        
        /**
         * 初始化适配器
         */
        async initialize() {
            console.log('[VoiceAdapter] 开始初始化...');
            
            try {
                // 防止重复初始化
                if (this.isInitialized) {
                    console.log('[VoiceAdapter] 已经初始化');
                    return true;
                }
                
                // 防止无限循环
                if (this.initializationAttempts >= this.maxAttempts) {
                    console.error('[VoiceAdapter] 初始化尝试次数过多，放弃');
                    return false;
                }
                
                this.initializationAttempts++;
                
                // 等待模块加载器
                await this.waitForModules();
                
                // 检查 Web Speech API 支持
                if (!this.checkWebSpeechSupport()) {
                    throw new Error('浏览器不支持 Web Speech API');
                }
                
                // 设置提供商
                await this.setProvider('google');
                
                this.isInitialized = true;
                console.log('[VoiceAdapter] 初始化完成');
                
                return true;
                
            } catch (error) {
                console.error('[VoiceAdapter] 初始化失败:', error);
                return false;
            }
        }
        
        /**
         * 等待模块系统加载
         */
        async waitForModules() {
            let attempts = 0;
            const maxAttempts = 50; // 5秒超时
            
            while (attempts < maxAttempts) {
                if (window.$moduleLoader && window.$moduleLoader.isLoaded('BaseProvider')) {
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            console.warn('[VoiceAdapter] 模块系统加载超时，使用降级模式');
        }
        
        /**
         * 检查 Web Speech API 支持
         */
        checkWebSpeechSupport() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            return !!SpeechRecognition;
        }
        
        /**
         * 设置提供商
         */
        async setProvider(providerName) {
            console.log('[VoiceAdapter] 设置提供商:', providerName);
            
            try {
                // 只支持 google (Web Speech API)
                if (providerName !== 'google') {
                    console.warn('[VoiceAdapter] 只支持 Web Speech API，自动使用 google');
                    providerName = 'google';
                }
                
                // 如果主系统存在且已初始化，让它处理
                if (window.$voiceRPG && window.$voiceRPG.isInitialized) {
                    console.log('[VoiceAdapter] 使用主系统设置提供商');
                    
                    window.$voiceRPG.config.defaultProvider = 'google';
                    await window.$voiceRPG.initializeProvider();
                    this.currentProvider = window.$voiceRPG.provider;
                    this.currentProviderName = 'google';
                    
                } else {
                    // 独立创建提供商
                    const loader = window.$moduleLoader;
                    if (!loader) {
                        console.warn('[VoiceAdapter] 模块加载器未找到，等待初始化');
                        return;
                    }
                    
                    const GoogleProvider = loader.getModule('GoogleProvider');
                    
                    if (!GoogleProvider) {
                        console.error('[VoiceAdapter] GoogleProvider 加载失败');
                        return;
                    }
                    
                    // 清理旧的提供商
                    if (this.currentProvider) {
                        try {
                            if (this.currentProvider.stop) {
                                await this.currentProvider.stop();
                            }
                            if (this.currentProvider.destroy) {
                                await this.currentProvider.destroy();
                            }
                        } catch (e) {
                            console.warn('[VoiceAdapter] 清理旧提供商时出错:', e);
                        }
                    }
                    
                    // 创建并初始化提供商
                    console.log('[VoiceAdapter] 创建 GoogleProvider 实例');
                    this.currentProvider = new GoogleProvider();
                    
                    await this.currentProvider.initialize({
                        language: 'zh-CN',
                        continuous: true,
                        interimResults: true
                    });
                    
                    // 设置回调
                    this.setupProviderCallbacks();
                    
                    this.currentProviderName = 'google';
                    console.log('[VoiceAdapter] GoogleProvider 初始化成功');
                }
                
                // 触发提供商变更回调
                if (this.callbacks.onProviderChange) {
                    this.callbacks.onProviderChange('google');
                }
                
                console.log('[VoiceAdapter] 提供商设置完成');
                
            } catch (error) {
                console.error('[VoiceAdapter] 设置提供商时出错:', error);
                throw error;
            }
        }
        
        /**
         * 设置提供商回调
         */
        setupProviderCallbacks() {
            if (!this.currentProvider) return;
            
            this.currentProvider.on('onResult', (result) => {
                if (this.callbacks.onResult) {
                    this.callbacks.onResult(result);
                }
            });
            
            this.currentProvider.on('onError', (error) => {
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            });
        }
        
        /**
         * 开始识别
         */
        async start() {
            // 确保已初始化
            if (!this.isInitialized) {
                console.log('[VoiceAdapter] 未初始化，尝试初始化...');
                const success = await this.initialize();
                if (!success) {
                    throw new Error('初始化失败');
                }
            }
            
            // 优先使用主系统
            if (window.$voiceRPG && window.$voiceRPG.isInitialized) {
                return await window.$voiceRPG.start();
            }
            
            // 使用自己的提供商
            if (this.currentProvider) {
                return await this.currentProvider.start();
            }
            
            throw new Error('没有可用的语音识别服务');
        }
        
        /**
         * 停止识别
         */
        async stop() {
            // 优先使用主系统
            if (window.$voiceRPG && window.$voiceRPG.isActive) {
                return await window.$voiceRPG.stop();
            }
            
            // 使用自己的提供商
            if (this.currentProvider) {
                return await this.currentProvider.stop();
            }
        }
        
        /**
         * 设置回调函数
         */
        onResult(callback) {
            this.callbacks.onResult = callback;
            
            // 如果主系统存在，也设置其回调
            if (window.$voiceRPG && window.$voiceRPG.provider) {
                window.$voiceRPG.provider.on('onResult', callback);
            }
        }
        
        onError(callback) {
            this.callbacks.onError = callback;
            
            // 如果主系统存在，也设置其回调
            if (window.$voiceRPG && window.$voiceRPG.provider) {
                window.$voiceRPG.provider.on('onError', callback);
            }
        }
        
        onProviderChange(callback) {
            this.callbacks.onProviderChange = callback;
        }
        
        /**
         * 获取提供商信息
         */
        getProviderInfo() {
            return {
                current: 'google',
                available: ['google'],
                type: 'Web Speech API',
                initialized: this.isInitialized
            };
        }
        
        /**
         * 获取当前状态
         */
        getStatus() {
            if (window.$voiceRPG) {
                return {
                    active: window.$voiceRPG.isActive,
                    provider: 'google',
                    initialized: window.$voiceRPG.isInitialized
                };
            }
            
            return {
                active: false,
                provider: 'google',
                initialized: this.isInitialized
            };
        }
    }
    
    // 创建全局实例
    window.VoiceRecognitionAdapter = VoiceRecognitionAdapter;
    window.$voiceAdapter = new VoiceRecognitionAdapter();
    
    // 在适当的时机初始化
    const _Scene_Boot_create = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function() {
        _Scene_Boot_create.call(this);
        
        // 延迟初始化，等待其他系统加载
        if (enableAutoInit) {
            setTimeout(() => {
                if (window.$voiceAdapter && !window.$voiceAdapter.isInitialized) {
                    window.$voiceAdapter.initialize().catch(error => {
                        console.error('[VoiceAdapter] 自动初始化失败:', error);
                    });
                }
            }, 1000);
        }
    };
    
})();
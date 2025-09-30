/**
 * ModuleLoader.js - 模块加载器（清理版）
 * 
 * 功能说明：
 * 1. 动态加载VoiceRPG目录下的模块
 * 2. 管理模块依赖关系
 * 3. 确保加载顺序正确
 * 4. 提供模块注册和获取机制
 * 
 * @author 不想做工-接桀桀
 * @version 1.3.0
 */

class ModuleLoader {
    constructor() {
        // 模块基础路径
        this.basePath = 'js/plugins/VoiceRPG/';
        
        // 已加载的模块
        this.modules = new Map();
        
        // 加载状态
        this.loadingStatus = new Map();
        
        // 模块定义
        this.moduleDefinitions = {
            // 核心模块（优先级1）
            core: [
                { name: 'ConfigManager', path: 'core/ConfigManager.js', priority: 1 },
                { name: 'BaseProvider', path: 'core/BaseProvider.js', priority: 2 }
            ],
            
            // 提供商模块（优先级2）
            providers: [
                { name: 'GoogleProvider', path: 'providers/GoogleProvider.js', priority: 3 }
            ],
            
            // 语音处理模块（优先级3）
            voice: [
                { name: 'CommandSystem', path: 'voice/CommandSystem.js', priority: 4 },
                { name: 'VoiceDebugger', path: 'voice/VoiceDebugger.js', priority: 4 },
                { name: 'ContextManager', path: 'voice/ContextManager.js', priority: 5, optional: true }
            ],
            
            // 游戏集成模块（优先级4）
            game: [
                { name: 'InputBridge', path: 'game/InputBridge.js', priority: 6 },
                { name: 'GameStateMonitor', path: 'game/GameStateMonitor.js', priority: 7, optional: true },
                { name: 'ActionExecutor', path: 'game/ActionExecutor.js', priority: 7, optional: true }
            ],
            
            // UI窗口模块（优先级5）
            ui: [
                { name: 'Window_SpellCasting', path: 'ui/Window_SpellCasting.js', priority: 8 },
                { name: 'Window_SpellResult', path: 'ui/Window_SpellResult.js', priority: 8 }
            ],
            
            // 特色功能模块（优先级6）
            features: [
                { name: 'SpellSystem', path: 'features/SpellSystem.js', priority: 9 },
                { name: 'VolumeAnalyzer', path: 'features/VolumeAnalyzer.js', priority: 9, optional: true },
                { name: 'VoiceCalibration', path: 'features/VoiceCalibration.js', priority: 8 },
                { name: 'SimpleVolumeDetector', path: 'features/SimpleVolumeDetector.js', priority: 8 }
            ]
        };
        
        // 全局错误处理
        this.errorHandler = null;
    }
    
    /**
     * 初始化加载器
     * @param {Object} options - 配置选项
     */
    async initialize(options = {}) {
        console.log('[ModuleLoader] 初始化模块加载器...');
        
        // 设置选项
        if (options.basePath) {
            this.basePath = options.basePath;
        }
        
        if (options.errorHandler) {
            this.errorHandler = options.errorHandler;
        }
        
        // 加载核心模块
        try {
            await this.loadCoreModules();
            console.log('[ModuleLoader] 核心模块加载完成');
            return true;
        } catch (error) {
            this.handleError('初始化失败', error);
            return false;
        }
    }
    
    /**
     * 加载核心模块
     * @private
     */
    async loadCoreModules() {
        const coreModules = this.moduleDefinitions.core;
        
        for (const moduleInfo of coreModules) {
            await this.loadModule(moduleInfo);
        }
    }
    
    /**
     * 加载单个模块
     * @param {Object} moduleInfo - 模块信息
     * @private
     */
    async loadModule(moduleInfo) {
        const { name, path, optional = false } = moduleInfo;
        
        // 检查是否已加载
        if (this.modules.has(name)) {
            console.log(`[ModuleLoader] 模块 ${name} 已加载`);
            return this.modules.get(name);
        }
        
        // 标记为加载中
        this.loadingStatus.set(name, 'loading');
        
        try {
            console.log(`[ModuleLoader] 加载模块: ${name}`);
            
            // 动态加载脚本
            await this.loadScript(this.basePath + path);
            
            // 获取模块实例
            const ModuleClass = window[name];
            
            if (!ModuleClass) {
                throw new Error(`未找到模块类: ${name}`);
            }
            
            // 存储模块类（不实例化）
            this.modules.set(name, ModuleClass);
            this.loadingStatus.set(name, 'loaded');
            
            console.log(`[ModuleLoader] 模块 ${name} 加载成功`);
            return ModuleClass;
            
        } catch (error) {
            this.loadingStatus.set(name, 'error');
            
            if (optional) {
                console.warn(`[ModuleLoader] 可选模块 ${name} 加载失败:`, error.message);
                return null;
            } else {
                throw new Error(`必需模块 ${name} 加载失败: ${error.message}`);
            }
        }
    }
    
    /**
     * 动态加载脚本文件
     * @param {string} src - 脚本路径
     * @private
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载过
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            
            script.onload = () => {
                console.log(`[ModuleLoader] 脚本加载成功: ${src}`);
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error(`脚本加载失败: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载指定类别的所有模块
     * @param {string} category - 模块类别
     * @param {boolean} skipOptional - 是否跳过可选模块
     */
    async loadCategory(category, skipOptional = false) {
        const modules = this.moduleDefinitions[category];
        
        if (!modules) {
            console.warn(`[ModuleLoader] 未知的模块类别: ${category}`);
            return [];
        }
        
        console.log(`[ModuleLoader] 加载 ${category} 类别的模块...`);
        
        const loaded = [];
        for (const moduleInfo of modules) {
            if (skipOptional && moduleInfo.optional) {
                continue;
            }
            
            try {
                const module = await this.loadModule(moduleInfo);
                if (module) {
                    loaded.push(module);
                }
            } catch (error) {
                this.handleError(`加载模块失败: ${moduleInfo.name}`, error);
                if (!moduleInfo.optional) {
                    throw error;
                }
            }
        }
        
        return loaded;
    }
    
    /**
     * 加载所有必需模块
     */
    async loadRequired() {
        console.log('[ModuleLoader] 加载所有必需模块...');
        
        // 按顺序加载各类别
        const categories = ['core', 'providers', 'voice', 'game', 'ui', 'features'];
        
        for (const category of categories) {
            await this.loadCategory(category, true);
        }
        
        console.log('[ModuleLoader] 必需模块加载完成');
    }
    
    /**
     * 加载所有模块（包括可选）
     */
    async loadAll() {
        console.log('[ModuleLoader] 加载所有模块...');
        
        const categories = Object.keys(this.moduleDefinitions);
        
        for (const category of categories) {
            await this.loadCategory(category, false);
        }
        
        console.log('[ModuleLoader] 所有模块加载完成');
    }
    
    /**
     * 获取已加载的模块
     * @param {string} name - 模块名称
     * @returns {*} 模块类或实例
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * 检查模块是否已加载
     * @param {string} name - 模块名称
     * @returns {boolean}
     */
    isLoaded(name) {
        return this.modules.has(name);
    }
    
    /**
     * 获取模块加载状态
     * @param {string} name - 模块名称
     * @returns {string} 加载状态
     */
    getStatus(name) {
        return this.loadingStatus.get(name) || 'not-loaded';
    }
    
    /**
     * 获取所有已加载的模块列表
     * @returns {Array} 模块名称数组
     */
    getLoadedModules() {
        return Array.from(this.modules.keys());
    }
    
    /**
     * 获取加载状态报告
     * @returns {Object} 状态报告
     */
    getStatusReport() {
        const report = {
            loaded: [],
            loading: [],
            error: [],
            notLoaded: []
        };
        
        // 遍历所有定义的模块
        for (const category of Object.values(this.moduleDefinitions)) {
            for (const moduleInfo of category) {
                const status = this.getStatus(moduleInfo.name);
                
                switch (status) {
                    case 'loaded':
                        report.loaded.push(moduleInfo.name);
                        break;
                    case 'loading':
                        report.loading.push(moduleInfo.name);
                        break;
                    case 'error':
                        report.error.push(moduleInfo.name);
                        break;
                    default:
                        report.notLoaded.push(moduleInfo.name);
                }
            }
        }
        
        return report;
    }
    
    /**
     * 重新加载模块
     * @param {string} name - 模块名称
     */
    async reloadModule(name) {
        console.log(`[ModuleLoader] 重新加载模块: ${name}`);
        
        // 移除已加载的模块
        this.modules.delete(name);
        this.loadingStatus.delete(name);
        
        // 查找模块定义
        let moduleInfo = null;
        for (const category of Object.values(this.moduleDefinitions)) {
            moduleInfo = category.find(m => m.name === name);
            if (moduleInfo) break;
        }
        
        if (!moduleInfo) {
            throw new Error(`未找到模块定义: ${name}`);
        }
        
        // 重新加载
        return await this.loadModule(moduleInfo);
    }
    
    /**
     * 错误处理
     * @private
     */
    handleError(message, error) {
        console.error(`[ModuleLoader] ${message}:`, error);
        
        if (this.errorHandler) {
            this.errorHandler(message, error);
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        console.log('[ModuleLoader] 清理资源...');
        
        this.modules.clear();
        this.loadingStatus.clear();
        
        console.log('[ModuleLoader] 资源清理完成');
    }
}

// 创建全局实例
window.$moduleLoader = new ModuleLoader();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleLoader;
} else {
    window.ModuleLoader = ModuleLoader;
}
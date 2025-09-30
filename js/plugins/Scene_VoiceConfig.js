/*:
 * @target MZ
 * @plugindesc Voice Config Scene v2.4.0 - Web Speech API 版（含音量校准）
 * @author 不想做工-接桀桀
 * @help
 * ============================================================================
 * 语音配置场景插件 - Web Speech API 版
 * ============================================================================
 * 
 * 更新内容 v2.4.0：
 * 1. 简化为单一 Web Speech API 支持
 * 2. 移除语音服务选择器
 * 3. 移除地区检测功能
 * 
 * 功能：
 * - 麦克风选择和测试（带耳返）
 * - 扬声器/耳机选择
 * - 音量校准系统
 * 
 * @param showOnFirstStart
 * @text 首次启动时显示
 * @desc 游戏首次启动时是否自动显示配置界面
 * @type boolean
 * @default true
 * 
 * @param enableEarback
 * @text 默认开启耳返
 * @desc 测试麦克风时是否默认开启耳返
 * @type boolean
 * @default true
 * 
 * @param earbackVolume
 * @text 耳返音量
 * @desc 耳返效果的音量大小（0-100）
 * @type number
 * @min 0
 * @max 100
 * @default 70
 */
if (!Window_Base.prototype.standardFontSize) {
    Window_Base.prototype.standardFontSize = function() {
        return $gameSystem.mainFontSize();
    };
}

(() => {
    'use strict';
    
    const pluginName = 'Scene_VoiceConfig';
    const parameters = PluginManager.parameters(pluginName);
    const showOnFirstStart = parameters['showOnFirstStart'] === 'true';
    const enableEarback = parameters['enableEarback'] !== 'false';
    const earbackVolume = Number(parameters['earbackVolume'] || 70) / 100;
    
    // 语音配置场景
    class Scene_VoiceConfig extends Scene_Base {
        create() {
            super.create();
            this.createBackground();
            this.createWindowLayer();
            this.createAllWindows();
            this.loadCurrentConfig();
            this.detectAudioDevices();
        }
        
        createBackground() {
            this._backgroundSprite = new Sprite();
            this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
            this.addChild(this._backgroundSprite);
        }
        
        createAllWindows() {
            const width = 650;
            const height = 360;
            const x = (Graphics.width - width) / 2;
            const y = (Graphics.height - height) / 2;

            // 确保音量校准系统已初始化
            if (!window.$voiceCalibration) {
                if (window.$moduleLoader) {
                    const VoiceCalibrationClass = window.$moduleLoader.getModule('VoiceCalibration');
                    if (VoiceCalibrationClass) {
                        window.$voiceCalibration = new VoiceCalibrationClass();
                    }
                }
                
                if (!window.$voiceCalibration) {
                    window.$voiceCalibration = {
                        isCalibrated: () => false,
                        getCalibrationInfo: () => ({ calibrated: false })
                    };
                }
            }

            // 标题窗口
            this._titleWindow = new Window_Base(new Rectangle(x, y - 80, width, 60));
            this._titleWindow.drawText('🎤 语音控制配置', 0, 0, width - 32, 'center');
            this.addWindow(this._titleWindow);
            
            // 配置窗口
            this._configWindow = new Window_VoiceConfig(new Rectangle(x, y - 20, width, height));
            this._configWindow.setHandler('ok', this.onConfigOk.bind(this));
            this._configWindow.setHandler('cancel', this.onConfigCancel.bind(this));
            this._configWindow.setHandler('test', this.onTestMicrophone.bind(this));
            this._configWindow.setHandler('calibrate', this.onCalibrate.bind(this));
            this._configWindow.activate();
            this.addWindow(this._configWindow);
            
            // 帮助窗口
            const helpHeight = 60;
            const helpY = y + height - 20;
            const helpRect = new Rectangle(x, helpY, width, helpHeight);
            this._helpWindow = new Window_Help(helpRect);
            this._configWindow.setHelpWindow(this._helpWindow);
            this.addWindow(this._helpWindow);
        }
        
        loadCurrentConfig() {
            if (window.$voiceConfig) {
                const config = window.$voiceConfig.get('recognition');
                const audioConfig = window.$voiceConfig.get('audio');
                if (config || audioConfig) {
                    this._configWindow.setCurrentConfig({
                        ...config,
                        ...audioConfig
                    });
                }
            }
        }
        
        async detectAudioDevices() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
                
                this._configWindow.setAudioDevices(audioInputs, audioOutputs);
                stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('音频设备访问失败:', error);
                this._configWindow.setDeviceError();
            }
        }
        
        onTestMicrophone() {
            this._configWindow.startMicrophoneTest();
        }
        
        onCalibrate() {
            console.log('[VoiceConfig] 打开音量校准');
    
            if (!window.$voiceCalibration) {
                const script = document.createElement('script');
                script.src = 'js/plugins/VoiceRPG/features/VoiceCalibration.js';
                script.onload = () => {
                    if (window.VoiceCalibration) {
                        window.$voiceCalibration = new window.VoiceCalibration();
                        console.log('[VoiceConfig] VoiceCalibration 已手动加载');
                        
                        if (window.Scene_VoiceCalibration) {
                            SceneManager.push(Scene_VoiceCalibration);
                        } else {
                            const sceneScript = document.createElement('script');
                            sceneScript.src = 'js/plugins/Scene_VoiceCalibration.js';
                            sceneScript.onload = () => {
                                if (window.Scene_VoiceCalibration) {
                                    SceneManager.push(Scene_VoiceCalibration);
                                } else {
                                    console.error('[VoiceConfig] Scene_VoiceCalibration 加载失败');
                                    $gameMessage.add('\\C[2]音量校准场景加载失败');
                                }
                            };
                            sceneScript.onerror = () => {
                                console.error('[VoiceConfig] 无法加载 Scene_VoiceCalibration.js');
                                $gameMessage.add('\\C[2]音量校准场景文件未找到');
                            };
                            document.head.appendChild(sceneScript);
                        }
                    } else {
                        console.error('[VoiceConfig] VoiceCalibration 类未定义');
                        $gameMessage.add('\\C[2]音量校准功能加载失败');
                    }
                };
                script.onerror = () => {
                    console.error('[VoiceConfig] 无法加载 VoiceCalibration.js');
                    $gameMessage.add('\\C[2]音量校准功能文件未找到');
                };
                document.head.appendChild(script);
            } else if (window.Scene_VoiceCalibration) {
                SceneManager.push(Scene_VoiceCalibration);
            } else {
                const sceneScript = document.createElement('script');
                sceneScript.src = 'js/plugins/Scene_VoiceCalibration.js';
                sceneScript.onload = () => {
                    if (window.Scene_VoiceCalibration) {
                        SceneManager.push(Scene_VoiceCalibration);
                    } else {
                        console.error('[VoiceConfig] Scene_VoiceCalibration 加载失败');
                        $gameMessage.add('\\C[2]音量校准场景加载失败');
                    }
                };
                sceneScript.onerror = () => {
                    console.error('[VoiceConfig] 无法加载 Scene_VoiceCalibration.js');
                    $gameMessage.add('\\C[2]音量校准场景文件未找到');
                };
                document.head.appendChild(sceneScript);
            }
        }
        
        async onConfigOk() {
            try {
                const config = this._configWindow.getConfig();
                console.log('[VoiceConfig] 保存配置:', config);
                
                // 使用新的ConfigManager保存配置
                if (window.$voiceConfig) {
                    window.$voiceConfig.update({
                        recognition: {
                            provider: 'google',
                            microphoneId: config.microphoneId
                        },
                        audio: {
                            outputDeviceId: config.outputDeviceId,
                            enableEarback: config.enableEarback,
                            earbackVolume: config.earbackVolume
                        }
                    });
                    console.log('[VoiceConfig] 已保存到新配置系统');
                }
                
                // 更新主系统
                if (window.$voiceRPG && window.$voiceRPG.isInitialized) {
                    console.log('[VoiceConfig] 更新主系统配置');
                    window.$voiceRPG.config.defaultProvider = 'google';
                    
                    if (window.$voiceRPG.debugger) {
                        window.$voiceRPG.debugger.updateServiceStatus('已连接 - Web Speech API', '#4CAF50');
                    }
                }
                
                // 保存到RPG Maker的配置
                if (ConfigManager) {
                    ConfigManager.voiceConfig = config;
                    setTimeout(() => {
                        try {
                            ConfigManager.save();
                            console.log('[VoiceConfig] 已保存到RPG Maker配置');
                        } catch (e) {
                            console.error('[VoiceConfig] RPG Maker配置保存失败:', e);
                        }
                    }, 100);
                }
                
                if ($gameMessage) {
                    $gameMessage.add('\\C[3]语音配置已保存');
                }
                
                this.popScene();
                
            } catch (error) {
                console.error('[VoiceConfig] 保存配置时出错:', error);
                alert('保存配置时出错：' + error.message);
                this.popScene();
            }
        }
        
        onConfigCancel() {
            console.log('[VoiceConfig] 取消配置');
            this.popScene();
        }
        
        popScene() {
            if (SceneManager._stack.length > 0) {
                SceneManager.pop();
            } else {
                SceneManager.goto(Scene_Title);
            }
        }
        
        update() {
            super.update();
            
            if (Input.isTriggered('cancel')) {
                this.onConfigCancel();
            }
        }
    }
    
    // 配置窗口 - 简化版
    class Window_VoiceConfig extends Window_Selectable {
        constructor(rect) {
            super(rect);
            this._microphones = [];
            this._speakers = [];
            this._selectedMic = 0;
            this._selectedSpeaker = 0;
            this._isTesting = false;
            this._testVolume = 0;
            
            // 音频测试相关
            this._testStream = null;
            this._audioContext = null;
            this._analyser = null;
            this._gainNode = null;
            this._enableEarback = enableEarback;
            this._earbackVolume = earbackVolume;
            
            this.refresh();
            this.select(0);
        }
        
        maxItems() {
            return 6; // 麦克风、扬声器、耳返开关、音量校准、测试按钮、确定按钮
        }
        
        itemHeight() {
            return 54;
        }
        
        setCurrentConfig(config) {
            if (config.microphoneId) {
                this._preferredMicId = config.microphoneId;
            }
            if (config.outputDeviceId) {
                this._preferredSpeakerId = config.outputDeviceId;
            }
            if (config.enableEarback !== undefined) {
                this._enableEarback = config.enableEarback;
            }
            if (config.earbackVolume !== undefined) {
                this._earbackVolume = config.earbackVolume;
            }
            this.refresh();
        }
        
        setAudioDevices(inputDevices, outputDevices) {
            this._microphones = inputDevices.map((device, index) => ({
                id: device.deviceId,
                label: device.label || `麦克风 ${index + 1}`
            }));
            
            this._speakers = outputDevices.map((device, index) => ({
                id: device.deviceId,
                label: device.label || `扬声器 ${index + 1}`
            }));
            
            if (this._speakers.length === 0) {
                this._speakers.push({
                    id: 'default',
                    label: '默认扬声器'
                });
            }
            
            if (this._preferredMicId) {
                const index = this._microphones.findIndex(m => m.id === this._preferredMicId);
                if (index >= 0) {
                    this._selectedMic = index;
                }
            }
            
            if (this._preferredSpeakerId) {
                const index = this._speakers.findIndex(s => s.id === this._preferredSpeakerId);
                if (index >= 0) {
                    this._selectedSpeaker = index;
                }
            }
            
            this.refresh();
        }
        
        setDeviceError() {
            this._deviceError = true;
            this.refresh();
        }
        
        drawItem(index) {
            const rect = this.itemLineRect(index);
            this.contents.clearRect(rect.x, rect.y, rect.width, rect.height);
            
            switch (index) {
                case 0:
                    this.drawMicrophoneSelection(rect);
                    break;
                case 1:
                    this.drawSpeakerSelection(rect);
                    break;
                case 2:
                    this.drawEarbackToggle(rect);
                    break;
                case 3:
                    this.drawCalibrationButton(rect);
                    break;
                case 4:
                    this.drawTestButton(rect);
                    break;
                case 5:
                    this.drawOkButton(rect);
                    break;
            }
        }
        
        drawMicrophoneSelection(rect) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText('🎤 输入设备:', rect.x, rect.y, 140);
            
            this.changeTextColor(ColorManager.normalColor());
            if (this._deviceError) {
                this.changeTextColor(ColorManager.deathColor());
                this.drawText('无法访问麦克风', rect.x + 150, rect.y, rect.width - 150);
            } else if (this._microphones.length > 0) {
                const mic = this._microphones[this._selectedMic];
                this.drawText(mic.label, rect.x + 150, rect.y, rect.width - 150);
            } else {
                this.changeTextColor(ColorManager.textColor(8));
                this.drawText('检测中...', rect.x + 150, rect.y, rect.width - 150);
            }
        }
        
        drawSpeakerSelection(rect) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText('🔊 输出设备:', rect.x, rect.y, 140);
            
            this.changeTextColor(ColorManager.normalColor());
            if (this._speakers.length > 0) {
                const speaker = this._speakers[this._selectedSpeaker];
                this.drawText(speaker.label, rect.x + 150, rect.y, rect.width - 150);
            } else {
                this.changeTextColor(ColorManager.textColor(8));
                this.drawText('检测中...', rect.x + 150, rect.y, rect.width - 150);
            }
        }
        
        drawEarbackToggle(rect) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText('🎧 耳返效果:', rect.x, rect.y, 140);
            
            this.changeTextColor(this._enableEarback ? ColorManager.powerUpColor() : ColorManager.normalColor());
            this.drawText(this._enableEarback ? '开启' : '关闭', rect.x + 150, rect.y, 100);
            
            if (this._enableEarback) {
                this.changeTextColor(ColorManager.textColor(8));
                this.drawText(`音量: ${Math.round(this._earbackVolume * 100)}%`, rect.x + 260, rect.y, 150);
            }
        }
        
        drawCalibrationButton(rect) {
            const width = 200;
            const x = rect.x + (rect.width - width) / 2;
            
            this.changeTextColor(ColorManager.systemColor());
            this.drawText('🎯 音量校准', x, rect.y, width, 'center');
            
            const originalFontSize = this.contents.fontSize;

            const isCalibrated = window.$voiceCalibration && 
                                typeof window.$voiceCalibration.isCalibrated === 'function' && 
                                window.$voiceCalibration.isCalibrated();
            
            if (isCalibrated) {
                this.contents.fontSize = 14;
                this.changeTextColor(ColorManager.textColor(3));
                this.drawText('已校准', x, rect.y + 25, width, 'center');
                this.contents.fontSize = originalFontSize;
            } else {
                this.contents.fontSize = 14;
                this.changeTextColor(ColorManager.textColor(8));
                this.drawText('未校准', x, rect.y + 25, width, 'center');
                this.contents.fontSize = originalFontSize;
            }
        }
        
        drawTestButton(rect) {
            const width = 200;
            const x = rect.x + (rect.width - width) / 2;
            
            if (this._isTesting) {
                this.changeTextColor(ColorManager.crisisColor());
                this.drawText('🔴 测试中...', x, rect.y, width, 'center');
                
                const barY = rect.y + 30;
                const barWidth = rect.width - 80;
                const barHeight = 8;
                const barX = rect.x + 40;
                
                this.contents.fillRect(barX, barY, barWidth, barHeight, ColorManager.gaugeBackColor());
                const fillWidth = barWidth * this._testVolume;
                this.contents.fillRect(barX, barY, fillWidth, barHeight, ColorManager.powerUpColor());
            } else {
                this.changeTextColor(ColorManager.normalColor());
                this.drawText('🎤 测试麦克风', x, rect.y, width, 'center');
            }
        }
        
        drawOkButton(rect) {
            const width = 120;
            const x = rect.x + (rect.width - width) / 2;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText('确定', x, rect.y, width, 'center');
        }
        
        updateHelp() {
            const helps = [
                '选择要使用的麦克风设备',
                '选择音频输出设备（扬声器/耳机）',
                '开启后，测试时可以听到自己的声音',
                '校准您的音量范围，获得更好的咒语伤害判定',
                '测试麦克风是否正常工作，开启耳返可听到自己声音',
                '保存配置并返回游戏'
            ];
            this._helpWindow.setText(helps[this.index()] || '');
        }
        
        processOk() {
            console.log('[VoiceConfig] processOk - 当前选项:', this.index());
            
            switch (this.index()) {
                case 0:
                    if (this._microphones.length > 0) {
                        this._selectedMic = (this._selectedMic + 1) % this._microphones.length;
                        this.refresh();
                        this.playCursorSound();
                    }
                    break;
                case 1:
                    if (this._speakers.length > 0) {
                        this._selectedSpeaker = (this._selectedSpeaker + 1) % this._speakers.length;
                        this.refresh();
                        this.playCursorSound();
                    }
                    break;
                case 2:
                    this._enableEarback = !this._enableEarback;
                    this.refresh();
                    this.playCursorSound();
                    break;
                case 3:
                    console.log('[VoiceConfig] 触发音量校准');
                    this.playOkSound();
                    this.callHandler('calibrate');
                    break;
                case 4:
                    console.log('[VoiceConfig] 触发测试麦克风');
                    this.playOkSound();
                    this.callHandler('test');
                    break;
                case 5:
                    console.log('[VoiceConfig] 触发确定按钮');
                    this.playOkSound();
                    this.deactivate();
                    this.callHandler('ok');
                    break;
            }
        }
        
        cursorLeft() {
            if (this.index() === 2) {
                this._earbackVolume = Math.max(0, this._earbackVolume - 0.1);
                this.refresh();
                this.playCursorSound();
            } else {
                super.cursorLeft();
            }
        }
        
        cursorRight() {
            if (this.index() === 2) {
                this._earbackVolume = Math.min(1, this._earbackVolume + 0.1);
                this.refresh();
                this.playCursorSound();
            } else {
                super.cursorRight();
            }
        }
        
        startMicrophoneTest() {
            if (this._isTesting || this._microphones.length === 0) return;
            
            this._isTesting = true;
            this._testVolume = 0;
            this.refresh();
            
            navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    deviceId: this._microphones[this._selectedMic].id,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            }).then(stream => {
                this._testStream = stream;
                
                this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this._analyser = this._audioContext.createAnalyser();
                const microphone = this._audioContext.createMediaStreamSource(stream);
                const processor = this._audioContext.createScriptProcessor(2048, 1, 1);
                
                this._analyser.smoothingTimeConstant = 0.8;
                this._analyser.fftSize = 1024;
                
                microphone.connect(this._analyser);
                this._analyser.connect(processor);
                processor.connect(this._audioContext.destination);
                
                if (this._enableEarback) {
                    this._gainNode = this._audioContext.createGain();
                    this._gainNode.gain.value = this._earbackVolume;
                    
                    microphone.connect(this._gainNode);
                    
                    if (this._audioContext.setSinkId && this._speakers[this._selectedSpeaker]) {
                        this._audioContext.setSinkId(this._speakers[this._selectedSpeaker].id)
                            .then(() => {
                                console.log('[VoiceConfig] 输出设备已设置');
                            })
                            .catch(error => {
                                console.error('[VoiceConfig] 设置输出设备失败:', error);
                            });
                    }
                    
                    this._gainNode.connect(this._audioContext.destination);
                }
                
                processor.onaudioprocess = () => {
                    if (!this._isTesting) return;
                    
                    const array = new Uint8Array(this._analyser.frequencyBinCount);
                    this._analyser.getByteFrequencyData(array);
                    const average = array.reduce((a, b) => a + b) / array.length;
                    this._testVolume = average / 255;
                    this.refresh();
                };
                
                setTimeout(() => {
                    this.stopMicrophoneTest();
                }, 3000);
            }).catch(error => {
                console.error('麦克风测试失败:', error);
                this._isTesting = false;
                this.refresh();
                alert('麦克风测试失败：' + error.message);
            });
        }
        
        stopMicrophoneTest() {
            this._isTesting = false;
            
            if (this._testStream) {
                this._testStream.getTracks().forEach(track => track.stop());
                this._testStream = null;
            }
            
            if (this._gainNode) {
                this._gainNode.disconnect();
                this._gainNode = null;
            }
            
            if (this._audioContext) {
                this._audioContext.close();
                this._audioContext = null;
            }
            
            this._analyser = null;
            this.refresh();
        }
        
        getConfig() {
            const config = {
                microphoneId: this._microphones[this._selectedMic]?.id || 'default',
                outputDeviceId: this._speakers[this._selectedSpeaker]?.id || 'default',
                enableEarback: this._enableEarback,
                earbackVolume: this._earbackVolume
            };
            
            console.log('[VoiceConfig] 生成配置:', config);
            return config;
        }
        
        terminate() {
            this.stopMicrophoneTest();
            super.terminate();
        }
    }
    
    window.Scene_VoiceConfig = Scene_VoiceConfig;
    
    const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        _Scene_Title_createCommandWindow.call(this);
        if (this._commandWindow) {
            this._commandWindow.setHandler('voiceConfig', this.commandVoiceConfig.bind(this));
        }
    };
    
    Scene_Title.prototype.commandVoiceConfig = function() {
        this._commandWindow.close();
        SceneManager.push(Scene_VoiceConfig);
    };
    
    const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function() {
        _Window_TitleCommand_makeCommandList.call(this);
        this.addCommand('语音设置', 'voiceConfig');
    };
    
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        
        setTimeout(() => {
            if (showOnFirstStart) {
                let hasConfig = false;
                
                if (window.$voiceConfig) {
                    hasConfig = !!window.$voiceConfig.get('recognition.provider');
                }
                
                if (!hasConfig && !ConfigManager.voiceConfig) {
                    SceneManager.goto(Scene_VoiceConfig);
                }
            }
        }, 100);
    };
    
})();
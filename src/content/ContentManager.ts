import { ChromeEventEmitter } from '../common/events/ChromeEventEmitter';
import { TabConnectEventName, CommunicationTimeout } from '../common/Consts';
import { IChangeData } from '../common/data/IChangeData';
import { Popup, Content } from '../common/events/Events';
import { ExtensionStateManager } from '../common/ExtensionStateManager';
import { WebEventEmitter } from '../common/events/WebEventEmitter';
import { promiseTimeout } from '../common/PromiseTimeout';
import { IExtensionSettings } from '../common/data/IExtensionSettings';
import { Logger } from '../common/Logger';

/**
 * Communicates with background page with port, injects page scripts and communicate with page using postMessage
 */
export class ContentManager {

    private scriptsInjected = false;
    private backgroundPipe: ChromeEventEmitter;
    private pagePipe: WebEventEmitter;
    private columnFormatterSchema: any;
    private viewFormatterSchema: any;
    private schemaRequstTimeout = 1 * 1000;

    constructor() {
        const port = chrome.runtime.connect(null, { name: TabConnectEventName });
        this.backgroundPipe = new ChromeEventEmitter(port);
        this.pagePipe = WebEventEmitter.instance;

        this.backgroundPipe.on<IChangeData>(Popup.onChangeEnabled, async (data) => {
            await this.initInjectScripts(data.enabled);
            this.pagePipe.emit(Popup.onChangeEnabled, data);
        });

        this.pagePipe.on(Content.onGetExtensionSettings, async () => {
            const settings = await ExtensionStateManager.getExtensionSettings();
            this.pagePipe.emit(Content.onSendExtensionSettings, settings);
        });

        this.pagePipe.on<IExtensionSettings>(Content.onSaveExtensionSettings, async (settings) => {
            await ExtensionStateManager.setExtensionSettings(settings);
            this.pagePipe.emit(Content.onSavedExtensionSettings, {});
        });

        this.pagePipe.on(Content.onGetColumnFormattingSchema, () => {
            this.pagePipe.emit(Content.onSendColumnFormattingSchema, this.columnFormatterSchema);
        });

        this.pagePipe.on(Content.onGetViewFormattingSchema, () => {
            this.pagePipe.emit(Content.onSendViewFormattingSchema, this.viewFormatterSchema);
        });
    }

    public async init(): Promise<void> {
        const tabId = await this.getCurrentTabId();
        const isEnabledForCurrentTab = await ExtensionStateManager.isEnabledForTab(tabId);
        this.columnFormatterSchema = await this.getColumnFormattingSchema();
        this.viewFormatterSchema = await this.getViewFormattingSchema();

        await this.initInjectScripts(isEnabledForCurrentTab);

        this.pagePipe.emit(Popup.onChangeEnabled, {
            enabled: isEnabledForCurrentTab
        });
    }

    private async getCurrentTabId(): Promise<number> {
        const promise = new Promise(async (resolve) => {

            const onRecievedCallback = (data) => {
                resolve(data.tabId);
                this.backgroundPipe.off(Content.onSendTabId, onRecievedCallback);
            };

            this.backgroundPipe.on(Content.onSendTabId, onRecievedCallback);
            this.backgroundPipe.emit(Content.onGetTabId, {});
        });

        return promiseTimeout(CommunicationTimeout, promise);
    }

    private async getColumnFormattingSchema(): Promise<any> {
        const promise = new Promise(async (resolve) => {

            const onRecievedCallback = (data) => {
                Logger.log('ContentManager.getColumnFormattingSchema: onRecievedCallback');
                resolve(data);
                this.backgroundPipe.off(Content.onSendColumnFormattingSchema, onRecievedCallback);
            };

            this.backgroundPipe.on(Content.onSendColumnFormattingSchema, onRecievedCallback);
            this.backgroundPipe.emit(Content.onGetColumnFormattingSchema, {});
        });

        Logger.log('ContentManager.getColumnFormattingSchema');

        return promiseTimeout(this.schemaRequstTimeout, promise);
    }

    private async getViewFormattingSchema(): Promise<any> {
        const promise = new Promise(async (resolve) => {

            const onRecievedCallback = (data) => {
                Logger.log('ContentManager.getViewFormattingSchema: onRecievedCallback');
                resolve(data);
                this.backgroundPipe.off(Content.onSendViewFormattingSchema, onRecievedCallback);
            };

            this.backgroundPipe.on(Content.onSendViewFormattingSchema, onRecievedCallback);
            this.backgroundPipe.emit(Content.onGetViewFormattingSchema, {});
        });
        Logger.log('ContentManager.getViewFormattingSchema');
        return promiseTimeout(this.schemaRequstTimeout, promise);
    }

    private async initInjectScripts(enable: boolean): Promise<void> {
        if (!this.scriptsInjected && enable) {
            this.scriptsInjected = true;

            await this.injectScripts();
        }
    }

    private injectScript(code): void {
        const scriptElement = document.createElement('script');
        scriptElement.textContent = code;
        (document.head || document.documentElement).appendChild(scriptElement);
        scriptElement.remove();
    }

    private async injectScripts(): Promise<void> {
        const id = chrome.runtime.id;
        this.injectScript(`window.__sp_formatter_id__ = '${id}'`);
        await this.injectScriptFile('dist/monaco-build.js');
        await this.injectScriptFile('dist/inject.js');
    }

    private injectScriptFile(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const scriptTag = document.createElement('script');
            scriptTag.src = src.startsWith('http') ? src : chrome.runtime.getURL(src);

            scriptTag.onload = () => {
                resolve();
            };

            (document.head || document.documentElement).appendChild(scriptTag);
        });
    }
}

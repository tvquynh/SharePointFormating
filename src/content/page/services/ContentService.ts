import { WebEventEmitter } from '../../../common/events/WebEventEmitter';
import { Content } from '../../../common/events/Events';
import { IExtensionSettings } from '../../../common/data/IExtensionSettings';
import { promiseTimeout } from '../../../common/PromiseTimeout';
import { CommunicationTimeout } from '../../../common/Consts';

export class ContentService {
    private pagePipe = WebEventEmitter.instance;

    public async getExtensionSettings(): Promise<IExtensionSettings> {

        const promise = new Promise((resolve) => {
            const getData = data => {
                this.pagePipe.off(Content.onSendExtensionSettings, getData);
                resolve(data);
            };

            this.pagePipe.on<IExtensionSettings>(Content.onSendExtensionSettings, getData);
            this.pagePipe.emit(Content.onGetExtensionSettings, {});
        });

        return promiseTimeout(CommunicationTimeout, promise);
    }

    public async saveExtensionSettings(settings: IExtensionSettings): Promise<void> {

        const promise = new Promise((resolve) => {
            const getData = data => {
                this.pagePipe.off(Content.onSavedExtensionSettings, getData);
                resolve(data);
            };

            this.pagePipe.on<IExtensionSettings>(Content.onSavedExtensionSettings, getData);
            this.pagePipe.emit(Content.onSaveExtensionSettings, settings);
        });

        return promiseTimeout(CommunicationTimeout, promise);
    }

    public async getColumnFormatterSchema(): Promise<any> {
        const promise = new Promise((resolve) => {
            const getData = data => {
                this.pagePipe.off(Content.onSendColumnFormattingSchema, getData);
                resolve(data);
            };

            this.pagePipe.on<IExtensionSettings>(Content.onSendColumnFormattingSchema, getData);
            this.pagePipe.emit(Content.onGetColumnFormattingSchema, {});
        });

        return promiseTimeout(CommunicationTimeout, promise);
    }
}
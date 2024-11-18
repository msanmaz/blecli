// src/models/BLEDevice.js
import { BLE_CONFIG } from "../config/constants.js";
import { logger } from "../utils/logger.js";

export class BLEDevice {
    #peripheral;
    #rxChar;
    #txChar;
    #coalescer;
    #notificationHandlers = new Set();

    constructor(peripheral, coalescer) {
        this.#peripheral = peripheral;
        this.#coalescer = coalescer;
        this.name = peripheral.advertisement.localName;
    }

    async connect() {
        return this.#coalescer.connection.coalesce(`connect-${this.#peripheral.id}`, async () => {
            await this.#peripheral.connectAsync();
            await this.#discoverCharacteristics();
            return this;
        });
    }

    async #discoverCharacteristics() {
        const services = await this.#peripheral.discoverServicesAsync([BLE_CONFIG.UUIDS.SERVICE]);
        const chars = await services[0].discoverCharacteristicsAsync(
            [BLE_CONFIG.UUIDS.RX, BLE_CONFIG.UUIDS.TX]
        );
        
        chars.forEach(char => {
            const uuid = char.uuid.replace(/-/g, '');
            if (uuid === BLE_CONFIG.UUIDS.RX.replace(/-/g, '')) this.#rxChar = char;
            if (uuid === BLE_CONFIG.UUIDS.TX.replace(/-/g, '')) this.#txChar = char;
        });

        await this.#txChar.subscribeAsync();
    }

    async sendCommand(command) {
        return this.#coalescer.command.coalesce(`cmd-${command}`, async () => {
            logger.debug('BLE', `Sending command: ${command}`);
            try {
                await this.#rxChar.writeAsync(Buffer.from(command), false);
            } catch (error) {
                logger.error('BLE', `Command error: ${error.message}`);
                throw error;
            }
        });
    }

    onNotification(callback) {
        const wrappedCallback = (data) => {
            const response = data.toString();
            if (response.length < 150) {
                // Log only once at device level
                logger.info('Response', '--------------------------------------------');
                logger.info('Response', response);
                logger.info('Response', '--------------------------------------------');
            }
            callback(data);
        };
        this.#notificationHandlers.add(wrappedCallback);
        this.#txChar.on('data', wrappedCallback);
    }

    removeNotificationListener(callback) {
        this.#notificationHandlers.forEach(handler => {
            this.#txChar.removeListener('data', handler);
        });
        this.#notificationHandlers.clear();
    }
}
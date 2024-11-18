import { BLE_CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export class MemoryManager {
    #device;
    #fileNumber = null;
    #notificationHandler;

    constructor(device) {
        this.#device = device;
    }

    async writeCommands(side) {
        this.#fileNumber = Math.floor(Math.random() * 100000);
        const timestamp = this.#getCurrentTimestamp();
        
        try {
             // Set up notification handler
             this.#setupNotificationHandler();
            logger.info('Memory', `Starting memory commands for ${side}`);
            await this.#sendInitialCommands(timestamp, side);
            await this.#sendMetaData(side);
            this.#removeNotificationHandler();
            logger.info('Memory', 'Commands completed successfully');
            return this.#fileNumber;
        } catch (error) {
            logger.info('Memory', `Error: ${error.message}`, 'error');
            throw error;
        }
    }

    #getCurrentTimestamp() {
        return new Date().toISOString()
            .replace(/[^0-9]/g, '')
            .slice(0, 14);
    }

    async #sendInitialCommands(timestamp, side) {
        logger.info('Memory', 'Initializing device settings...');
        const suffix = side === 'Left' ? 'L' : 'R';
        
        const commands = [
            { cmd: `ftime=${timestamp}`, desc: 'Setting timestamp' },
            { cmd: 'ftimu', desc: 'Initializing IMU' },
            { cmd: `fname=${this.#fileNumber}${suffix}`, desc: 'Setting filename' },
            { cmd: 'fmeto', desc: 'Opening metadata' }
        ];
    
        for (const {cmd, desc} of commands) {
            logger.info('Memory', `${desc}...`);
            await this.#device.sendCommand(cmd);
        }
    }

    async #sendMetaData(side) {
        const metaData = this.#createMetaData(side);
        const chunks = JSON.stringify(metaData)
            .match(/.{1,120}/g) || [];

        if (chunks.length > 0) {
            await this.#device.sendCommand(`fmeta=${chunks[0]}`);
        }

        for (let i = 1; i < chunks.length; i++) {
            await this.#device.sendCommand('fmetw');
            await this.#device.sendCommand(`fmeta=${chunks[i]}`);
        }

        await this.#device.sendCommand('fmetw');
        await this.#device.sendCommand('fmetc');
    }

    #createMetaData(side) {
        return {
            Bilateral: 1,
            Session: {
                calibrationSession: true,
                leftSockSerialNum: "D4LB4002",
                rightSockSerialNum: "D4RB4005",
                leftSockIdentifier: "Danusport12151",
                rightSockIdentifier: "Danusport12171",
                leftSockname: "Danusport12151",
                rightSockname: "Danusport12171",
                foot: side.toLowerCase(),
                samplingRate: 250,
                weight: 80,
                playerid: 402,
                activity: 0,
                calibrationSessionID: 0,
                mTS: new Date().toISOString().slice(0, -5) + "Z",
                leftSockCap: [2896, 2425, 3870, 2853, 2151, 3430, 4248, 3921, 3349, 6251, 826, 2783, 4738, 4599, 5543, 2715],
                rightSockCap: [2957, 6128, 5080, 5264, 3099, 926, 6832, 3689, 4443, 4480, 3799, 2342, 3177, 4277, 2708, 3237]
            }
        };
    }

    getFileNumber() {
        return this.#fileNumber;
    }

    async cleanup(side) {
        const suffix = side === 'Left' ? 'L' : 'R';
        await this.#device.sendCommand(`fname=${this.#fileNumber}${suffix}`);
        await this.#device.sendCommand('fdeld');
        await this.#device.sendCommand('fdelm');
    }

    #setupNotificationHandler() {
        const notificationHandler = (data) => {
            const response = data.toString();
            if (response.length < 150) {
                if (response.endsWith('!')) {
                    const command = response.replace('!', '');
                    logger.info('Memory', `Command completed: ${command}`);
                }
            }
        };
        this.#device.onNotification(notificationHandler);
    }


    #removeNotificationHandler() {
        if (this.#notificationHandler) {
            this.#device.removeNotificationListener();
            this.#notificationHandler = null;
        }
    }
}
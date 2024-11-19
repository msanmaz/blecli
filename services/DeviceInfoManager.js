import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export class DeviceInfoManager extends EventEmitter {
    #device;
    #firmwareVersion = null;
    #batteryLevel = null;
    #initialBatteryLevel = null;

    constructor(device) {
        super();
        this.#device = device;
    }


    updateBatteryLevel(level) {
        if (this.#initialBatteryLevel === null) {
            this.#initialBatteryLevel = level;
            this.emit('initialBattery', level);
        }
        this.#batteryLevel = level;
        this.emit('batteryUpdate', level);
        
        if (level <= 3) {
            this.emit('lowBattery', level);
        }
    }

    get firmwareVersion() {
        return this.#firmwareVersion;
    }


    set firmwareVersion(fw){
        this.#firmwareVersion = fw
    }

    get batteryLevel() {
        return this.#batteryLevel;
    }

    get initialBatteryLevel() {
        return this.#initialBatteryLevel;
    }
}
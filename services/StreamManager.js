import { BLE_CONFIG } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { MemoryManager } from "./MemoryManager.js";
import { StreamStats } from "./StreamStats.js";

export class StreamManager {
    #device;
    #memoryManager;
    #stats;
    #side;
    #isStreaming = false;
    #intervals = { stats: null, battery: null };

    constructor(device) {
        this.#device = device;
        this.#memoryManager = new MemoryManager(device);
        this.#stats = new StreamStats();
        logger.setLogLevel('debug');
    }

    async startStream(side) {
        if (!this.#memoryManager.getFileNumber()) {
            throw new Error('Run memory commands first');
        }

        this.#side = side;
        this.#isStreaming = true;
        this.#stats.reset();
        
        logger.info('Stream', `Starting stream for ${side} side`);
        this.#device.onNotification(this.#handleNotification.bind(this));
        await this.#device.sendCommand('batlv?');
        await this.#device.sendCommand('ssstr');
        this.#startMonitoring();
    }


    #handleNotification(data) {
        const response = data.toString();
        if (!response.includes('XXX[')) {
            if (response.startsWith('batlv=')) {
                const level = parseInt(response.split('=')[1]);
                this.#stats.updateBattery(level);
            }
        } else if (this.#isStreaming) {
            this.#stats.incrementPackets();
        }
    }

    
    #startMonitoring() {
        // Clear screen once before starting stats display
        process.stdout.write('\x1B[2J\x1B[H');
        
        this.#intervals.battery = setInterval(() => {
            this.#device.sendCommand('batlv?');
        }, BLE_CONFIG.TIMEOUTS.BATTERY_CHECK);

        this.#intervals.stats = setInterval(() => {
            this.#stats.display();
        }, BLE_CONFIG.TIMEOUTS.STATS_UPDATE);
    }

    async stopStream() {
        this.#isStreaming = false;
        logger.info('Stream', 'Stopping stream...');
        
        await this.#device.sendCommand('spstr');
        await this.#device.sendCommand('ssend');
        await this.#memoryManager.cleanup(this.#side);
        
        this.#cleanup();
        logger.info('Stream', 'Stream stopped', this.#stats.getSummary());
    }

    #cleanup() {
        Object.values(this.#intervals).forEach(clearInterval);
        this.#intervals = { stats: null, battery: null };
        this.#isStreaming = false;
    }

    async writeMemory(side) {
        await this.#memoryManager.writeCommands(side);
    }
}
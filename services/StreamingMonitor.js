// src/services/StreamMonitor.js
import { BLE_CONFIG } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import chalk from 'chalk';

export class StreamMonitor {
    #device;
    #stats;
    #intervals = { battery: null, stats: null };

    constructor(device, stats) {
        this.#device = device;
        this.#stats = stats;
    }

    start() {
        this.#stats.reset();
        
        this.#device.onNotification(this.#handleNotification.bind(this));
        logger.debug('Monitor', 'Starting stream monitoring');

        this.#intervals.battery = setInterval(() => {
            this.#device.sendCommand('batlv?');
        }, BLE_CONFIG.TIMEOUTS.BATTERY_CHECK);

        this.#intervals.stats = setInterval(() => {
            this.#stats.display();
        }, BLE_CONFIG.TIMEOUTS.STATS_UPDATE);
    }

    stop() {
        Object.values(this.#intervals).forEach(clearInterval);
        this.#intervals = { battery: null, stats: null };
        
        const summary = this.#stats.getSummary();
        logger.info('Monitor', 'Stream stopped', summary);
        
        console.log(chalk.yellow('\nStream Summary:'));
        console.log(chalk.yellow(`Duration: ${summary.duration.toFixed(1)}s`));
        console.log(chalk.yellow(`Total Packets: ${summary.packetCount}`));
        console.log(chalk.yellow(`Final Battery: ${summary.batteryLevel}%`));
    }

    #handleNotification(data) {
        const response = data.toString();
        logger.debug('Monitor', `Received: ${response}`);
        
        if (response.startsWith('batlv=')) {
            const level = parseInt(response.split('=')[1]);
            this.#stats.updateBattery(level);
            logger.debug('Monitor', `Battery level: ${level}%`);
            return level;
        } else {
            this.#stats.incrementPackets();
            const packetCount = this.#stats.getPacketCount();
            if (packetCount % 100 === 0) {
                logger.debug('Monitor', `Packets received: ${packetCount}`);
            }
            return null;
        }
    }
}
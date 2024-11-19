import { EventEmitter } from 'events';
import { BLE_CONFIG } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { MemoryManager } from "./MemoryManager.js";
import { StreamStats } from "./StreamStats.js";
import { DeviceInfoManager } from "./DeviceInfoManager.js";
import { BatteryLogger } from '../utils/BatteryLogger.js';

export class StreamManager extends EventEmitter {
    #device;
    #memoryManager;
    #deviceInfo;
    #stats;
    #side;
    #isStreaming = false;
    #intervals = { stats: null, battery: null };
    #commandPromises = new Map();
    #batteryLogger;


    constructor(device) {
        super();
        this.#device = device;
        this.#deviceInfo = new DeviceInfoManager(device);
        this.#memoryManager = new MemoryManager(device);
        this.#stats = new StreamStats(this.#deviceInfo);
        this.#batteryLogger = new BatteryLogger();
        this.#setupDeviceListeners();
        this.#setupNotificationHandler();
        logger.setLogLevel('debug');
    }

    #setupDeviceListeners() {
        // Listen for low battery
        this.#deviceInfo.on('lowBattery', () => {
            logger.warn('Stream', 'Low battery detected. Stopping stream...');
            this.stopStream();
        });

        // Listen for stats updates from StreamStats
        this.#stats.on('statsUpdate', () => {
            // Emit the stats update with current stats data
            this.emit('statsUpdate', this.#stats.getSummary());
        });

        // Listen for battery updates
        this.#deviceInfo.on('batteryUpdate', (level) => {
            this.emit('batteryUpdate', level);
        });
    }

    #setupNotificationHandler() {
        // Set up a single notification handler for all device communication
        console.log('setting the handler11')
        this.#device.onNotification(this.#handleNotification.bind(this));
    }

    async initialize() {
        try {
            await this.#getFirmwareVersion();
            await this.#checkBatteryLevel();
        } catch (error) {
            logger.warn('Device', `Failed to initialize device info: ${error.message}`);
        }
    }

    async startStream(side) {
        if (!this.#memoryManager.getFileNumber()) {
            throw new Error('Run memory commands first');
        }

        this.#side = side;
        this.#isStreaming = true;
        this.#stats.reset();
        
        logger.info('Stream', `Starting stream for ${side} side`);
        await this.#device.sendCommand('ssstr');
        this.#startMonitoring();
    }


    #handleNotification(data) {
        try {
            const textResponse = data.toString('utf8');
            
            // Handle battery response
            if (textResponse.startsWith('batlv=')) {
                const level = parseInt(textResponse.split('=')[1]);
                this.#deviceInfo.updateBatteryLevel(level);
                this.#batteryLogger.logBatteryResponse(level);
                const resolver = this.#commandPromises.get('battery');
                if (resolver) {
                    resolver(level);
                    this.#commandPromises.delete('battery');
                }
                return;
            }

            // Handle firmware response
            if (textResponse.startsWith('fwver=')) {
                const version = textResponse.split('=')[1].trim();
                this.#deviceInfo.firmwareVersion = version
                const resolver = this.#commandPromises.get('firmware');
                if (resolver) {
                    resolver(version);
                    this.#commandPromises.delete('firmware');
                }
                return;
            }

            // Handle streaming data
            if (this.#isStreaming && data.length > 3) {
                if (data[0] === 88 && data[1] === 88 && data[2] === 88) {
                    this.#stats.incrementPackets();
                    if (this.#stats.getPacketCount() % 100 === 0) {
                        logger.debug('Stream', `Packets received: ${this.#stats.getPacketCount()}`);
                    }
                }
            }
        } catch (error) {
            logger.error('Stream', `Error in notification handler: ${error.message}`);
        }
    }


    #startMonitoring() {
        process.stdout.write('\x1B[2J\x1B[H');
        
        // Start periodic battery check
        this.#intervals.battery = setInterval(() => {
            this.#batteryLogger.logBatteryCommand();
            this.#device.sendCommand('batlv?');
        }, BLE_CONFIG.TIMEOUTS.BATTERY_CHECK);

        // Start stats display update
        this.#intervals.stats = setInterval(() => {
            this.#stats.display();
        }, BLE_CONFIG.TIMEOUTS.STATS_UPDATE);
        
        logger.debug('Monitor', 'Started monitoring with intervals');
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

    getDeviceInfo() {
            return this.#deviceInfo;
        }


        async #getFirmwareVersion() {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    this.#commandPromises.delete('firmware');
                    reject(new Error('Firmware version request timed out'));
                }, 2000);
    
                this.#commandPromises.set('firmware', (version) => {
                    clearTimeout(timeoutId);
                    resolve(version);
                });
    
                this.#device.sendCommand('fwver?').catch(reject);
            });
        }
    
        async #checkBatteryLevel() {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    this.#commandPromises.delete('battery');
                    reject(new Error('Battery level request timed out'));
                }, 2000);
    
                this.#commandPromises.set('battery', (level) => {
                    clearTimeout(timeoutId);
                    resolve(level);
                });
    
                this.#device.sendCommand('batlv?').catch(reject);
            });
        }
}
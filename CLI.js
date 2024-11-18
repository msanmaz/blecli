import { createCoalescers } from './utils/RequestCoalescer.js';
import { Scanner } from './services/Scanner.js';
import { BLEDevice } from './models/BLEDevice.js';
import { StreamManager } from './services/StreamManager.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from './utils/logger.js';

export class CLI {
    #noble;
    #scanner;
    #coalescer;
    #device;
    #streamManager;
    #streamStats;

    constructor(noble) {
        this.#noble = noble;
        this.#coalescer = createCoalescers();
        this.#scanner = new Scanner(noble, this.#coalescer);
        this.#setupHandlers();
    }

    #setupHandlers() {
        this.#noble.on('stateChange', async (state) => {
            if (state === 'poweredOn') {
                console.log(chalk.green('Bluetooth powered on'));
                await this.start();
            } else {
                console.log(chalk.red(`Bluetooth ${state}`));
                if (state === 'unauthorized') {
                    console.log(chalk.yellow('Check Bluetooth permissions'));
                }
            }
        });

        process.on('SIGINT', () => this.cleanup());
    }

    async start() {
        try {
            console.log(chalk.blue('🔍 BLE Device CLI'));
            const devices = await this.#scanner.scan();
            const device = await this.#selectDevice(devices);
            
            this.#device = new BLEDevice(device, this.#coalescer);
            await this.#device.connect();
            
            this.#streamManager = new StreamManager(this.#device);
            await this.#commandLoop();
        } catch (error) {
            console.error(chalk.red(`Startup error: ${error.message}`));
            process.exit(1);
        }
    }

    async #commandLoop() {
        const COMMANDS = [
            { name: 'Write Memory Commands', value: 'memory' },
            { name: 'Start Streaming', value: 'stream' },
            { name: 'Battery Level Check', value: 'battery' },
            { name: 'Exit', value: 'exit' }
        ];

        while (true) {
            try {
                const { choice } = await inquirer.prompt([{
                    type: 'list',
                    name: 'choice',
                    message: 'Select operation:',
                    choices: COMMANDS
                }]);

                if (choice === 'exit') {
                    await this.cleanup();
                    break;
                }

                await this.#handleCommand(choice);
            } catch (error) {
                console.error(chalk.red(`Command error: ${error.message}`));
            }
        }
    }

    async #selectDevice(devices) {
        if (!devices?.length) {
            throw new Error('No devices found');
        }

        const { selectedDevice } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedDevice',
            message: 'Select a device to connect:',
            choices: devices.map(device => ({
                name: `${device.name} (${device.peripheral.id})`,
                value: device.peripheral
            }))
        }]);

        return selectedDevice;
    }

    async #handleCommand(choice) {
        const { side } = await inquirer.prompt([{
            type: 'list',
            name: 'side',
            message: 'Which side is connected?',
            choices: ['Left', 'Right']
        }]);
    
        try {
            switch (choice) {
                case 'memory':
                    await this.#streamManager.writeMemory(side);
                    break;
                case 'stream':
                    await this.#streamManager.startStream(side);
                    break;
                case 'battery':
                    await this.#checkBatteryLevel();
                    break;
            }
        } catch (error) {
            console.error(chalk.red(`Error executing ${choice}: ${error.message}`));
        }
    }

    async cleanup() {
        try {
            if (this.#streamManager) {
                await this.#streamManager.stopStream();
            }
            this.#coalescer.scan.clear();
            this.#coalescer.connection.clear();
            this.#coalescer.command.clear();
        } catch (error) {
            console.error(chalk.red(`Cleanup error: ${error.message}`));
        } finally {
            process.exit(0);
        }
    }

    async #checkBatteryLevel() {
        return new Promise((resolve, reject) => {
            const handler = (data) => {
                try {
                    const response = data.toString();
                    if (response.startsWith('batlv=')) {
                        const level = parseInt(response.split('=')[1]);
                        logger.info('Battery', `Level: ${level}%`);
                        this.#device.removeNotificationListener(handler);
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            };
    
            try {
                this.#device.onNotification(handler);
                this.#device.sendCommand('batlv?');
    
                // Timeout after 2 seconds
                setTimeout(() => {
                    this.#device.removeNotificationListener(handler);
                    resolve(); // Resolve instead of reject to avoid crash
                }, 2000);
            } catch (error) {
                reject(error);
            }
        });
    }
}
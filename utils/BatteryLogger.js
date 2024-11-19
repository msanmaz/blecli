import fs from 'fs';
import { logger } from '../utils/logger.js';
import path from 'path';

export class BatteryLogger {
    #filePath;
    #writeStream;

    constructor() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `battery_log_${timestamp}.csv`;
        this.#filePath = path.join(process.cwd(), fileName);
        
        // Create file with headers if it doesn't exist
        if (!fs.existsSync(this.#filePath)) {
            fs.writeFileSync(this.#filePath, 'Time,Command Sent,Battery Level\n');
        }
        
        this.#writeStream = fs.createWriteStream(this.#filePath, { flags: 'a' });
        logger.info('BatteryLogger', `Logging to file: ${fileName}`);
    }

    logBatteryCommand() {
        const time = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.#writeStream.write(`${time},batlv?,`);
    }

    logBatteryResponse(level) {
        this.#writeStream.write(`${level}\n`);
    }

    close() {
        this.#writeStream.end();
    }
}
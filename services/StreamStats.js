import chalk from "chalk";
import { EventEmitter } from 'events';

export class StreamStats extends EventEmitter {
    #startTime = null;
    #startTimestamp = '';
    #packetCount = 0;
    #deviceInfo;

    constructor(deviceInfo) {
        super();
        this.#deviceInfo = deviceInfo;
        this.#setupDeviceInfoListeners();
    }

    #setupDeviceInfoListeners() {
        this.#deviceInfo.on('batteryUpdate', () => {
            this.emit('statsUpdate');
        });
    }


    #formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            remainingSeconds.toString().padStart(2, '0')
        ].join(':');
    }

    reset() {
        this.#startTime = Date.now();
        // Format timestamp to show only time HH:MM:SS
        const date = new Date();
        this.#startTimestamp = date.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.#packetCount = 0;
        this.emit('reset');
    }

    incrementPackets() {
        this.#packetCount++;
        this.emit('packetReceived', this.#packetCount);
    }

        getPacketCount() {
            return this.#packetCount;
        }


        display() {
            if (!this.#startTime) return;
            
            process.stdout.write('\x1B[2J\x1B[H');
            
            const duration = (Date.now() - this.#startTime) / 1000;
            const formattedDuration = this.#formatDuration(duration);
    
            const stats = [
                'Stream Statistics:',
                `Firmware Version: ${this.#deviceInfo.firmwareVersion || 'Unknown'}`,
                `Start Time: ${this.#startTimestamp}`,
                `Initial Battery Level: ${this.#deviceInfo.initialBatteryLevel !== null ? this.#deviceInfo.initialBatteryLevel + '%' : 'Waiting...'}`,
                `Current Battery Level: ${this.#deviceInfo.batteryLevel !== null ? this.#deviceInfo.batteryLevel + '%' : 'Waiting...'}`,
                `Total packets: ${this.#packetCount}`,
                `Avg packets/sec: ${(this.#packetCount / duration).toFixed(2)}`,
                `Duration: ${formattedDuration}`,
                '',
                'Press ↑/↓ to select Stop Streaming'
            ].join('\n');
    
            process.stdout.write(chalk.green(stats));
        }

    getSummary() {
        const duration = (Date.now() - this.#startTime) / 1000;
        return {
            firmwareVersion: this.#deviceInfo.firmwareVersion,
            startTime: this.#startTimestamp,
            duration:this.#formatDuration(duration),
            packetCount: this.#packetCount,
            averagePacketsPerSecond: this.#packetCount / duration,
            initialBatteryLevel: this.#deviceInfo.initialBatteryLevel,
            finalBatteryLevel: this.#deviceInfo.batteryLevel
        };
    }
}
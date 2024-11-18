import chalk from "chalk";

export class StreamStats {
    #startTime = null;
    #packetCount = 0;
    #batteryLevel = 100;
    #lastUpdate = '';

    reset() {
        this.#startTime = Date.now();
        this.#packetCount = 0;
        this.#lastUpdate = '';
    }

    updateBattery(level) {
        this.#batteryLevel = level;
    }

    incrementPackets() {
        this.#packetCount++;
    }

    getPacketCount() {
        return this.#packetCount;
    }


    display() {
        if (!this.#startTime) return;
        
        // Clear the entire screen section for stats
        process.stdout.write('\x1B[2J\x1B[H');
        
        const duration = (Date.now() - this.#startTime) / 1000;
        const stats = [
            'Stream Statistics:',
            `Battery Level: ${this.#batteryLevel}%`,
            `Total packets: ${this.#packetCount}`,
            `Avg packets/sec: ${(this.#packetCount / duration).toFixed(2)}`,
            `Duration: ${duration.toFixed(1)}s`,
            '',  // Empty line for spacing
            'Press ↑/↓ to select Stop Streaming'
        ].join('\n');

        process.stdout.write(chalk.green(stats));
    }


    getBatteryLevel() {
        return this.#batteryLevel;
    }

    getSummary() {
        const duration = (Date.now() - this.#startTime) / 1000;
        return {
            duration,
            packetCount: this.#packetCount,
            averagePacketsPerSecond: this.#packetCount / duration,
            batteryLevel: this.#batteryLevel
        };
    }
}
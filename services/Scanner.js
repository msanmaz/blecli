// src/services/Scanner.js
import { BLE_CONFIG } from "../config/constants.js";
export class Scanner {
    #noble;
    #coalescer;
    #devices = new Map();

    constructor(noble, coalescer) {
        this.#noble = noble;
        this.#coalescer = coalescer;
    }

    async scan() {
        return this.#coalescer.scan.coalesce('scan', () => new Promise((resolve) => {
            this.#noble.on('discover', this.#handleDiscover.bind(this));
            this.#noble.startScanning([], true);
            
            setTimeout(() => {
                this.#noble.stopScanning();
                resolve(Array.from(this.#devices.values()));
            }, BLE_CONFIG.TIMEOUTS.SCAN);
        }));
    }

    #handleDiscover(peripheral) {
        const name = peripheral.advertisement.localName;
        if (name) {
            this.#devices.set(peripheral.id, { name, peripheral });
        }
    }
}
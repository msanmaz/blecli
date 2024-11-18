// src/services/CoalescerService.js
import { RequestCoalescer } from '../utils/RequestCoalescer.js';

export class CoalescerService {
    scan;
    connection;
    command;

    constructor() {
        this.scan = new RequestCoalescer({ ttl: 10000 });
        this.connection = new RequestCoalescer({ ttl: 5000 });
        this.command = new RequestCoalescer({ ttl: 2000 });
    }

    cleanup() {
        this.scan.clear();
        this.connection.clear();
        this.command.clear();
    }
}

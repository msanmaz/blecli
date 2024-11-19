// src/config/constants.js
export const BLE_CONFIG = {
    UUIDS: {
        SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        RX: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
        TX: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
    },
    TIMEOUTS: {
        SCAN: 5000,
        BATTERY_CHECK: 10000,  // Check battery every 10 seconds
        STATS_UPDATE: 1000     // Update display every second
    },
    THRESHOLDS: {
        LOW_BATTERY: 5
    }
};
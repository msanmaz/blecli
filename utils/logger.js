import chalk from 'chalk';

export class Logger {
    static #instance;
    #logLevel = 'info';
    
    static getInstance() {
        if (!Logger.#instance) {
            Logger.#instance = new Logger();
        }
        return Logger.#instance;
    }

    setLogLevel(level) {
        this.#logLevel = level;
    }

    info(component, message, data = null) {
        this.#log('info', component, message, chalk.blue, data);
    }

    debug(component, message, data = null) {
        if (this.#logLevel === 'debug') {
            this.#log('debug', component, message, chalk.gray, data);
        }
    }

    error(component, message, error = null) {
        this.#log('error', component, message, chalk.red, error);
    }

    warn(component, message, data = null) {
        this.#log('warn', component, message, chalk.yellow, data);
    }

    #log(level, component, message, colorFn, data = null) {
        const timestamp = new Date().toISOString();
        console.log(colorFn(`[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`));
        if (data) {
            console.log(colorFn(`[${timestamp}] [${level.toUpperCase()}] [${component}] Data:`, data));
        }
    }
}

export const logger = Logger.getInstance();
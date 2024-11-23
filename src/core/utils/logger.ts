const noopApi = new Proxy({}, { get: () => () => {} }) as ConsoleLike;
const logLevels = ['silent', 'error', 'warn', 'info', 'perf', 'debug'] as const;
const logMethods: Record<LoggerMethod, [apiMethod: ConsoleMethodName, level: LogLevel | 'any']> = {
    error: ['error', 'error'],
    warn: ['warn', 'warn'],
    info: ['info', 'info'],
    perf: ['log', 'perf'],
    log: ['log', 'any'],
    debug: ['debug', 'debug']
} as const;

export type LoggerMethod = 'error' | 'warn' | 'info' | 'perf' | 'log' | 'debug';
export type LogLevel = typeof logLevels[number];
export type ConsoleMethodName = 'log' | 'error' | 'warn' | 'info' | 'debug' | 'group' | 'groupCollapsed' | 'groupEnd';
export type ConsoleMethod = (...args: unknown[]) => void;
export type ConsoleLike = {
    [K in ConsoleMethodName]: ConsoleMethod;
};
export type LoggerSubMethod = 'group' | 'groupCollapsed';
export type LoogerMethod = ConsoleMethod & {
    group(message: string, content: (() => unknown[] | void) | unknown[]): void;
    groupCollapsed(message: string, content: (() => unknown[] | void) | unknown[]): void;
}

export class Logger {
    #logLevel: LogLevel;
    #prefix: string;
    #api: ConsoleLike;

    // stub methods
    error: LoogerMethod;
    warn: LoogerMethod;
    info: LoogerMethod;
    perf: LoogerMethod;
    debug: LoogerMethod;
    log: LoogerMethod;

    constructor(
        prefix: string = '',
        logLevel: LogLevel = 'debug',
        consoleLikeApi: ConsoleLike = console
    ) {
        this.#prefix = prefix;
        this.#api = consoleLikeApi || noopApi;
        this.logLevel = logLevel;
    }

    shouldLogLevel(logLevel: LogLevel) {
        const logLevelIndex = logLevels.indexOf(logLevel);

        return (
            this.#logLevel !== 'silent' &&
            logLevelIndex !== -1 &&
            logLevelIndex <= logLevels.indexOf(this.#logLevel)
        );
    }

    get logLevel() {
        return this.#logLevel;
    }

    set logLevel(logLevel: LogLevel) {
        const levelIndex = logLevels.indexOf(logLevel);

        if (levelIndex === -1) {
            console.error(this.#prefix, `Bad log level "${logLevel}", supported: ${logLevels.join(', ')}`);
        }

        if (logLevel !== this.#logLevel) {
            const api = this.#api;
            const prefix = this.#prefix;
            const createApiMethodWrapper = (apiMethodName: ConsoleMethodName) =>
                Function.prototype.bind.call(
                    this.#api[apiMethodName],
                    this.#api,
                    ...this.#prefix ? [this.#prefix] : []
                );
            const createGroupMethod = (methodName: ConsoleMethodName, collapsed: boolean) => {
                return (message: string, content: (() => unknown) | unknown[]) => {
                    const groupMethodName: ConsoleMethodName = collapsed ? 'groupCollapsed' : 'group';

                    // Safari doesn't support anything but a single string for group methods
                    api[groupMethodName](`${prefix} ${message}`);

                    const messages = typeof content === 'function'
                        ? content()
                        : content;

                    if (Array.isArray(messages)) {
                        for (const entry of messages) {
                            api[methodName](...Array.isArray(entry) ? entry : [entry]);
                        }
                    }

                    api.groupEnd();
                };
            };

            this.#logLevel = logLevel;

            for (const [methodName, [apiMethod, level]] of Object.entries(logMethods)) {
                if (level === 'any' || this.shouldLogLevel(level)) {
                    this[methodName as LoggerMethod] = Object.assign(createApiMethodWrapper(apiMethod), {
                        group: createGroupMethod(apiMethod, false),
                        groupCollapsed: createGroupMethod(apiMethod, true)
                    });
                } else {
                    this[methodName as LoggerMethod] = Object.assign(() => {}, {
                        group: () => () => {},
                        groupCollapsed: () => () => {}
                    });
                }
            }
        }
    }
}

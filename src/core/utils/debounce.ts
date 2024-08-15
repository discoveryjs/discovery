/**
 * Copyright Lodash
 * https://github.com/lodash/lodash/blob/master/debounce.js
 * Adopted for Discovery.js project
 */

type Options = {
    wait: number;
    maxWait?: number;
    leading?: boolean;
}
type DebounceMethods<R> = {
    cancel(): void;
    flush(): R;
    pending(): boolean;
}

function isObject(value: unknown): value is object {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked, or until the next browser frame is drawn. The debounced function
 * comes with a `cancel` method to cancel delayed `func` invocations and a
 * `flush` method to immediately invoke them. Provide `options` to indicate
 * whether `func` should be invoked on the leading and/or trailing edge of the
 * `wait` timeout. The `func` is invoked with the last arguments provided to the
 * debounced function. Subsequent calls to the debounced function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * If `wait` is omitted in an environment with `requestAnimationFrame`, `func`
 * invocation will be deferred until the next frame is drawn (typically about
 * 16ms).
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `debounce` and `throttle`.
 *
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.wait=0]
 *  The number of milliseconds to delay; if omitted, `requestAnimationFrame` is
 *  used (if available).
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', debounce(calculateLayout, 150))
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }))
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * const debounced = debounce(batchLog, 250, { 'maxWait': 1000 })
 * const source = new EventSource('/stream')
 * jQuery(source).on('message', debounced)
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel)
 *
 * // Check for pending invocations.
 * const status = debounced.pending() ? "Pending..." : "Ready"
 */

export default function debounce<
    T extends (...args: A) => R,
    A extends any[],
    R
>(func: T, options?: Options | number): T & DebounceMethods<R> {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function');
    }

    if (typeof options === 'number') {
        options = { wait: options };
    }

    if (!isObject(options)) {
        let result: R;
        return Object.assign(function(...args: A): R {
            return result = func.apply(this, args);
        } as T, {
            cancel() {},
            flush() {
                return result;
            },
            pending() {
                return false;
            }
        });
    }

    const wait = Math.max(0, Number(options.wait) || 0);
    const leading = Boolean(options.leading);
    const maxing = 'maxWait' in options;
    const maxWait = maxing ? Math.max(Number(options.maxWait) || 0, wait) : Infinity;
    const trailing = 'trailing' in options ? Boolean(options.trailing) : true;

    let lastArgs: A | undefined;
    let lastThis: any;
    let result: R;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let lastCallTime: number | undefined;
    let lastInvokeTime = 0;

    function invokeFunc(time: number) {
        const args = lastArgs;
        const thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
    }

    function startTimer(pendingFunc: typeof timerExpired, wait: number) {
        return setTimeout(pendingFunc, wait);
    }

    function cancelTimer(id: ReturnType<typeof setTimeout>) {
        clearTimeout(id);
    }

    function leadingEdge(time: number) {
        // Reset any `maxWait` timer.
        lastInvokeTime = time;
        // Start the timer for the trailing edge.
        timerId = startTimer(timerExpired, wait);
        // Invoke the leading edge.
        return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time: number, lastCallTime: number) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;

        return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
    }

    function shouldInvoke(time: number, lastCallTime: number) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;

        // Either this is the first call, activity has stopped and we're at the
        // trailing edge, the system time has gone backwards and we're treating
        // it as the trailing edge, or we've hit the `maxWait` limit.
        return (
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            timeSinceLastInvoke >= maxWait
        );
    }

    function timerExpired() {
        const time = Date.now();
        if (lastCallTime === undefined || shouldInvoke(time, lastCallTime)) {
            return trailingEdge(time);
        }
        // Restart the timer.
        timerId = startTimer(timerExpired, remainingWait(time, lastCallTime));
    }

    function trailingEdge(time: number) {
        timerId = undefined;

        // Only invoke if we have `lastArgs` which means `func` has been
        // debounced at least once.
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }

    function cancel() {
        if (timerId !== undefined) {
            cancelTimer(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
        return timerId === undefined ? result : trailingEdge(Date.now());
    }

    function pending() {
        return timerId !== undefined;
    }

    return Object.assign(function(...args: A) {
        const time = Date.now();
        const isInvoking = lastCallTime === undefined || shouldInvoke(time, lastCallTime);

        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
            if (timerId === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxing) {
                // Handle invocations in a tight loop.
                timerId = startTimer(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }

        if (timerId === undefined) {
            timerId = startTimer(timerExpired, wait);
        }

        return result;
    } as T, {
        cancel,
        flush,
        pending
    });
}

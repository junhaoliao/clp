export type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMax: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenMax: 1,
};

export class CircuitBreaker {
    private state: CircuitState = "closed";

    private failureCount = 0;

    private successCount = 0;

    private lastFailureTime = 0;

    private halfOpenAttempts = 0;

    private readonly opts: CircuitBreakerOptions;

    constructor (opts?: Partial<CircuitBreakerOptions>) {
        this.opts = {...DEFAULT_OPTIONS, ...opts};
    }

    getState (): CircuitState {
        if ("open" === this.state) {
            if (Date.now() - this.lastFailureTime >= this.opts.resetTimeoutMs) {
                this.state = "half-open";
                this.halfOpenAttempts = 0;
            }
        }

        return this.state;
    }

    canExecute (): boolean {
        const state = this.getState();
        if ("closed" === state) {
            return true;
        }
        if ("half-open" === state) {
            return this.halfOpenAttempts < this.opts.halfOpenMax;
        }

        return false;
    }

    recordSuccess (): void {
        if ("half-open" === this.state) {
            this.successCount++;
            if (this.successCount >= this.opts.halfOpenMax) {
                this.state = "closed";
                this.failureCount = 0;
                this.successCount = 0;
            }
        } else {
            this.failureCount = 0;
        }
    }

    recordFailure (): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if ("half-open" === this.state) {
            this.state = "open";
            this.halfOpenAttempts = 0;
            this.successCount = 0;
        } else if (this.failureCount >= this.opts.failureThreshold) {
            this.state = "open";
        }
    }

    recordHalfOpenAttempt (): void {
        this.halfOpenAttempts++;
    }
}

/** Per-datasource circuit breaker registry */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 *
 * @param datasourceId
 */
export function getCircuitBreaker (datasourceId: string): CircuitBreaker {
    let cb = circuitBreakers.get(datasourceId);
    if (!cb) {
        cb = new CircuitBreaker();
        circuitBreakers.set(datasourceId, cb);
    }

    return cb;
}

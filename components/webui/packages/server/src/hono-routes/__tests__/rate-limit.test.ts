import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";


/** In-memory rate limiter (duplicated from hono-app.ts for unit testing) */
class RateLimiter {
    private hits = new Map<string, {count: number; resetAt: number}>();

    private maxHits: number;

    private windowMs: number;

    constructor (maxHits: number, windowMs: number) {
        this.maxHits = maxHits;
        this.windowMs = windowMs;
    }

    check (ip: string): {allowed: boolean; remaining: number; resetAt: number} {
        const now = Date.now();
        let entry = this.hits.get(ip);
        if (!entry || now >= entry.resetAt) {
            entry = {count: 0, resetAt: now + this.windowMs};
            this.hits.set(ip, entry);
        }
        entry.count++;
        const allowed = entry.count <= this.maxHits;
        return {allowed, remaining: Math.max(0, this.maxHits - entry.count), resetAt: entry.resetAt};
    }
}

describe("RateLimiter", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter(5, 60_000);
    });

    it("should allow requests within limit", () => {
        for (let i = 0; 5 > i; i++) {
            const result = limiter.check("192.168.1.1");
            expect(result.allowed).toBe(true);
        }
    });

    it("should block requests exceeding limit", () => {
        for (let i = 0; 5 > i; i++) {
            limiter.check("192.168.1.1");
        }
        const result = limiter.check("192.168.1.1");
        expect(result.allowed).toBe(false);
    });

    it("should track different IPs independently", () => {
        for (let i = 0; 5 > i; i++) {
            limiter.check("192.168.1.1");
        }
        const result = limiter.check("192.168.1.2");
        expect(result.allowed).toBe(true);
    });

    it("should report correct remaining count", () => {
        const result1 = limiter.check("10.0.0.1");
        expect(result1.remaining).toBe(4);
        const result2 = limiter.check("10.0.0.1");
        expect(result2.remaining).toBe(3);
    });

    it("should return resetAt timestamp", () => {
        const result = limiter.check("10.0.0.1");
        expect(result.resetAt).toBeGreaterThan(Date.now());
    });
});

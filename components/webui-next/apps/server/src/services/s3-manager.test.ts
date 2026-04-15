import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {S3Manager} from "./s3-manager.js";


// Mock AWS SDK with a proper class constructor
vi.mock("@aws-sdk/client-s3", () => {
    return {
        S3Client: class MockS3Client {
            constructor (_config: any) {
            }
        },
        GetObjectCommand: class MockGetObjectCommand {
            input: any;

            constructor (input: any) {
                this.input = input;
            }
        },
    };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: vi.fn().mockResolvedValue("https://presigned-url.example.com/file?token=abc"),
}));

describe("S3Manager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("should create S3Manager with region and path prefix", () => {
            const manager = new S3Manager("us-east-1", "s3://bucket/path");
            expect(manager.getS3PathPrefix()).toBe("s3://bucket/path");
        });

        it("should create S3Manager with null path prefix", () => {
            const manager = new S3Manager("us-east-1", null);
            expect(manager.getS3PathPrefix()).toBeNull();
        });

        it("should create S3Manager with profile", () => {
            const manager = new S3Manager("us-east-1", "s3://bucket/path", "my-profile");
            expect(manager.getS3PathPrefix()).toBe("s3://bucket/path");
        });
    });

    describe("getPreSignedUrl", () => {
        it("should generate a presigned URL for the given S3 URI", async () => {
            const manager = new S3Manager("us-east-1", "s3://bucket/");
            const url = await manager.getPreSignedUrl("s3://my-bucket/path/to/file.log");

            expect(url).toBe("https://presigned-url.example.com/file?token=abc");

            const {getSignedUrl} = await import("@aws-sdk/s3-request-presigner");
            expect(getSignedUrl).toHaveBeenCalledOnce();
        });
    });
});

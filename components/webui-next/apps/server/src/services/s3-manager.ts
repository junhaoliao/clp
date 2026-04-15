import {
    GetObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";


const PRE_SIGNED_URL_EXPIRY_TIME_SECONDS = 3600;

class S3Manager {
    #client: S3Client;

    #s3PathPrefix: string | null;

    constructor (region: string, s3PathPrefix: string | null, profile?: string) {
        this.#client = new S3Client({
            region,
            ...(profile ?
                {} :
                {}),
        });
        this.#s3PathPrefix = s3PathPrefix;
    }

    async getPreSignedUrl (s3UriString: string): Promise<string> {
        const url = new URL(s3UriString);
        const bucket = url.host;
        const key = url.pathname.slice(1);
        const command = new GetObjectCommand({Bucket: bucket, Key: key});
        return getSignedUrl(this.#client, command, {
            expiresIn: PRE_SIGNED_URL_EXPIRY_TIME_SECONDS,
        });
    }

    getS3PathPrefix (): string | null {
        return this.#s3PathPrefix;
    }
}

export {S3Manager};

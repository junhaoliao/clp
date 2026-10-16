# S3 scanner MVP validation captures

Implementation: 5e048aea8e1b2f0412ed306a52799e193163e5c3.

Captures are from the freshly built application. Bucket values are masked. 13 and 14 use browser settings fixtures to verify frontend gates; API gates are independently tested on the backend. 11 records existing 390px statistics-layout overflow, reproduced on unchanged main; 12 is the passing 768px layout. 15 exercises a real unreachable upstream via task-only runtime configuration, without stubbing the HTTP response.

- [01-initial-page.png](01-initial-page.png)
- [02-required-errors.png](02-required-errors.png)
- [03-dataset-error.png](03-dataset-error.png)
- [04-json-filled.png](04-json-filled.png)
- [05-pending.png](05-pending.png)
- [06-json-success.png](06-json-success.png)
- [07-text-filled.png](07-text-filled.png)
- [08-text-success.png](08-text-success.png)
- [09-native-conflict.png](09-native-conflict.png)
- [11-narrow-form.png](11-narrow-form.png)
- [12-tablet-form.png](12-tablet-form.png)
- [13-disabled-config-fixture.png](13-disabled-config-fixture.png)
- [14-filesystem-config-fixture.png](14-filesystem-config-fixture.png)
- [15-real-upstream-unavailable.png](15-real-upstream-unavailable.png)

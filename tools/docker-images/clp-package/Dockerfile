FROM ubuntu:jammy AS base

WORKDIR /root

COPY --link ./tools/docker-images/clp-package/setup-scripts ./setup-scripts
RUN ./setup-scripts/install-prebuilt-packages.sh \
    && rm -rf ./setup-scripts/

# Remove cached files
RUN apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV CLP_HOME="/opt/clp"
ENV PATH="${CLP_HOME}/bin:${PATH}"
ENV PATH="${CLP_HOME}/sbin:${PATH}"
ENV PYTHONPATH="${CLP_HOME}/lib/python3/site-packages"

USER 1000:1000

COPY --link ./build/clp-package/etc/os-release /opt/clp/etc/os-release

COPY --link ./build/clp-package/lib/python3/site-packages /opt/clp/lib/python3/site-packages

COPY --link ./build/core/clg /opt/clp/bin/clg
COPY --link ./build/core/clo /opt/clp/bin/clo
COPY --link ./build/core/clp /opt/clp/bin/clp
COPY --link ./build/core/clp-s /opt/clp/bin/clp-s
COPY --link ./build/core/indexer /opt/clp/bin/indexer
COPY --link ./build/core/reducer-server /opt/clp/bin/reducer-server
COPY --link ./build/spider/spider-build/src/spider/spider_scheduler /opt/clp/bin/spider_scheduler
COPY --link ./build/spider/spider-build/src/spider/spider_worker /opt/clp/bin/spider_worker

COPY --link ./build/nodejs-22/bin/node /opt/clp/bin/node-22
COPY --link ./build/webui /opt/clp/var/www/webui

# Flatten the image
FROM scratch
COPY --from=base / /

# rockdesk-mcp (source in mcp/npm) together with RockDesk, so an MCP client or directory can start the
# server and list its tools. The server code in this repository is MIT; RockDesk itself is proprietary
# (https://rockdesk.io/terms.html). Without a RockDesk peer to connect to, the tools list but have nothing to drive.
FROM node:20-bookworm-slim
ARG TARGETARCH
RUN set -eu; \
    arch="${TARGETARCH:-$(dpkg --print-architecture)}"; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    curl -fsSL --retry 5 -o /tmp/rockdesk.deb "https://rockdesk.io/download/latest/linux-${arch}"; \
    apt-get install -y --no-install-recommends /tmp/rockdesk.deb; \
    rm -rf /tmp/rockdesk.deb /var/lib/apt/lists/*
COPY mcp/npm/ /app/
ENTRYPOINT ["node", "/app/bin/rockdesk-mcp.js"]

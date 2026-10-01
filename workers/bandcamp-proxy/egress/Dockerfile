# Egress helper for the Bandcamp relay: a Node process with no dependencies.
# Dokploy: build type Dockerfile, path workers/bandcamp-proxy/egress/Dockerfile,
# context workers/bandcamp-proxy/egress, container port 8787.
FROM node:22-alpine
WORKDIR /app
COPY relay.mjs server.mjs ./
ENV PORT=8787
EXPOSE 8787
USER node
CMD ["node", "server.mjs"]

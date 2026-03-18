FROM node:20-alpine

WORKDIR /sandbox

# Install pyodide
RUN npm init -y && npm pkg set type=module && npm install --ignore-scripts --package-lock pyodide@0.26.4

# Copy entrypoint and warmup scripts
COPY entrypoint.mjs ./
COPY warmup.mjs ./

# Pre-install all Python packages (caches wheels in node_modules)
RUN node warmup.mjs

# Remove warmup script (not needed at runtime)
RUN rm warmup.mjs

# Create non-root user and fix permissions on cached packages
RUN adduser -D -u 1001 sandbox && chown -R sandbox:sandbox /sandbox
USER sandbox

ENTRYPOINT ["node", "entrypoint.mjs"]

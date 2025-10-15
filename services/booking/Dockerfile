FROM oven/bun:1

WORKDIR /app

COPY package*.json ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3004

CMD ["bun", "services/booking/src/index.ts"]
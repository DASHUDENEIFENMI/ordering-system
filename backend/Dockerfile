FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY backend/package.json ./backend/
RUN cd backend && npm install --production
COPY backend ./backend/
COPY frontend ./frontend/
RUN mkdir -p /app/backend/uploads
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]

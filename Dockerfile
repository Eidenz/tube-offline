FROM node:20-alpine

# Install yt-dlp, ffmpeg and required dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg curl && \
    pip3 install --no-cache-dir yt-dlp && \
    apk add --no-cache tzdata

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy app source
COPY . .

# Build React frontend
RUN npm run build

# Create data directory
RUN mkdir -p /data

# Expose port (this will be overridden in docker-compose if needed)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/data/tube-offline.db
ENV VIDEOS_DIR=/data/videos
ENV THUMBNAILS_DIR=/data/thumbnails
ENV SUBTITLES_DIR=/data/subtitles

# Add volume for persistent data
VOLUME ["/data"]

# Create and set permissions for data subdirectories
RUN mkdir -p /data/videos /data/thumbnails /data/subtitles && \
    chown -R node:node /data

# Use node user for security
USER node

# Start the application
CMD ["npm", "start"]
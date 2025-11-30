FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables (optional defaults)
ENV NODE_ENV=production

# Command to run the scraper
CMD ["npm", "run", "scrape"]

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && npm install --omit=devCOPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]

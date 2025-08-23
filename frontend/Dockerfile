FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--port", "5173", "--host"]

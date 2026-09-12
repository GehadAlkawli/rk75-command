FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8787

CMD ["npm", "start", "--", "--ip", "0.0.0.0", "--port", "8787"]

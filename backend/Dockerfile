FROM node:18-alpine

WORKDIR /app

# [A03: Software Supply Chain] 취약한 패키지 버전 고정
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

FROM node:22

WORKDIR /node-app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5011
CMD [ "npm", "start" ]


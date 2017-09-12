FROM node:7.10

WORKDIR /app

ADD . /app

RUN npm install

EXPOSE 5000

CMD ["DEBUG=*", "npm", "start"]
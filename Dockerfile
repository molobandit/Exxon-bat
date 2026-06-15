FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/deploy \
  /usr/share/nginx/html/.git \
  /usr/share/nginx/html/node_modules \
  /usr/share/nginx/html/scripts

EXPOSE 80

HEALTHCHECK CMD wget -qO- http://127.0.0.1/ || exit 1

##
## Serve PathwayMapper /dist from apache web server
##

FROM httpd

RUN mkdir /usr/local/apache2/htdocs/pathway-mapper
COPY dist /usr/local/apache2/htdocs/pathway-mapper/




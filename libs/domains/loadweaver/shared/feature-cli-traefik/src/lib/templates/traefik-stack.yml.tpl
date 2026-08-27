version: '3.8'
services:
  traefik:
    image: {{image}}
    command:
      - --providers.swarm=true
      - --providers.swarm.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
{{acmeArgs}}
    ports:
      - target: 80
        published: 80
        mode: host
      - target: 443
        published: 443
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-config:/etc/traefik
      - traefik-certs:/letsencrypt
{{environmentBlock}}
    networks:
      - {{network}}
    deploy:
{{deployBlock}}
networks:
  {{network}}:
    external: true
volumes:
  traefik-config:
    external: true
  traefik-certs:
    external: true

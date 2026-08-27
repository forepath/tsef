vrrp_script chk_traefik {
  script "curl -f http://127.0.0.1:80/ || exit 1"
  interval 2
  weight 2
}

vrrp_instance VI_1 {
  state BACKUP
  interface {{interface}}
  virtual_router_id {{routerId}}
  priority {{priority}}
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass {{authPass}}
  }
  virtual_ipaddress {
    {{vipAddress}}
  }
  track_script {
    chk_traefik
  }
}

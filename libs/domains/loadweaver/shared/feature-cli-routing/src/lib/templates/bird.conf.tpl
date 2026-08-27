router id {{routerId}};

{{filters}}

protocol device {}

protocol direct {}

protocol kernel {
  ipv4 {
    import all;
    export all;
  };
}

{{staticProtocol}}

{{bgpProtocols}}

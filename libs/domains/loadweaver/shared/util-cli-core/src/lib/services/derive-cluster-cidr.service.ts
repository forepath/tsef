import type { LoadweaverConfig } from '../config/schema';

export function deriveClusterCidr(config: LoadweaverConfig): string {
  if (config.routing?.clusterCidr) {
    return config.routing.clusterCidr;
  }

  const ips = Object.values(config.nodes)
    .map((node) => node.wireguardIp)
    .sort();

  if (ips.length === 0) {
    throw new Error('Cannot derive cluster CIDR: no nodes defined');
  }

  const octets = ips[0].split('.');

  if (octets.length !== 4) {
    throw new Error(`Invalid wireguardIp for CIDR derivation: ${ips[0]}`);
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

function parseIpv4(ip: string): number[] {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  return parts;
}

function cidrNetworkAndPrefix(cidr: string): { network: number[]; prefix: number } {
  const [networkPart, prefixPart] = cidr.split('/');

  if (!networkPart || !prefixPart) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }

  const prefix = Number.parseInt(prefixPart, 10);

  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}`);
  }

  return { network: parseIpv4(networkPart), prefix };
}

export function cidrContainsIp(cidr: string, ip: string): boolean {
  const { network, prefix } = cidrNetworkAndPrefix(cidr);
  const address = parseIpv4(ip);
  const maskBytes = Math.floor(prefix / 8);
  const remainderBits = prefix % 8;

  for (let index = 0; index < maskBytes; index++) {
    if (network[index] !== address[index]) {
      return false;
    }
  }

  if (remainderBits === 0) {
    return true;
  }

  const mask = 0xff << (8 - remainderBits);
  return (network[maskBytes] & mask) === (address[maskBytes] & mask);
}

export function cidrsOverlap(left: string, right: string): boolean {
  const leftInfo = cidrNetworkAndPrefix(left);
  const rightInfo = cidrNetworkAndPrefix(right);
  const prefix = Math.min(leftInfo.prefix, rightInfo.prefix);

  for (let index = 0; index < Math.floor(prefix / 8); index++) {
    if (leftInfo.network[index] !== rightInfo.network[index]) {
      return false;
    }
  }

  if (prefix % 8 === 0) {
    return true;
  }

  const mask = 0xff << (8 - (prefix % 8));
  return (leftInfo.network[Math.floor(prefix / 8)] & mask) === (rightInfo.network[Math.floor(prefix / 8)] & mask);
}

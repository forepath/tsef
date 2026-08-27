export type VipNodeAddressStatus = {
  address: string;
  holdsVip: boolean;
};

export type VipNodeStatus = {
  nodeId: string;
  holdsVip: boolean;
  heldAddresses: string[];
  keepalivedActive: boolean;
  output: string;
};

export type VipAddressInspection = {
  address: string;
  holderNodeId: string | null;
  holderCount: number;
};

export type VipInspection = {
  vipAddress: string;
  holderNodeId: string | null;
  holderCount: number;
  addresses: VipAddressInspection[];
  nodes: VipNodeStatus[];
};

export function inspectVipFromOutputs(
  vipAddresses: string | string[],
  nodeOutputs: Array<{ nodeId: string; output: string }>,
): VipInspection {
  const addresses = Array.isArray(vipAddresses) ? vipAddresses : [vipAddresses];
  const primaryAddress = addresses[0] ?? '';

  const nodes: VipNodeStatus[] = nodeOutputs.map(({ nodeId, output }) => {
    const heldAddresses = addresses.filter((address) => output.includes(address));

    return {
      nodeId,
      holdsVip: heldAddresses.length > 0,
      heldAddresses,
      keepalivedActive: /\bactive\b/.test(output),
      output,
    };
  });

  const addressInspections: VipAddressInspection[] = addresses.map((address) => {
    const holders = nodes.filter((node) => node.heldAddresses.includes(address));

    return {
      address,
      holderNodeId: holders.length === 1 ? holders[0].nodeId : null,
      holderCount: holders.length,
    };
  });

  const primary = addressInspections.find((entry) => entry.address === primaryAddress) ?? {
    address: primaryAddress,
    holderNodeId: null,
    holderCount: 0,
  };

  return {
    vipAddress: primary.address,
    holderNodeId: primary.holderNodeId,
    holderCount: primary.holderCount,
    addresses: addressInspections,
    nodes,
  };
}

export function assertSingleVipHolder(inspection: VipInspection, address?: string): void {
  const target = address
    ? inspection.addresses.find((entry) => entry.address === address)
    : (inspection.addresses[0] ?? inspection);

  const vipAddress = target && 'address' in target ? target.address : inspection.vipAddress;
  const holderCount = target && 'holderCount' in target ? target.holderCount : inspection.holderCount;

  if (holderCount === 0) {
    throw new Error(`VIP ${vipAddress} is not assigned to any node`);
  }

  if (holderCount > 1) {
    const holders = inspection.nodes
      .filter(
        (node) => node.heldAddresses.includes(vipAddress) || (vipAddress === inspection.vipAddress && node.holdsVip),
      )
      .map((node) => node.nodeId);
    throw new Error(`VIP ${vipAddress} is assigned to multiple nodes: ${holders.join(', ')}`);
  }
}

export function assertKeepalivedActiveOnAllNodes(inspection: VipInspection): void {
  const inactive = inspection.nodes.filter((node) => !node.keepalivedActive).map((node) => node.nodeId);

  if (inactive.length > 0) {
    throw new Error(`keepalived is not active on: ${inactive.join(', ')}`);
  }
}

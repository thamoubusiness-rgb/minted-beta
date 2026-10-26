import { config } from "./config";

const ipfsUrl = (cid: string) => `${config.pinataGateway}/ipfs/${cid}`;

async function pinataFetch(path: string, init: RequestInit) {
  if (!config.pinataJwt) throw new Error("PINATA_JWT is not set");
  const res = await fetch(`https://api.pinata.cloud${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.pinataJwt}`, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Pinata ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { IpfsHash: string };
}

/** Download the X avatar and pin it, so the coin keeps its image even if the creator changes their photo. */
export async function pinImageFromUrl(url: string, name: string): Promise<string> {
  const img = await fetch(url);
  if (!img.ok) throw new Error(`Could not download profile photo (${img.status})`);
  const type = img.headers.get("content-type") || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const form = new FormData();
  form.append("file", new Blob([await img.arrayBuffer()], { type }), `${name}.${ext}`);
  form.append("pinataMetadata", JSON.stringify({ name: `${name}-image` }));
  const { IpfsHash } = await pinataFetch("/pinning/pinFileToIPFS", { method: "POST", body: form });
  return ipfsUrl(IpfsHash);
}

export async function pinJson(obj: unknown, name: string): Promise<string> {
  const { IpfsHash } = await pinataFetch("/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name } }),
  });
  // The metadata link is written into the launch transaction, which has a hard size cap,
  // so it uses the shortest public gateway (the same one pump.fun uses).
  return `https://ipfs.io/ipfs/${IpfsHash}`;
}

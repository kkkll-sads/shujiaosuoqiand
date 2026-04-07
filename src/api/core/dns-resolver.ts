export interface DnsDiscoveryConfig {
  domains: string[];
  dnsServers: string[];
  cloudUrl?: string;
  dohTimeout?: number;
  cloudTimeout?: number;
}

function parseTxtRecord(input: unknown): string[] {
  if (Array.isArray(input)) {
    input = input[0];
  }

  if (typeof input === 'string') {
    try {
      let raw = input;
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
      }
      raw = raw.replace(/\\"/g, '"');
      input = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (typeof input === 'object' && input !== null) {
    return Object.values(input as Record<string, string>).filter(
      (v) => typeof v === 'string' && v.length > 0,
    );
  }

  return [];
}

async function dohQuery(url: string, timeout: number): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const answer = data?.Answer?.[0]?.data;
    return answer ? parseTxtRecord(answer) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

const DOH_PROVIDERS = [
  (domain: string) => `https://dns.alidns.com/resolve?name=${domain}&type=16`,
  (domain: string) => `https://doh.pub/dns-query?name=${domain}&type=16`,
];

async function resolveViaDoh(domains: string[], timeout: number): Promise<string[]> {
  for (const domain of domains) {
    for (const provider of DOH_PROVIDERS) {
      const urls = await dohQuery(provider(domain), timeout);
      if (urls.length > 0) {
        return urls;
      }
    }
  }

  return [];
}

async function resolveViaCloud(cloudUrl: string, timeout: number): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(cloudUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return parseTxtRecord(data);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

interface NativeBridgeWithDns {
  resolveDnsTxt?: (domain: string, dnsServer: string) => string;
}

function getNativeBridge(): NativeBridgeWithDns | null {
  if (typeof window !== 'undefined' && (window as any).NativeBridge) {
    return (window as any).NativeBridge as NativeBridgeWithDns;
  }
  return null;
}

async function resolveViaNativeDns(
  domains: string[],
  dnsServers: string[],
): Promise<string[]> {
  const bridge = getNativeBridge();
  if (!bridge?.resolveDnsTxt) {
    return [];
  }

  for (const domain of domains) {
    for (const server of dnsServers) {
      try {
        const result = bridge.resolveDnsTxt(domain, server);
        if (!result) {
          continue;
        }
        const parsed = parseTxtRecord(JSON.parse(result));
        if (parsed.length > 0) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
  }

  return [];
}

/**
 * 线路发现：按优先级尝试多种方式获取可用 baseURL 列表。
 *
 * 优先级：原生 DNS TXT → DoH → 云端 URL → 空列表（使用 env 配置的候选）
 */
export async function discoverBaseURLs(config: DnsDiscoveryConfig): Promise<string[]> {
  const { domains, dnsServers, cloudUrl, dohTimeout = 3000, cloudTimeout = 10000 } = config;

  if (!domains || domains.length === 0) {
    return [];
  }

  const nativeUrls = await resolveViaNativeDns(domains, dnsServers);
  if (nativeUrls.length > 0) {
    console.log('[dns-resolver] 原生DNS解析成功', nativeUrls);
    return nativeUrls;
  }

  const dohUrls = await resolveViaDoh(domains, dohTimeout);
  if (dohUrls.length > 0) {
    console.log('[dns-resolver] DoH解析成功', dohUrls);
    return dohUrls;
  }

  if (cloudUrl) {
    const cloudUrls = await resolveViaCloud(cloudUrl, cloudTimeout);
    if (cloudUrls.length > 0) {
      console.log('[dns-resolver] 云端解析成功', cloudUrls);
      return cloudUrls;
    }
  }

  return [];
}

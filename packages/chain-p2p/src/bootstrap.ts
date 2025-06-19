// P2P Bootstrap implementation for peer discovery
const DNS_SEED_URLS = ['https://cloudflare-dns.com/dns-query?name=seed.apstatchain.com&type=TXT'];

/**
 * Discovers peers using DNS seed strategy
 * @returns Promise<string[]> Array of peer IDs/IPs
 */
export async function discoverPeers(): Promise<string[]> {
  const allPeers: string[] = [];
  
  try {
    // Iterate through all DNS seed URLs
    for (const seedUrl of DNS_SEED_URLS) {
      try {
        console.log(`Querying DNS seed: ${seedUrl}`);
        
        // Make GET request to DNS-over-HTTPS provider
        const response = await fetch(seedUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/dns-json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn(`Failed to query DNS seed ${seedUrl}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        // Parse JSON response
        const dnsData = await response.json();
        
        // Extract peer addresses from TXT records
        if (dnsData.Answer && Array.isArray(dnsData.Answer)) {
          for (const record of dnsData.Answer) {
            if (record.type === 16 && record.data) { // Type 16 is TXT record
              // Parse TXT record data - remove quotes and split by comma if multiple peers
              const txtData = record.data.replace(/"/g, '');
              const peers = txtData.split(',').map((peer: string) => peer.trim());
              allPeers.push(...peers);
            }
          }
        }
        
      } catch (seedError) {
        console.warn(`Error querying DNS seed ${seedUrl}:`, seedError);
        // Continue with next seed URL
      }
    }
    
    // Remove duplicates and filter out empty strings
    const uniquePeers = [...new Set(allPeers)].filter(peer => peer.length > 0);
    
    console.log(`Discovered ${uniquePeers.length} unique peers from DNS seeds`);
    return uniquePeers;
    
  } catch (error) {
    console.error('Error in peer discovery:', error);
    return [];
  }
}

export {}; 
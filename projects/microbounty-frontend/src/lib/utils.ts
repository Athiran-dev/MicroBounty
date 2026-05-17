import { formatDistanceToNow, isPast } from 'date-fns';

/**
 * Shorten an Algorand address for display (e.g. A3BC...XYZ1)
 */
export const shortenAddress = (address: string, chars = 4): string => {
  if (!address || address.length < chars * 2) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};

/**
 * Format a deadline into a human-readable countdown.
 */
export const formatCountdown = (dateInput: string | Date | number): { text: string; isExpired: boolean } => {
  const date = new Date(dateInput);
  
  if (isPast(date)) {
    return { text: 'Expired', isExpired: true };
  }
  
  return { 
    text: formatDistanceToNow(date, { addSuffix: true }), 
    isExpired: false 
  };
};

/**
 * Hash a deploy link string into a 32-byte Uint8Array for the smart contract.
 * Uses the Web Crypto API (crypto.subtle) for spec-compliant SHA-256.
 * Returns a Promise<Uint8Array> of exactly 32 bytes.
 */
export const hashDeployLink = async (link: string): Promise<Uint8Array> => {
  const encoded = new TextEncoder().encode(link);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(hashBuffer);
};

/**
 * Utility to merge tailwind classes simply
 */
export const cx = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Convert Algorand microAlgos to Algos
 */
export const microAlgosToAlgos = (microAlgos: number): number => {
  return microAlgos / 1000000;
};

/**
 * Convert Algos to microAlgos
 */
export const algosToMicroAlgos = (algos: number): number => {
  return algos * 1000000;
};

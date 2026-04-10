import { formatDistanceToNow, isPast } from 'date-fns';
import { sha256 } from 'js-sha256';

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
 * Algorand smart contracts require a 32-byte static array for SHA256 hashes.
 */
export const hashDeployLink = (link: string): Uint8Array => {
  const hashHex = sha256(link);
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hashHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
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

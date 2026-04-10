import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch the current ALGO to USD price from CoinGecko.
 * Updates every 60 seconds.
 */
export function useAlgoPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd');
        if (!response.ok) {
          throw new Error('CoinGecko 429/CORS Limit - Using fallback price');
        }
        const data = await response.json();
        
        if (isMounted && data.algorand && data.algorand.usd) {
          setPrice(data.algorand.usd);
          setLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Algo Price Fetch Error (CORS/429): using $0.20 fallback');
          setPrice(0.20); // Fallback price for hackathon robustness
          setError(err);
          setLoading(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPrice();
    
    // Poll every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { price, loading, error };
}

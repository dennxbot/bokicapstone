// Currency conversion and formatting utilities
// 1 USD = 59 PHP (Philippine Peso)

export const EXCHANGE_RATE = {
  USD_TO_PHP: 59
};

/**
 * Convert USD amount to Philippine Peso
 * @param usdAmount - Amount in USD
 * @returns Amount in PHP
 */
export const convertUSDToPHP = (usdAmount: number): number => {
  return usdAmount * EXCHANGE_RATE.USD_TO_PHP;
};

/**
 * Convert PHP amount to USD
 * @param phpAmount - Amount in PHP
 * @returns Amount in USD
 */
export const convertPHPToUSD = (phpAmount: number): number => {
  return phpAmount / EXCHANGE_RATE.USD_TO_PHP;
};

/**
 * Format amount as Philippine Peso currency
 * @param amount - Amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string
 */
export const formatPHP = (amount: number, showDecimals: boolean = true): string => {
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  
  return formatter.format(amount);
};

/**
 * Format amount as simple peso string with ₱ symbol
 * @param amount - Amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string (e.g., "₱59.00")
 */
export const formatPesoSimple = (amount: number, showDecimals: boolean = true): string => {
  // Handle undefined or null values
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₱0.00';
  }
  
  const decimals = showDecimals ? 2 : 0;
  return `₱${amount.toFixed(decimals)}`;
};

/**
 * Convert USD price to PHP and format it
 * @param usdPrice - Price in USD
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted PHP price string
 */
export const convertAndFormatPrice = (usdPrice: number, showDecimals: boolean = true): string => {
  const phpPrice = convertUSDToPHP(usdPrice);
  return formatPesoSimple(phpPrice, showDecimals);
};

/**
 * Get the currency symbol for PHP
 * @returns PHP currency symbol
 */
export const getCurrencySymbol = (): string => {
  return '₱';
};

/**
 * Parse a price string and convert to number
 * @param priceString - Price string (e.g., "₱59.00", "$1.00")
 * @returns Numeric value
 */
export const parsePriceString = (priceString: string): number => {
  // Remove currency symbols and parse
  const numericValue = parseFloat(priceString.replace(/[₱$,]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
};
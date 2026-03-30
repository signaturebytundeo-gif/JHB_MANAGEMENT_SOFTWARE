import type { SyncPlatform } from '@prisma/client';

type PlatformKey = 'SQUARE' | 'AMAZON' | 'ETSY';

const REQUIRED_ENV: Record<PlatformKey, string[]> = {
  SQUARE: ['SQUARE_ACCESS_TOKEN'],
  AMAZON: ['AMAZON_SP_CLIENT_ID', 'AMAZON_SP_CLIENT_SECRET', 'AMAZON_SP_REFRESH_TOKEN'],
  ETSY: ['ETSY_API_KEY', 'ETSY_SHOP_ID', 'ETSY_ACCESS_TOKEN'],
};

export function isPlatformConfigured(platform: SyncPlatform): boolean {
  const keys = REQUIRED_ENV[platform];
  return keys.every((key) => !!process.env[key]);
}

export function getMissingEnvVars(platform: SyncPlatform): string[] {
  const keys = REQUIRED_ENV[platform];
  return keys.filter((key) => !process.env[key]);
}

export function getSquareConfig() {
  return {
    accessToken: (process.env.SQUARE_ACCESS_TOKEN ?? '').trim(),
    environment: ((process.env.SQUARE_ENVIRONMENT ?? 'sandbox').trim()) as 'sandbox' | 'production',
  };
}

export function getAmazonConfig() {
  return {
    clientId: (process.env.AMAZON_SP_CLIENT_ID ?? '').trim(),
    clientSecret: (process.env.AMAZON_SP_CLIENT_SECRET ?? '').trim(),
    refreshToken: (process.env.AMAZON_SP_REFRESH_TOKEN ?? '').trim(),
    marketplaceId: (process.env.AMAZON_SP_MARKETPLACE_ID ?? 'ATVPDKIKX0DER').trim(),
  };
}

export function getEtsyConfig() {
  return {
    apiKey: (process.env.ETSY_API_KEY ?? '').trim(),
    sharedSecret: (process.env.ETSY_SHARED_SECRET ?? '').trim(),
    shopId: (process.env.ETSY_SHOP_ID ?? '').trim(),
    accessToken: (process.env.ETSY_ACCESS_TOKEN ?? '').trim(),
  };
}

/**
 * 地理定位数据接口
 */
export interface GeolocationData {
  /** IP 地址 */
  ip: string;

  /** 国家名称（英文） */
  country: string;

  /** 国家代码（ISO 3166-1 alpha-2，如 US, CN） */
  countryCode: string;

  /** 城市名称 */
  city: string;

  /** 地区/省份名称（可选） */
  region?: string;

  /** 纬度（可选） */
  latitude?: number;

  /** 经度（可选） */
  longitude?: number;

  /** 时区（可选，如 America/Los_Angeles） */
  timezone?: string;

  /** 数据来源 */
  source: 'cache' | 'offline' | 'online-primary' | 'online-fallback';

  /** 数据置信度 */
  confidence: 'high' | 'medium' | 'low';

  /** 时间戳（Unix 毫秒） */
  timestamp: number;
}

/**
 * geoip-lite 库返回的数据格式
 */
export interface GeoipLiteResult {
  range: [number, number];
  country: string;
  region: string;
  eu: string;
  timezone: string;
  city: string;
  ll: [number, number]; // [latitude, longitude]
  metro: number;
  area: number;
}

/**
 * ip-api.com API 返回的数据格式
 */
export interface IpApiComResult {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
  message?: string;
}

/**
 * ipapi.co API 返回的数据格式
 */
export interface IpApiCoResult {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_code: string;
  country_name: string;
  continent_code: string;
  in_eu: boolean;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  languages: string;
  asn: string;
  org: string;
  error?: boolean;
  reason?: string;
}

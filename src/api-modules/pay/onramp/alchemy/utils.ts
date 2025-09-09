import * as crypto from 'crypto';
/**
 * 获取请求路径
 */
export const getPath = (requestUrl: string, baseUrl: string) => {
  try {
    const uri = new URL(requestUrl, baseUrl);
    const path = uri.pathname;
    const params = Array.from(uri.searchParams.entries());

    if (params.length === 0) {
      return path;
    }

    const sortedParams = [...params].sort(([aKey], [bKey]) =>
      aKey.localeCompare(bKey),
    );
    const queryString = sortedParams
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return `${path}?${queryString}`;
  } catch (error) {
    console.error('Invalid URL:', requestUrl);
    return requestUrl;
  }
};

/**
 * 处理 JSON 请求体
 */
export const getJsonBody = (body: string) => {
  if (!body || body.trim() === '') {
    return '';
  }

  let map: Record<string, any>;

  try {
    map = JSON.parse(body);
  } catch (error) {
    console.error('Invalid JSON body:', error);
    return '';
  }

  if (Object.keys(map).length === 0) {
    return '';
  }

  map = removeEmptyKeys(map);
  map = sortObject(map);

  return JSON.stringify(map);
};

/**
 * 移除空值键
 */
export const removeEmptyKeys = (
  map: Record<string, any>,
): Record<string, any> => {
  const retMap: Record<string, any> = {};

  for (const [key, value] of Object.entries(map)) {
    if (value !== null && value !== '' && value !== undefined) {
      retMap[key] = value;
    }
  }

  return retMap;
};

/**
 * 排序对象
 */
export const sortObject = (obj: any): any => {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return sortList(obj);
    } else {
      return sortMap(obj);
    }
  }

  return obj;
};

/**
 * 排序 Map
 */
export const sortMap = (map: Record<string, any>): Record<string, any> => {
  const sortedMap = new Map(
    Object.entries(removeEmptyKeys(map)).sort(([aKey], [bKey]) =>
      aKey.localeCompare(bKey),
    ),
  );

  for (const [key, value] of sortedMap.entries()) {
    if (typeof value === 'object' && value !== null) {
      sortedMap.set(key, sortObject(value));
    }
  }

  return Object.fromEntries(sortedMap.entries());
};

/**
 * 排序列表
 */
export const sortList = (list: any[]): any[] => {
  const objectList: any[] = [];
  const intList: number[] = [];
  const floatList: number[] = [];
  const stringList: string[] = [];
  const jsonArray: any[] = [];

  for (const item of list) {
    if (typeof item === 'object' && item !== null) {
      jsonArray.push(item);
    } else if (Number.isInteger(item)) {
      intList.push(item);
    } else if (typeof item === 'number') {
      floatList.push(item);
    } else if (typeof item === 'string') {
      stringList.push(item);
    } else {
      intList.push(item);
    }
  }

  intList.sort((a, b) => a - b);
  floatList.sort((a, b) => a - b);
  stringList.sort();

  objectList.push(...intList, ...floatList, ...stringList, ...jsonArray);
  list.length = 0;
  list.push(...objectList);

  const retList: any[] = [];

  for (const item of list) {
    if (typeof item === 'object' && item !== null) {
      retList.push(sortObject(item));
    } else {
      retList.push(item);
    }
  }

  return retList;
};

/**
 * 生成支付ID
 */
export const generatePaymentId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成随机ID
 */
export const generateRandomId = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * 生成随机令牌
 */
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('base64');
};

/**
 * 生成随机签名
 */
export const generateRandomSignature = (): string => {
  return crypto.randomBytes(64).toString('base64');
};

/**
 * 生成追踪ID
 */
export const generateTraceId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

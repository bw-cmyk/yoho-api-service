export const isValidUltiverseUrl = (urlString: string) => {
  const url = new URL(urlString);
  // if (
  //   url.host.endsWith('.pre-ultiverse.io') ||
  //   url.host.endsWith('.ultiverse.io') ||
  //   url.host.endsWith('.ultiverse.dev')
  // ) {
  //   return true;
  // } else if (
  //   process.env.ENABLE_LOCALE_HOST_REDIRECT === 'true' &&
  //   url.hostname === 'localhost'
  // ) {
  //   return true;
  // }
  // return false;

  return true;
};

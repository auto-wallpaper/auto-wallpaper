import type { FetchOptions, Response } from "@tauri-apps/api/http";
import { getClient } from "@tauri-apps/api/http";
import * as tough from "tough-cookie";
import { log } from "./log";

type FetchImpl = <T>(
  url: string,
  options: FetchCookieWrapperOptions,
) => Promise<Response<T>>;

type FetchCookieWrapperOptions = FetchOptions & {
  redirect?: string;
  redirectCount?: number;
  maxRedirect?: number;
  throwOnFail?: boolean;
};

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is.js#L68>.
function isDomainOrSubdomain(destination: string, original: string): boolean {
  const orig = new URL(original).hostname;
  const dest = new URL(destination).hostname;

  return orig === dest || orig.endsWith(`.${dest}`);
}

// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is-redirect.js>.
const redirectStatus = new Set([301, 302, 303, 307, 308]);

function isRedirect(status: number): boolean {
  return redirectStatus.has(status);
}

// Adapted from <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/index.js#L161>.
async function handleRedirect<T>(
  fetchImpl: FetchImpl,
  options: FetchCookieWrapperOptions,
  response: Response<T>,
): Promise<Response<T>> {
  switch (options.redirect ?? "follow") {
    case "error":
      void log.wallpaperGeneration.error(`URI requested responded with a redirect and redirect mode is set to error: ${response.url}`)
      throw new TypeError(
        `URI requested responded with a redirect and redirect mode is set to error: ${response.url}`,
      );
    case "manual":
      return response;
    case "follow":
      break;
    default:
      void log.wallpaperGeneration.error(`Invalid redirect option: ${options.redirect as RequestRedirect}`)
      throw new TypeError(
        `Invalid redirect option: ${options.redirect as RequestRedirect}`,
      );
  }

  const locationUrl = response.headers.location;

  if (!locationUrl) {
    return response;
  }

  // We can use `response.url` here since we force `redirect` to `manual`.
  const requestUrl = response.url;
  const redirectUrl = new URL(locationUrl, requestUrl).toString();

  const redirectCount = options.redirectCount ?? 0;
  const maxRedirect = options.maxRedirect ?? 20;

  if (redirectCount >= maxRedirect) {
    void log.wallpaperGeneration.error(`Reached maximum redirect of ${maxRedirect} for URL: ${requestUrl}`)
    throw new TypeError(
      `Reached maximum redirect of ${maxRedirect} for URL: ${requestUrl}`,
    );
  }

  options = {
    ...options,
    redirectCount: redirectCount + 1,
  };

  // Do not forward sensitive headers to third-party domains.
  if (!isDomainOrSubdomain(requestUrl, redirectUrl)) {
    for (const name of [
      "authorization",
      "www-authenticate",
      "cookie",
      "cookie2",
    ]) {
      if (options.headers) {
        delete options.headers[name];
      }
    }
  }

  // const maybeNodeStreamBody = options.body as unknown as Readable
  // const maybeStreamBody = options.body as ReadableStream

  // if (response.status !== 303 && options.body != null && (typeof maybeNodeStreamBody.pipe === 'function' || typeof maybeStreamBody.pipeTo === 'function')) {
  //     throw new TypeError('Cannot follow redirect with body being a readable stream')
  // }

  if (
    response.status === 303 ||
    ((response.status === 301 || response.status === 302) &&
      options.method === "POST")
  ) {
    options.method = "GET";
    options.body = undefined;

    if (options.headers) {
      delete options.headers["content-length"];
    }
  }

  return await fetchImpl(redirectUrl, options);
}

function addCookiesToRequest(
  options: FetchOptions,
  cookie: string,
): FetchOptions {
  if (cookie === "") {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      cookie,
    },
  };
}

function getCookiesFromResponse(response: Response<unknown>): string[] {
  return response.rawHeaders["set-cookie"] ?? [];
}

type AppFetchOptions = FetchOptions & { throwOnFail?: boolean }

export default function fetchCookie(
  {
    jar,
    ...defaultOptions
  }: Partial<AppFetchOptions> & { jar?: tough.CookieJar } = {},
  ignoreError = true,
) {
  const actualJar = jar ?? new tough.CookieJar();

  async function fetchCookieWrapper<T>(
    url: string,
    _options: AppFetchOptions,
  ): Promise<Response<T>> {
    const client = await getClient({ maxRedirections: 0 });

    // Force manual redirects to forward cookies during redirects.
    let options: FetchCookieWrapperOptions = {
      ...defaultOptions,
      ..._options,
      headers: {
        ...defaultOptions.headers,
        ..._options.headers,
      },
      query: {
        ...defaultOptions.query,
        ..._options.query,
      },
      redirect: "manual",
    };

    // Resolve request URL.
    //
    // FWIW it seems that `fetch` allows passing an URL object e.g. with a `href` property, but
    // TypeScript's `RequestInfo` type doesn't know about that, hence the `any` to still check for it.
    //
    // TypeScript is still so very fragile...

    // Get matching cookie for resolved request URL.
    const cookie = await actualJar.getCookieString(url);

    // Add cookie header to request.
    options = addCookiesToRequest(options, cookie);

    // Proxy to `fetch` implementation.
    void log.wallpaperGeneration.info("requesting to", url, "with options:", options)
    const response = await client.request<T>({
      url,
      ...options,
    });
    void log.wallpaperGeneration.info("response from", url, ":", response);

    await client.drop();
    // Get response cookies.
    const cookies = getCookiesFromResponse(response);

    // Store cookies in the jar for that URL.
    await Promise.all(
      cookies.map((cookie) =>
        actualJar.setCookie(cookie, response.url, { ignoreError }),
      ),
    );

    // Do this check here to allow tail recursion of redirect.
    if ((options.redirectCount ?? 0) > 0) {
      Object.defineProperty(response, "redirected", { value: true });
    }

    if (!isRedirect(response.status)) {
      if (options.throwOnFail && !response.ok) {
        void log.wallpaperGeneration.error("Error during request", url, ":", response.data)
        throw response.data
      }
      return response;
    }

    // Recurse into redirect.
    return await handleRedirect(fetchCookieWrapper, options, response);
  }

  fetchCookieWrapper.toughCookie = tough;
  fetchCookieWrapper.jar = actualJar;
  fetchCookieWrapper.defaults = defaultOptions;

  return fetchCookieWrapper;
}

fetchCookie.toughCookie = tough;

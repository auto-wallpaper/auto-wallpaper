import { fetch } from "@tauri-apps/api/http";
import { UserStore } from "~/stores/user";
import { log } from "~/utils/log";

type VariableHandler = () => Promise<string | null> | string | null;

export const VARIABLE_REGEX = /\$([\w_]+)/g;

class PromptEngine {
    private variables = new Map<string, VariableHandler>();

    addVariable(name: string, handler: VariableHandler) {
        this.variables.set(name.toLowerCase(), handler);
    }

    private handleVariable(name: string) {
        name = name.startsWith("$") ? name.slice(1) : name;

        const variableHandler = this.variables.get(name);

        if (!variableHandler) {
            void log.wallpaperGeneration.error(`variable $${name} is not recognized`)
            throw new Error(`variable $${name} is not recognized`);
        }

        return variableHandler();
    }

    async build(str: string) {
        str = str.trim().split("\n").join(" ");

        const VARIABLE_REGEX = /\$([\w_]+)/g;

        const regex = str.matchAll(VARIABLE_REGEX);

        const cache: Record<string, string> = {};

        const promises: Promise<void>[] = [];

        for (const item of regex) {
            promises.push(
                (async () => {
                    const variableName = item[0].toLowerCase();

                    if (!cache[variableName]) {
                        const value = await this.handleVariable(variableName);

                        if (!value) {
                            throw new Error(`No value has been set for ${item[0]} variable`);
                        }

                        cache[variableName] = value;
                    }

                    str = str.replace(item[0], cache[variableName]!);
                })(),
            );
        }

        await Promise.all(promises);

        return str;
    }

    validate(str: string) {
        str = str.trim().split("\n").join(" ");

        const regex = str.matchAll(VARIABLE_REGEX);

        for (const item of regex) {
            const variableName = item[0].toLowerCase();
            const shortName = variableName.startsWith("$") ? variableName.slice(1) : variableName;

            if (!this.variables.has(shortName)) {
                throw new Error(`variable ${item[0]} is not recognized`);
            }
        }

        return true;
    }
}

export const promptEngine = new PromptEngine();

promptEngine.addVariable("LOCATION_NAME", async () => {
    const location = await UserStore.location.get()

    if (!location) throw new Error("location not defined")

    return location.name
})

promptEngine.addVariable("COUNTRY", async () => {
    const location = await UserStore.location.get()

    if (!location) throw new Error("location not defined")

    return location.country
})

promptEngine.addVariable("DAY_TIME", async () => {
    const location = await UserStore.location.get()

    if (!location) throw new Error("location not defined")

    const map = {
        Midnight: [0, 6],
        Sunrise: [6, 8],
        "Early Morning": [8, 11],
        Midday: [11, 14],
        Afternoon: [14, 16],
        Sunset: [16, 18],
        Evening: [18, 20],
        Night: [20, 24],
    } as const;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: location.timezone, hour: "numeric", hourCycle: "h24" });
    const h = +(formatter.formatToParts(now).find(part => part.type === 'hour')?.value ?? now.getHours());

    const [dayTime] = Object.entries(map).find(([_, [start, end]]) => {
        if (h >= start && h < end) {
            return true;
        }
    })!;

    return dayTime;
});

type ForecastResponse = {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    current_units: {
        time: string;
        interval: string;
        weather_code: string;
    };
    current: {
        time: string;
        interval: number;
        weather_code: number;
    }
}

type Cache = {
    locationId: number;
    data: string;
    cachedAt: Date;
} | null

const weatherCodesMap: Record<string, string> = {
    "0": "clear skies",
    "1": "mainly clear skies",
    "2": "partly cloudy skies",
    "3": "overcast skies",
    "45": "a blanket of fog",
    "48": "depositing rime fog",
    "51": "light drizzle",
    "53": "moderate drizzle",
    "55": "dense drizzle",
    "56": "light freezing drizzle",
    "57": "dense freezing drizzle",
    "61": "slight rain",
    "63": "moderate rain",
    "65": "heavy rain",
    "66": "light freezing rain",
    "67": "heavy freezing rain",
    "71": "slight snowfall",
    "73": "moderate snowfall",
    "75": "heavy snowfall",
    "77": "a flurry of snow grains",
    "80": "slight rain showers",
    "81": "moderate rain showers",
    "82": "violent rain showers",
    "85": "slight snow showers",
    "86": "heavy snow showers",
    "95": "a slight thunderstorm",
    "96": "a thunderstorm with slight hail",
    "99": "a thunderstorm with heavy hail"
}

let cache: Cache = null

promptEngine.addVariable("WEATHER", async () => {
    const location = await UserStore.location.get()

    if (!location) throw new Error("location not defined")

    if (cache && (cache.cachedAt.getTime() + 60_000 > Date.now() || cache.locationId !== location?.id)) return cache.data

    const resp = await fetch<ForecastResponse>("https://api.open-meteo.com/v1/forecast", {
        method: "GET",
        query: {
            latitude: location.latitude?.toString(),
            longitude: location.longitude?.toString(),
            current: "weather_code"
        },
        timeout: 30
    })

    const { current: { weather_code } } = resp.data

    cache = {
        locationId: location.id,
        data: weatherCodesMap[weather_code] ?? "",
        cachedAt: new Date()
    }

    return cache.data
});

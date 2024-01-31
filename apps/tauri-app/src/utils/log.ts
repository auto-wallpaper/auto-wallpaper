import { debug, error, info, trace, warn } from "tauri-plugin-log-api";

const truncateObjectStringsAndArrays = <T>(obj: T, maxLength: number): T => {
    // Base case: if obj is not an object, return it as is
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }

    // Create a new object to hold truncated values
    const truncatedObj: Record<string, unknown> = {} as never;

    // Recursively truncate string values in nested objects or arrays
    for (const key in obj) {
        const value = obj[key]

        if (typeof value === 'string') {
            truncatedObj[key] = value.length > maxLength ? value.substring(0, maxLength) + '... (truncated)' : value;
        } else if (Array.isArray(value)) {
            truncatedObj[key] = value.length > maxLength ?
                value.slice(0, maxLength).concat(`... (${value.length - maxLength} more items truncated)`) :
                value.map(item => truncateObjectStringsAndArrays(item as never, maxLength));
        } else if (typeof obj[key] === 'object') {
            truncatedObj[key] = truncateObjectStringsAndArrays(obj[key], maxLength);
        } else {
            truncatedObj[key] = obj[key]; // For non-string, non-array, non-object values, simply copy them
        }
    }

    return truncatedObj as T;
}


const makeLogMessage = (messages: unknown[]) => {
    return messages
        .map(item => truncateObjectStringsAndArrays(item, 100))
        .map(item =>
            typeof item === "number" || typeof item === "string"
                ? item.toString()
                : JSON.stringify(item)
        )
        .join(" ")
}

const makeLog = ({ file }: { file: string }) => {
    return {
        info: (...messages: unknown[]) => info(makeLogMessage(messages), {
            file
        }),
        error: (...messages: unknown[]) => error(makeLogMessage(messages), {
            file
        }),
        warn: (...messages: unknown[]) => warn(makeLogMessage(messages), {
            file
        }),
        debug: (...messages: unknown[]) => debug(makeLogMessage(messages), {
            file
        }),
        trace: (...messages: unknown[]) => trace(makeLogMessage(messages), {
            file
        }),
    }
}

export const log = {
    wallpaperGeneration: makeLog({
        file: "wallpaper-generation.log"
    })
}

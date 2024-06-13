import type { z } from "zod";
import { Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import type { RequireAllOrNone } from "type-fest"

type Value<TValue, TDefaultValue> = TDefaultValue extends NonNullable<unknown> ? TValue : TValue | null

type FieldOptions<TSchema extends z.Schema<unknown>, TDefaultValue extends z.input<TSchema>> = {
  schema: TSchema;
  defaultValue?: TDefaultValue;
  onChange?: (value: Value<z.output<TSchema>, TDefaultValue>) => void;
} & RequireAllOrNone<{
  version: string;
  up: (prev: unknown, defaultValue: Value<z.output<TSchema>, TDefaultValue>) => z.input<TSchema>
}, "up" | "version">;

type Field<TSchema extends z.Schema<unknown>, TDefaultValue> = {
  $inferInput: z.input<TSchema>;
  $inferOutput: z.output<TSchema>;
  schema: TSchema;
  set: (value: z.input<TSchema> | ((prev: Value<z.output<TSchema>, TDefaultValue>) => z.input<TSchema>)) => Promise<z.output<TSchema>>;
  get: () => Promise<Value<z.output<TSchema>, TDefaultValue>>;
  validate: (value: z.input<TSchema>) => Promise<z.output<TSchema>>;
  onChange: (cb: (value: Value<z.output<TSchema>, TDefaultValue>) => void) => Promise<() => void>;
  useValue: {
    (): Value<z.output<TSchema>, TDefaultValue> | null;
    <T = Value<z.output<TSchema>, TDefaultValue>>(selector: (state: Value<z.output<TSchema>, TDefaultValue>) => T): T | null;
  }
}

export const makeField = <TSchema extends z.Schema<unknown>, TDefaultValue extends z.input<TSchema>>(
  { schema, defaultValue, onChange, ...other }: FieldOptions<TSchema, TDefaultValue>,
) => {
  return ({ key, store }: { key: string, store: Store }): Field<TSchema, TDefaultValue> => {
    const initialization = (async () => {
      if (onChange)
        await store.onKeyChange<z.output<TSchema>>(key, onChange)

      const doesKeyExist = await store.has(key)

      if (!doesKeyExist && typeof defaultValue !== "undefined") {
        const parsedValue = schema ? await schema.parseAsync(defaultValue) : defaultValue;
        await store.set(key, parsedValue);
      }

      if (doesKeyExist) {
        const currentVersion = await store.get<string>(`${key}.version`)

        if (other.version && currentVersion !== other.version) {
          const updatedValue = other.up(await store.get(key), defaultValue)

          await store.set(key, await schema.parseAsync(updatedValue))
        }
      }

      if (other.version) {
        await store.set(`${key}.version`, other.version)
      }

      await store.save()
    })();

    const field: Field<TSchema, TDefaultValue> = {
      $inferInput: undefined as never,
      $inferOutput: undefined as never,
      schema: schema,
      set: async (value) => {
        await initialization

        value = value instanceof Function ? value(await field.get()) : value

        const parsedValue = schema ? await schema.parseAsync(value) : value;
        await store.set(key, parsedValue);
        await store.save();

        return parsedValue
      },
      get: async () => {
        await initialization

        const data = await store.get<z.output<TSchema>>(key)

        return schema.parseAsync(data)
      },
      validate: (value) => {
        return schema.parseAsync(value);
      },
      onChange: (cb) => {
        return store.onKeyChange(key, cb)
      },
      useValue: <T = Value<z.output<TSchema>, TDefaultValue>>(selector?: (state: Value<z.output<TSchema>, TDefaultValue>) => T) => {
        const [value, setValue] = useState<T | null>(null);

        useEffect(() => {
          let unlisten: (() => void) | undefined;

          const handler = async () => {
            const value = await field.get()
            setValue(selector ? selector(value) : (value as T));

            unlisten = await store.onKeyChange<z.output<TSchema>>(key, async (value) => {
              const parsedValue = await schema.parseAsync(value);

              setValue(selector ? selector(parsedValue) : (parsedValue as T));
            })
          };

          void handler();

          return () => {
            unlisten?.();
          };
        }, [selector]);

        return value
      }
    };

    return field
  }
};

export const makeStore = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TFields extends Record<string, ReturnType<typeof makeField<any, any>>>
>(
  storePath: string,
  items: TFields,
): { [key in keyof TFields]: ReturnType<TFields[key]> } => {
  const store = new Store(storePath);

  const initialization = async () => {
    const keys = (await store.keys())
    const fields = Object.keys(items)

    const extraKeys = keys.filter((key) => {
      const name = key.split(".")[0]!

      return !fields.includes(name)
    })

    await Promise.all(extraKeys.map(key => store.delete(key)))

    await store.save()
  }

  void initialization()

  return Object.fromEntries(
    Object.entries(items).map(([key, make]) => {
      return [
        key,
        make({ key, store }),
      ];
    }),
  ) as never;
};

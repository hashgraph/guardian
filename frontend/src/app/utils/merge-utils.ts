export class MergeUtils {
  static deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
    const output: any = Array.isArray(target) ? [...target] : { ...target };

    for (const key of Object.keys(source) as Array<keyof U>) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];

      if(!sourceValue) {
        output[key] = targetValue;
      }
      else if (
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        output[key] = MergeUtils.deepMerge(
          targetValue && typeof targetValue === 'object' ? targetValue : {},
          sourceValue
        );
      } else {
        output[key] = sourceValue;
      }
    }

    return output as T & U;
  }
}

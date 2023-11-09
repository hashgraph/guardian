export function isNumber(value: any, name: string): void {
  if (typeof value !== 'number') {
    throw new TypeError(`"${name}" must be number.`);
  }
}

export function isPositiveInteger(value: any, name: string): void {
  if (!(Number.isInteger(value) && value > 0)) {
    throw new TypeError(`"${name}" must be a positive integer.`);
  }
}

export function isString(value: any, name: string): void {
  if (typeof value !== 'string') {
    throw new TypeError(`"${name}" must be a string.`);
  }
}

export function isBoolean(value: any, name: string): void {
  if (typeof value !== 'boolean') {
    throw new TypeError(`"${name}" must be a boolean.`);
  }
}

export function isNonNegativeInteger(value: any, name: string): void {
  if (!(Number.isInteger(value) && value >= 0)) {
    throw new TypeError(`"${name}" must be a non-negative integer.`);
  }
}

export function isUint8Array(value: any, name: string): void {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`"${name}" must be a Uint8Array.`);
  }
}

// Kiểm bản ghi theo JSON Schema 2020-12 của pipeline/schema/.
import Ajv2020 from 'ajv/dist/2020.js';
import { paths, readJson } from './io.mjs';

const cache = new Map();

export async function loadValidator(ctx, schemaFile) {
  const file = paths.schema(ctx, schemaFile);
  if (!cache.has(file)) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
    cache.set(file, ajv.compile(await readJson(file)));
  }
  return cache.get(file);
}

/** Lỗi dạng "/đường/dẫn: thông điệp", rỗng nếu hợp lệ. */
export function schemaErrors(validate, value) {
  if (validate(value)) return [];
  return validate.errors.map((err) => ({ path: err.instancePath || '/', message: `${err.instancePath || '/'}: ${err.message}` }));
}

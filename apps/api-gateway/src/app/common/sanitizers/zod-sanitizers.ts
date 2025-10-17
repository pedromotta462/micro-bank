/**
 * Transformações de sanitização customizadas para Zod
 */

/**
 * Remove tags HTML e scripts (XSS protection)
 */
export const sanitizeHtml = (value: string): string => {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<[^>]*>/g, '') // Remove todas as tags HTML
    .trim();
};

/**
 * Remove caracteres especiais perigosos mantendo acentos
 */
export const sanitizeText = (value: string): string => {
  return value
    // eslint-disable-next-line no-useless-escape
    .replace(/[<>\"'`]/g, '') // Remove caracteres perigosos
    .trim();
};

/**
 * Normaliza espaços em branco
 */
export const normalizeSpaces = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

/**
 * Remove caracteres não numéricos (exceto hífens para contas bancárias)
 */
export const sanitizeNumericWithHyphen = (value: string): string => {
  return value.replace(/[^0-9-]/g, '');
};

/**
 * Remove todos os caracteres não numéricos
 */
export const sanitizeNumeric = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

/**
 * Normaliza URL removendo espaços e caracteres perigosos
 */
export const sanitizeUrl = (value: string): string => {
  try {
    const url = new URL(value);
    // Apenas permite http e https
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return url.toString();
  } catch {
    return value; // Deixa Zod validar como inválido
  }
};

/**
 * Sanitiza email removendo espaços
 */
export const sanitizeEmail = (value: string): string => {
  return value.toLowerCase().trim();
};

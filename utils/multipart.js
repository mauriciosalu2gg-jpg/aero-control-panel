/**
 * Parsea el header Content-Type para extraer el boundary.
 */
function getBoundary(contentType) {
  if (!contentType) return null;
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  return match[1] || match[2];
}

/**
 * Parsea peticiones multipart/form-data (archivos y campos de texto) en Netlify Functions.
 * @param {object} event El evento de la Lambda de Netlify
 * @returns {object} { fields: { [name]: value }, files: [ { filename, contentType, content } ] }
 */
export function parseMultipart(event) {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  const boundary = getBoundary(contentType);
  if (!boundary) {
    throw new Error('Content-Type no es multipart/form-data o falta boundary');
  }

  // Las lambdas reciben el body en base64 si es binario
  const buffer = event.isBase64Encoded 
    ? Buffer.from(event.body, 'base64') 
    : Buffer.from(event.body, 'binary');

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = buffer.indexOf(boundaryBuffer);

  while (index !== -1) {
    const nextIndex = buffer.indexOf(boundaryBuffer, index + boundaryBuffer.length);
    if (nextIndex === -1) break;

    // Extraer la parte entre los boundaries
    const part = buffer.slice(index + boundaryBuffer.length + 2, nextIndex - 2); // Excluir \r\n al final y principio
    parts.push(part);
    index = nextIndex;
  }

  const fields = {};
  const files = [];

  for (const part of parts) {
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headerText = part.slice(0, headerEndIndex).toString('utf8');
    const body = part.slice(headerEndIndex + 4);

    const nameMatch = headerText.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerText.match(/filename="([^"]+)"/i);
    if (filenameMatch) {
      const filename = filenameMatch[1];
      const contentTypeMatch = headerText.match(/content-type:\s*([^\s\r\n]+)/i);
      const fileContentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

      files.push({
        name,
        filename,
        contentType: fileContentType,
        content: body // El buffer binario con el contenido del archivo
      });
    } else {
      // Es un campo de texto normal
      fields[name] = body.toString('utf8');
    }
  }

  return { fields, files };
}

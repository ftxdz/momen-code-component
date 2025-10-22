/**
 * 飞书CURL工具函数
 * 用于解析CURL命令并替换body.mind_content
 */

// 解析CURL命令的接口
interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * 解析CURL命令字符串
 * @param curlString CURL命令字符串
 * @returns 解析后的CURL对象
 */
export function parseCurl(curlString: string): ParsedCurl | null {
  try {
    const lines = curlString
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length === 0 || !lines[0].startsWith('curl')) {
      throw new Error('不是有效的CURL命令');
    }

    const result: ParsedCurl = {
      method: 'POST', // 默认为POST
      url: '',
      headers: {},
      body: undefined,
    };

    let i = 1; // 跳过第一行的curl
    let currentSection = 'headers';
    let bodyLines: string[] = [];

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('--location') || line.startsWith('--request')) {
        // 处理请求方法
        if (line.includes('--request')) {
          const method = line.split(' ')[1];
          if (method) {
            result.method = method.toUpperCase();
          }
        }
      } else if (line.startsWith('--header')) {
        // 处理请求头
        const headerMatch = line.match(/--header\s+['"]([^'"]+)['"]/);
        if (headerMatch) {
          const headerStr = headerMatch[1];
          const colonIndex = headerStr.indexOf(':');
          if (colonIndex > 0) {
            const key = headerStr.substring(0, colonIndex).trim();
            const value = headerStr.substring(colonIndex + 1).trim();
            result.headers[key] = value;
          }
        }
      } else if (line.startsWith('--data')) {
        // 处理请求体
        currentSection = 'body';
        const dataMatch = line.match(/--data\s+['"](.*)['"]$/);
        if (dataMatch) {
          bodyLines.push(dataMatch[1]);
        } else if (line.includes('--data')) {
          // 多行数据的情况
          const dataStart = line.indexOf('--data') + 6;
          const dataContent = line.substring(dataStart).trim();
          if (dataContent.startsWith("'") || dataContent.startsWith('"')) {
            bodyLines.push(dataContent.slice(1, -1));
          } else {
            bodyLines.push(dataContent);
          }
        }
      } else if (line.startsWith("'") || line.startsWith('"')) {
        // 处理URL
        if (!result.url) {
          result.url = line.slice(1, -1);
        } else if (currentSection === 'body') {
          // 处理多行请求体
          bodyLines.push(line.slice(1, -1));
        }
      } else if (line.startsWith('http')) {
        // 处理URL（不带引号的情况）
        if (!result.url) {
          result.url = line;
        }
      } else if (currentSection === 'body' && line) {
        // 处理请求体的其他行
        bodyLines.push(line);
      }

      i++;
    }

    // 合并请求体
    if (bodyLines.length > 0) {
      result.body = bodyLines.join('\n');
    }

    if (!result.url) {
      throw new Error('未找到有效的URL');
    }

    return result;
  } catch (error) {
    console.error('解析CURL失败:', error);
    return null;
  }
}

/**
 * 替换CURL中的body.mind_content
 * @param curlString 原始CURL字符串
 * @param newMindContent 新的mind_content内容
 * @returns 替换后的CURL字符串
 */
export function replaceMindContent(
  curlString: string,
  newMindContent: string
): string {
  try {
    const parsed = parseCurl(curlString);
    if (!parsed || !parsed.body) {
      throw new Error('无法解析CURL或未找到请求体');
    }

    // 解析JSON请求体
    let bodyObj: any;
    try {
      bodyObj = JSON.parse(parsed.body);
    } catch (error) {
      throw new Error('请求体不是有效的JSON格式');
    }

    // 替换mind_content
    bodyObj.mind_content = newMindContent;

    // 重新构建CURL
    const newBody = JSON.stringify(bodyObj, null, 2);

    // 替换原始CURL中的--data部分
    const lines = curlString.split('\n');
    const newLines: string[] = [];
    let inDataSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('--data')) {
        inDataSection = true;
        // 检查是否是单行数据
        if (line.includes("'") || line.includes('"')) {
          const dataMatch = line.match(/--data\s+['"](.*)['"]$/);
          if (dataMatch) {
            newLines.push(`--data '${newBody}'`);
            inDataSection = false;
            continue;
          }
        }
        newLines.push(line);
      } else if (inDataSection) {
        // 检查是否是多行数据的结束
        if (
          line.trim() === '' ||
          line.startsWith('--') ||
          line.startsWith('curl')
        ) {
          newLines.push(`--data '${newBody}'`);
          newLines.push(line);
          inDataSection = false;
        }
        // 跳过数据行，不添加到newLines
      } else {
        newLines.push(line);
      }
    }

    // 如果还在数据部分，说明数据在最后
    if (inDataSection) {
      newLines.push(`--data '${newBody}'`);
    }

    return newLines.join('\n');
  } catch (error) {
    console.error('替换mind_content失败:', error);
    throw error;
  }
}

/**
 * 发送HTTP请求
 * @param parsedCurl 解析后的CURL对象
 * @returns 请求结果
 */
export async function sendHttpRequest(
  parsedCurl: ParsedCurl
): Promise<Response> {
  const { method, url, headers, body } = parsedCurl;

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = body;
  }

  try {
    const response = await fetch(url, requestOptions);
    return response;
  } catch (error) {
    console.error('HTTP请求失败:', error);
    throw error;
  }
}

/**
 * 验证CURL是否包含必要的飞书字段
 * @param curlString CURL字符串
 * @returns 是否有效
 */
export function validateFeishuCurl(curlString: string): boolean {
  try {
    const parsed = parseCurl(curlString);
    if (!parsed) return false;

    // 检查URL是否包含飞书域名
    if (!parsed.url.includes('feishu') && !parsed.url.includes('lark')) {
      return false;
    }

    // 检查是否包含必要的请求头
    const requiredHeaders = ['x-token', 'content-type'];
    const hasRequiredHeaders = requiredHeaders.some((header) =>
      Object.keys(parsed.headers).some((key) =>
        key.toLowerCase().includes(header.toLowerCase())
      )
    );

    if (!hasRequiredHeaders) {
      return false;
    }

    // 检查请求体是否包含mind_content
    if (parsed.body) {
      try {
        const bodyObj = JSON.parse(parsed.body);
        return bodyObj.hasOwnProperty('mind_content');
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

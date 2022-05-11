import download from 'download';
import path from 'path';
import fs from 'fs';
import tmp from 'tmp-promise';

export  function isValidHttpUrl(_url: string) {
  let url: URL
  try {
    url = new URL(_url);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * 返回tmp-promise创建的临时文件对象
 * @function tmpFile
 * @param postfix 一般是文件类型，例如：“.txt"
 * @param prefix 文件的开头，例如：“prefix-”
 * @param dir the optional temporary directory, fallbacks to system default (guesses from environment)
 * @return {Promise<tmp.FileResult>} 返回一个临时文件，tmp-promise创建的对象
 */
export function tmpFile(postfix?: string, prefix?: string, dir?: string): Promise<tmp.FileResult> {
  const options: { [key: string]: any } = {
    // dir: path.resolve('tmp')
  }
  if (dir) options.dir = dir
  if (prefix) options.prefix = prefix
  if (postfix) options.postfix = postfix
  return tmp.file(options)
}

/**
 * 从url下载一个文件，并保存在outputPath上
 * @param  {string} url 文件的url地址
 * @param  {string} outputPath 需要存储到的本地路径
 * @return {Promise<string>} 如果成功的话，则返回本地文件路径, 也就是outputPath
 */
export function downloadFile(url: string, outputPath: string): Promise<string> {
  outputPath = path.resolve(outputPath)
  return download(url).then(buffer => {
    return new Promise<string>((resolve, reject) => {
      fs.writeFile(outputPath, buffer, err => {
        if (err) reject(err)
        else resolve(outputPath)
      })
    })
  })
}
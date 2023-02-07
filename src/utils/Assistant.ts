/**
 * @CreateTime: 2023/02/01 02:47
 * @Project: captureImages
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/captureImages
 */

import { fileURLToPath } from "url";
import { dirname, resolve, normalize, basename, join } from "node:path";
import config from '../../config.json' assert { type: 'json' }
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { URL, urlToHttpOptions } from "node:url";
import axios from "axios";
import { appendFile, readFile, writeFile } from "fs/promises";
import cache from "../cache/cache.json" assert { type: 'json' };
import { EOL } from "os";
import https from 'https'

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
})
axios.defaults.headers.common["User-Agent"] = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36`
axios.defaults.timeout = config.timeout || 0

const instance = axios.create()
const historyImages = (await readFile(normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../logs/history.image')), 'utf-8')).split(EOL).filter(r => r.trim())
const absPath = normalize(resolve(dirname(fileURLToPath(import.meta.url)),config.destination))
export const DEFAULT_DIST = existsSync(absPath)? absPath : normalize(join(resolve(fileURLToPath(import.meta.url)), "../../../",config.destination))
export const DEFAULT_LOG = normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../logs'))
const DEFAULT_CACHE = normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../cache'))

export class Assistant {

    /**
     *
     * @param site 访问的页面网址
     * @param isSite 是否是需要解析的页面,默认为true
     * @param folderName
     */
    static async request(site: string, isSite: boolean = true, folderName: string = DEFAULT_DIST): Promise<string> {
        const domain = (urlToHttpOptions(new URL(site)).hostname) as string;
        instance.interceptors.request.use(configuration => {
            (config[domain] && config[domain]['cookie']) && (configuration.headers['cookie'] = config[domain]['cookie'])
            return configuration;
        }, _ => {
            console.log("err:", 'axios解析❌')
        })


        if (!isSite) {
            // 访问图片页面,返回over字符串
            if (historyImages.includes(site) && existsSync(normalize(resolve(dirname(fileURLToPath(import.meta.url)), folderName, basename(site))))) {
                console.log(`此图片已经完成下载,本次将忽略🍺🍺🍺`)
                return 'over'
            }
            const result = await instance.get(site, {
                httpsAgent,
                responseType: "arraybuffer",
                timeout: 7500
            }).catch(_ => {
                console.log('图片已删除')
                return null
            })
            if (result) {
                appendFile(normalize(resolve(dirname(fileURLToPath(import.meta.url)), folderName, basename(site))), result.data).then(() => {
                    if (Object.is(folderName, 'error')) {
                        console.log(normalize(resolve(dirname(fileURLToPath(import.meta.url)), folderName, basename(site))))
                    }
                    console.log('图片下载完成😍😍😍😍😍')
                    appendFile(join(DEFAULT_LOG, 'history.image'), site + EOL, 'utf-8')
                }).catch(error => {
                    console.warn('图片下载失败😭😭😭', site)
                    console.log('失败原因', error)
                })
            }
            return 'over'
        } else {
            if (cache[site]) {
                // 访问页面并且有缓存
                return cache[site]
            } else {
                // 访问页面且没有缓存
                const result = await instance.get(site, {httpsAgent})
                cache[site] = result.data
                await writeFile(normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../cache/cache.json')), JSON.stringify(cache, null, 2), 'utf-8')
                await appendFile(normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../logs/history.image')), site + EOL, 'utf-8') // todo 记录成访问日志
                return result.data
            }
        }
    }

    /**
     * 创建一个文件夹并返回文件夹的绝对路径
     * @param path 绝对路径
     * @param folderName 文件夹名
     *
     */
    public static createFolder(folderName: string, path: string = DEFAULT_DIST): string {
        const folderPath = normalize(resolve(dirname(fileURLToPath(import.meta.url)), path))
        if (!existsSync(folderPath)) {
            throw Error(`The folder name of ${ folderPath } configuration is incorrect,which does not exist`)
        } else {
            const fullPath = normalize(join(folderPath, folderName))
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath)
            }
            return fullPath
        }
    }

    public static init(): void {

        if (!existsSync(DEFAULT_DIST)) { // 创建默认存储路径
            mkdirSync(DEFAULT_DIST)
        }

        if (!existsSync(DEFAULT_LOG)) { // 创建默认日志路径
            mkdirSync(DEFAULT_LOG)
        }

        if (!existsSync(DEFAULT_CACHE)) { // 创建默认缓存路径
            mkdirSync(DEFAULT_CACHE)
        }
    }


    public static errorLog(errorInfo: string) {
        appendFileSync(normalize(resolve(dirname(fileURLToPath(import.meta.url)), DEFAULT_LOG, 'error.log')), errorInfo + EOL, 'utf-8')
    }
}

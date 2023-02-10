/**
 * @CreateTime: 2023/02/01 02:47
 * @Project: capture-images
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/capture-images
 */

import { basename, dirname, join, normalize, resolve } from "node:path";
import config from '../../config.json' assert { type: 'json' }
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { URL, urlToHttpOptions,fileURLToPath } from "node:url";
import axios from "axios";
import { appendFile, readFile} from "fs/promises";
import { EOL } from "os";
import https from 'https'

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
})
axios.defaults.headers.common["User-Agent"] = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36`
axios.defaults.timeout = config.timeout || 0

const instance = axios.create()
const historyPath = normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../logs/history.image'))
const histories = (existsSync(historyPath) && (await readFile(historyPath, 'utf-8')).split(EOL).filter(r => r.trim())) || []
const absPath = normalize(resolve(dirname(fileURLToPath(import.meta.url)), config.destination))
export const DEFAULT_DIST = existsSync(absPath) ? absPath : normalize(join(resolve(fileURLToPath(import.meta.url)), "../../../", config.destination))
export const DEFAULT_LOG = normalize(resolve(dirname(fileURLToPath(import.meta.url)), '../logs'))

export class Assistant {

    /**
     *
     * @param url 访问的页面网址
     * @param isSite 是否是需要解析的页面,默认为true
     * @param folderName
     */
    static async request(url: string, isSite: boolean = true, folderName: string = DEFAULT_DIST): Promise<string> {
        const domain = (urlToHttpOptions(new URL(url)).hostname) as string;
        instance.interceptors.request.use(configuration => {
            (config[domain]['cookie']) && (configuration.headers['cookie'] = config[domain]['cookie'])
            (config[domain].timeout || config.timeout) && (configuration.timeout = config[domain].timeout || config.timeout)
            config[domain].token && (configuration.headers[config[domain].token[0]] = config[domain].token[1])
            return configuration;
        }, _ => {console.log("err:", 'axios解析❌')})


        if (!isSite) {
            // 访问图片页面,返回over字符串
            if (histories.includes(url) && existsSync(normalize(resolve(dirname(fileURLToPath(import.meta.url)), folderName, basename(url))))) {
                console.log(`图片已存在🍺🍺🍺`)
                return url
            }else {
                return instance.get(url, {
                    httpsAgent,
                    responseType: "arraybuffer",
                    timeout: config[domain].timeout || config.timeout || 0
                }).then( r => {
                    return appendFile(normalize(resolve(dirname(fileURLToPath(import.meta.url)), folderName, basename(url))), r.data).then( () => {
                        console.log('图片下载完成💾💾💾')
                        appendFile(historyPath, url + EOL, 'utf-8')
                        return url
                    }).catch(e => e.message)
                }).catch( e => {
                    this.errorLog(`site: ${url}, errorType: ${e.message}`)
                })
            }
        } else {
            return instance.get(url, {httpsAgent}).then(async result => {
                if (Object.is(result.status, 200)) {
                    return result.data
                }
            }).catch(() => Promise.reject('网站无法访问'))
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
    }


    public static errorLog(errorInfo: string) {
        appendFileSync(normalize(resolve(dirname(fileURLToPath(import.meta.url)), DEFAULT_LOG, 'error.log')), errorInfo + EOL, 'utf-8')
    }
}

/**
 * @CreateTime: 2023/02/01 02:06
 * @Project: captureImages
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/captureImages
 */

import { load } from "cheerio";
import { URL, urlToHttpOptions } from "node:url";
import config from '../../config.json' assert { type: 'json' }
import { IResolveParam } from "./types/IResolveParam.js";
import { Assistant, DEFAULT_DIST } from "../utils/Assistant.js";
import { IWorkFlow } from "./types/IWorkFlow.js";
import { ICategoryResult } from "./types/ICategoryResult.js";
import { IPaginationResult } from "./types/IPaginationResult.js"
import { basename, extname } from "node:path";


export class Spider {
    /**
     * @param site 入口站点
     * @param index 截取工作流
     */
    static async entry(site: string, index: number | undefined = 0) {
        if (site) {
            Assistant.init() // 初始化
            const hostname = this.getHostname(site)
            const path = Assistant.createFolder(hostname as string)
            let workFlows = config[hostname as string].workflows as IWorkFlow[]
            if (index) {
                workFlows = workFlows.slice(-index)
            } else {
                workFlows = workFlows.slice()
            }
            return await this.assemblyLine(site, workFlows, path)
        } else {
            console.warn('入口站点为空,必须给一个入口网址')
        }
    }

    /**
     * 根据workflow自动运行的流水线
     * @param site
     * @param workflows
     * @param path
     * @private
     */
    private static async assemblyLine(site, workflows: IWorkFlow[], path: string = DEFAULT_DIST) {
        if (workflows.length) {
            const workflow = workflows.shift() as IWorkFlow
            const result = await this.action(site, workflow as IWorkFlow)
            if (result) {
                if (Object.is(workflow?.type, 'category') && workflows.length) {
                    for (const datum of result as ICategoryResult[]) {
                        // 给每个分类创建文件夹名
                        if (workflow.included) {
                            if (workflow.included.includes(datum.link)) {
                                const savePath = Assistant.createFolder(datum.foldName, path)
                                await this.assemblyLine(datum.link, [ ...workflows ], savePath)
                            }
                        } else {
                            if (workflow.excluded && workflow.excluded.includes(datum.link)) {
                                continue
                            }
                            const savePath = Assistant.createFolder(datum.foldName, path)
                            await this.assemblyLine(datum.link, [ ...workflows ], savePath)
                        }

                    }
                } else if (Object.is(workflow?.type, 'category') && !workflows.length) {
                    for (const datum of result as ICategoryResult[]) {
                        // 给每个分类创建文件夹名
                        const savePath = Assistant.createFolder(datum.foldName, path)
                        if (config.sync) {
                            await this.assemblyLine(datum.link, [ ...workflows ], savePath)
                        } else {
                            this.assemblyLine(datum.link, [ ...workflows ], savePath)
                        }
                    }
                } else {
                    // 分页处理
                    if ('reg' in workflow) {

                        for (let i = 1; "total" in result && i <= result.total; i++) {
                            // 根据结果得到文件夹名
                            let savePath: string
                            if (!Object.is(basename(path), result.foldName)) {
                                savePath = Assistant.createFolder(result.foldName, path)
                            } else {
                                savePath = path
                            }
                            if (Object.is(result.total, 1)) {
                                await this.assemblyLine(result.template, [ ...workflows ], savePath)
                                break
                            }
                            // 遍历置换分页页码网址
                            const str = workflow.reg + result.total.toString()
                            const link = result.template.replace(new RegExp(str), workflow.reg + i.toString())
                            await this.assemblyLine(link, [ ...workflows ], savePath)
                        }
                    } else {
                        return `分页workflow 缺少正则 ${ workflow }`
                    }
                }
            } else {
                return `：：：：：：：此页 ${ site } 已经在配置中排除：：：：：：：🈹🈹🈹`
            }
        } else {
            // 下载图片页面
            await Assistant.request(site, false, path)
        }
    }

    /**
     * 获得所有分页或分类页面
     * @param site url
     * @param option workflow
     */
    public static async action(site: string, option: IWorkFlow) {
        const siteHtml = await Assistant.request(site) as string

        return this.resolveSite({
            site,
            siteHtml,
            ...option
        });
    }

    /**
     * 获取请求的网页的hostname
     * @param site url
     */
    private static getHostname(site: string) {
        return urlToHttpOptions(new URL(site)).hostname
    }

    /**
     * 解析页面
     * @param param IResolveParam
     */
    public static resolveSite(param: IResolveParam): ICategoryResult[] | IPaginationResult | null {
        console.log(`********开始解析 ${ param.site } ********`)
        // 解析的是非图片地址
        const picArr = [ '.jpg', '.jpeg', '.gif', '.webp', '.bmp' ]
        const ext = extname(param.site)
        if (picArr.includes(ext)) {
            return [ {
                foldName: 'error',
                link: param.site
            } ]
        }
        const $ = load(param.siteHtml)
        const hostname = this.getHostname(param.site)
        const sign = $(config[hostname as string].pageSign)
        if (Object.is(param.type, 'pagination')) { // 分页
            if (!$(param.selector).length) {
                if (sign.length) {
                    const error = `未找到要查询的【分页】元素，page：${ param.site }，selector：${ param.selector },type:${ param.type }`
                    console.warn(error)
                    Assistant.errorLog(error)
                    return null;
                } else {
                    // 没有找到分页标识，说明只有单页面
                    return {
                        foldName: $(param.titleSelector).text().trim().replace(/\s/g, ''),
                        template: param.site,
                        total: 1
                    }
                }

            } else {
                const result: IPaginationResult = {
                    foldName: "",
                    template: "",
                    total: 0
                }
                const target = $(param.selector)
                const title = $(param.titleSelector).text()
                result.template = target.attr(param.attr) as string

                result.total = param.next ? +($(param.next, target).text()) : +target.text()
                result.foldName = title.trim().replace(/\s/g, '')
                return result
            }

        } else {  // 分类
            if (!$(param.selector).length) {
                const error = `未找到要查询的【分类】元素，page：${ param.site }，selector：${ param.selector },type:${ param.type }`
                console.warn(error)
                Assistant.errorLog(error)
                return null;

            } else {
                const result: ICategoryResult[] = []
                const templateResults = $(param.selector)
                // @ts-ignore
                for (const link of templateResults) {
                    const title = $(param.titleSelector).text() || $(link).text() || $(param.titleSelector, $(link)).text() as string
                    console.log(title)
                    result.push({
                        link: $(link).attr(param.attr) as string,
                        foldName: title.trim().replace(/\s/g, '')
                    })
                }
                return result;
            }

        }
    }
}

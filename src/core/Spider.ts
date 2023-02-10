/**
 * @CreateTime: 2023/02/01 02:06
 * @Project: capture-images
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/capture-images
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
            return this.assemblyLine(site, workFlows, path).then(r => r.flat()).catch(e => e)
        } else {
            console.warn('必须指定一个入口站点')
        }
    }

    /**
     * 根据workflow自动运行的流水线
     * @param site
     * @param workflows
     * @param path
     * @private
     */
    private static assemblyLine(site, workflows: IWorkFlow[], path: string = DEFAULT_DIST) {
        if (workflows.length) {
            const workflow = workflows.shift() as IWorkFlow
            return this.action(site, workflow as IWorkFlow).then( result => {
                if (Object.is(workflow?.type, 'category')) {
                    const categoryTasks = (result as ICategoryResult[]).filter(item => ("included" in workflow && workflow.included?.includes(item.link) ) || ("excluded" in workflow && !workflow.excluded?.includes(item.link)) || item ).map(item => {
                        let savePath: string
                        if (!Object.is(basename(path), item.foldName)) {
                            savePath = Assistant.createFolder(item.foldName, path)
                        } else {
                            savePath = path
                        }
                        return this.assemblyLine(item.link, [ ...workflows ], savePath)
                    })
                    return Promise.all(categoryTasks).then(r =>  r.flat()).catch(e => e)
                }  else {
                    if ('reg' in workflow) {
                        const paginationTasks = new Array((result as  IPaginationResult).total).fill(0).map((item,index) => {
                            // 根据结果得到文件夹名
                            let savePath: string
                            if (!Object.is(basename(path), (result as  IPaginationResult).foldName)) { // 给的保存路径不包含文件夹名，则创建文件夹
                                savePath = Assistant.createFolder((result as  IPaginationResult).foldName, path)
                            } else {
                                // 给的保存路径包含文件夹名，文件夹则用路径
                                savePath = path
                            }
                            if (Object.is((result as  IPaginationResult).total, 1)) {
                                // 如果只有一页，说明无法分页，直接将模版用来作为分类页
                                return this.assemblyLine((result as  IPaginationResult).template, [ ...workflows ], savePath)
                            }else {
                                // 遍历置换分页页码网址
                                const str = workflow.reg + (result as  IPaginationResult).total.toString()
                                const link = (result as  IPaginationResult).template.replace(new RegExp(str), workflow.reg + (index + 1).toString())
                                return this.assemblyLine(link, [ ...workflows ], savePath)
                            }
                        })
                        return Promise.all(paginationTasks).then(r => r.flat()).catch(e => e)
                    } else {
                        return Promise.reject(`分页workflow 缺少正则 ${ workflow }`)
                    }
                }
            }).catch( e => e)
        } else {
            // 下载图片页面
            return Assistant.request(site, false, path)
        }
    }

    /**
     * 获得所有分页或分类页面
     * @param site url
     * @param option workflow
     */
    public static action(site: string, option: IWorkFlow) {
        return Assistant.request(site).then(siteHtml => {
            return this.resolveSite({
                site,
                siteHtml,
                ...option
            })
        }).catch(e => Promise.reject(e))
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
    public static async resolveSite(param: IResolveParam): Promise<ICategoryResult[] | IPaginationResult >{
        console.log(`********开始解析 ${ param.site } ********`)
        // 解析的是非图片地址
        const picArr = [ '.jpg', '.jpeg', '.gif', '.webp', '.bmp' ]
        const ext = extname(param.site)
        if (picArr.includes(ext)) {
            return [ {
                foldName: `onlyPhoto-${param.site}`,
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
                    Assistant.errorLog(error)
                    return Promise.reject(error)
                } else {
                    // 没有找到分页标识，说明只有单页面
                    return {
                        foldName: $(param.titleSelector).text().trim().replace(/\s/g, ''),
                        template: param.site,
                        total: 1
                    }
                }
            } else {
                // 分页有多页
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
                return Promise.resolve(result)
            }

        } else {  // 分类
            if (!$(param.selector).length) {
                const error = `未找到要查询的【分类】元素，page：${ param.site }，selector：${ param.selector },type:${ param.type }`
                Assistant.errorLog(error)
                return Promise.reject(error)
            } else {
                const result: ICategoryResult[] = []
                const templateResults = $(param.selector)
                // @ts-ignore
                for (const link of templateResults) {
                    const title = $(link).text() || $(param.titleSelector, $(link)).text() || $(param.titleSelector).text()
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

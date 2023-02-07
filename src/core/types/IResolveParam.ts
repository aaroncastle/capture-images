/**
 * @CreateTime: 2023/02/01 22:13
 * @Project: captureImages
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/captureImages
 */
import { IOperation } from "./IOperation.js";

export interface IResolveParam{
    site: string;
    siteHtml: string;
    selector: string;
    titleSelector:string;
    next?: string;
    reg?: string;
    excluded?: string[];
    included?: string[];
    attr: string; // 链接的属性一般为href,图片一般为src
    type: IOperation
}

/**
 * @CreateTime: 2023/02/04 14:25
 * @Project: captureImages
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/captureImages
 */
import { IOperation } from "./IOperation.js";

export interface IWorkFlow{
    type: IOperation;
    selector: string;
    titleSelector:string;
    attr: string;
    excluded?: string[];
    included?: string[];
    reg?:string;
    next?: string
}

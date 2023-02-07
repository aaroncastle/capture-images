/**
 * @CreateTime: 2023/02/01 01:56
 * @Project: captureImages
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/captureImages
 */


import { Spider } from "./core/Spider.js";


const entry = 'https://www.photos.com/cars/page/68'

await Spider.entry(entry,3)

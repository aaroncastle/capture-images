/**
 * @CreateTime: 2023/02/01 01:56
 * @Project: capture-images
 * @Author: aaroncastle
 * @GitHub: https://github.com/aaroncastle/capture-images
 */


import { Spider } from "./core/Spider.js";


const entry = 'https://www.photos.com/cars/page/68'

await Spider.entry(entry,3)

/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

/**
 * 基于数组原型对象创建新的对象
 * 覆写 数组原型方法 增强功能 具有依赖通知更新能力
 */
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 遍历
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]

  /**
   * 在 arrayMethods 对象上定义 这7个方法
   * 定义后，执行arr.push(...)方法 就是这里 function方法
   */
  def(arrayMethods, method, function mutator (...args) {

    // 先执行原生的数组方法
    const result = original.apply(this, args)

    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }

    // 如果执行 push unshift splice 操作的话，进行响应式处理
    if (inserted) ob.observeArray(inserted)
    // notify change

    // 依赖通知更新
    ob.dep.notify()
    return result
  })
})

/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  console.log('【initMixin方法】')
  // 初始化Vue的过程
  Vue.prototype._init = function (options?: Object) {
    console.log('【_init 初始化】')

    // vue实例
    const vm: Component = this


    /**
     * 有时候容易重复编译，所以要记得保存当前编译实例的id
     * 每个Vue实例都会有一个递增的_uid
     */

    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      /**
       * _isComponent 在Vue创建组件时用到
       * 对每个子组件初始化时做一些性能优化
       * 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
       */
      initInternalComponent(vm, options)
    } else {
      /**
       * 初始化根组件时走这里，合并 Vue 的全局配置到根组件的局部配置，比如 Vue.component 注册的全局组件会合并到 根实例的 components 选项中
       * 至于每个子组件的选项合并则发生在两个地方：
       *   1、Vue.component 方法注册的全局组件在注册时做了选项合并
       *   2、{ components: { xx } } 方式注册的局部组件在执行编译器生成的 render 函数时做了选项合并，包括根组件中的 components 配置
       */
      vm.$options = mergeOptions(
        /**
         * 使用Vue.extend可以创建一个Vue的子类构造器
         * resolveConstructorOptions函数的作用主要是在父类构造器的选项发生改变时，重新获取构造器当前构造器的选项。
         *
         */
        resolveConstructorOptions(vm.constructor), // Vue.option 静态属性
        options || {}, // new Vue(Data)
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化组件实例关系属性，都是私有属性，比如 $parent、$children、$root、$refs 、_watcher等
    initLifecycle(vm)

    /**
     * 处理listeners
     * 初始化自定义事件，这里需要注意一点，所以我们在 <comp @click="handleClick" /> 上注册的事件，监听者不是父组件，
     * 而是子组件本身，也就是说事件的派发和监听者都是子组件本身，和父组件无关
     */
    initEvents(vm)

    // 解析组件的插槽信息，得到 vm.$slot，处理渲染函数，得到 vm.$createElement 方法，即 h 函数
    initRender(vm)

    // 调用 beforeCreate钩子函数，判断是否有参数，通过call 和 apply执行
    console.log('%c【 callHook(vm, \'beforeCreate\')】', 'color: green')
    callHook(vm, 'beforeCreate')

    // 遍历injection，然后一层层往上找provide，找到对应的值返回，同时把inject变成响应式
    initInjections(vm) // resolve injections before data/props

    /**
     * 对vue实例中的 props, methods, data, computed 和 watch 数据进行初始化。
     * data 注册成响应向式
     */
    initState(vm)

    // 解析组件配置项上的 provide 对象，将其挂载到 vm._provided 属性上
    initProvide(vm) // resolve provide after data/props

   // 调用 created 钩子函数
    console.log('%c【callHook(vm, \'created\')】', 'color: green')
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 配置项上有 el 选项，则自动调用 $mount 方法； 反之，没有 el 则必须手动调用 $mount

    console.log('【执行Vue.prototype.$mount 方法】')
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 主要做了两件事情：
 * 1.指定组件$options原型，
 * 2.把组件依赖于父组件的props、listeners也挂载到options上，方便子组件调用
 *
 * 方法接受两个参数:
 * 第一个参数是组件实例，即 this
 * 第二个参数是组件构造函数中传入的 option，
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {

  // 把组件构造函数的options挂载到vm.$options的__proto__上。
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.


  /**
   * 这里 打平了配置对象上属，方便原型链查找 提高运行时效率
   * @type {Vue.VNode}
   */
  const parentVnode = options._parentVnode // _parentVnode就是 <button-counter @imt="getIncrementTotal"></button-counter>生成的一个Vnode对象。
  opts.parent = options.parent // 组件的根实例
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  // 有render函数 赋值到$options
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}

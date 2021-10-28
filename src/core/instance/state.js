/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/*
将 key 代理到 vue实例中
 */
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }

  // 拦截 对 this.key 的访问
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 入口
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  /**
   * initProps干了两件事
   * 1 对props 做响应式处理
   * 2 代理props 配置上的 key 到 vue 实例，支持 this.propKey 访问
   */
  if (opts.props) initProps(vm, opts.props)

  // 方法处理 做了 判重
  if (opts.methods) initMethods(vm, opts.methods)


  if (opts.data) {
    /**
     * 1 判重处理
     * 2 代理
     * 3 响应式
     */
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }

  /**
   * 1 computed 通过 watcher 来实现的, 对每个computedKey 实例化一个 watcher， 默认执行
   * 2 将 computedKey 代理到 vue实例上， 支持 this.computedKey 方式访问 computed.key
   * 3 computed缓存的实现原理
   */
  if (opts.computed) initComputed(vm, opts.computed)


  // 实例化一个watch 实例， 并返回一个unwatch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }

  /**
   * computed 与 watcher 区别
   * computed 默认执行 且不可更改 ， watcher可配置
   * 使用场景不同：
   * 1 watcher 会有执行异步的操作
   * 2 computed 同步操作，如果执行异步 返回的是一个 [object promise]
   */
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {

      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  // 判断 data 是函数还是对象
  data = vm._data = typeof data === 'function' ? getData(data, vm) : data || {}


  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length


  while (i--) {
    const key = keys[i]

    /**
     * 判重处理 data 中属性 不能与 props 、methods 中的属性重复
     */
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 代理 data 中的属性到 vue 实例 支持通过 this.key 访问
      proxy(vm, `_data`, key)
    }
  }

  // 这里 响应式处理
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  //  遍历该对象
  for (const key in computed) {
    const userDef = computed[key]

    // computed 是对函数 还是对象
    /**
     compute: {
        name(){}
     }
     */
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    /**
     *   创建一个计算属性 watcher
     *   computed 原理就是通过watcher来实现的
     */
    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      // 如果定义的计算属性不在组件实例上，对属性进行数据劫持
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      // 如果定义的计算属性在data和props有，抛出警告
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 将 computed 配置项中的 key 代理到 vue实例上 支持通过 this.computedKey 的方式去访问
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]

    /**
     * 拿到 watcher
     * 执行 computed.key 的值（方法） 得到结果 赋值给watcher.value
     * watcher.dirty 设为false
     */
    if (watcher) {

      // computed 的缓存原理 只执行一次computed 函数，后续访问不会再执行，直到下次更新后（watcher.update）再会执行
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }

      // 拿结果
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}


function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      // methods 中的key(方法名) 不能与 props中的 key 重复
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 将 methods 中所有方法赋值到 vue 实例上 支持通过 this.methodKey 方式访问定义的方法
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}


function initWatch (vm: Component, watch: Object) {
  // 遍历 watch
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/**
  https://cn.vuejs.org/v2/api/#watch
  watch 的属性 有 { [key: string]: string | Function | Object | Array } 4种类型
 */
function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // 做一些类型判断
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }

  /**
   * Vue.prototype.$watch
   * 实例方法 this.$watch
   */
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  console.log('【stateMixin方法】')
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.

  /**
   * 重写 data 和 props get和set方法
   *
   * 防止直接赋值, 比如： vm.$data = {} vm.$props = {} 发出警告
   *
   */

  const dataDef = {}
  dataDef.get = function () { return this._data }

  const propsDef = {}
  propsDef.get = function () { return this._props }

  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }

    // props是只读的
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }

  // 将 data 和 props
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  // 实例上的this.$set this.$del 全局API Vue.set 和 Vel.del 别名
  Vue.prototype.$set = set
  Vue.prototype.$delete = del


  // this.$watch
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this

    // 处理cb是对象的情况，保证 后续处理中 cb 肯定是函数
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }

    options = options || {}

    // 标记 这是一个用户watcher
    options.user = true

    // 实例化watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)

    // 存在immediate 立即执行
    if (options.immediate) {
      pushTarget()
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
      popTarget()
    }

    // 返回一个 watch
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * Vue 构造函数
 * 可以看到Vue其实就是一个函数，那为什么不用Class来写呢？
 * 主要是方便扩展，Vue这个对象有很多方法，很多需要放在不同的模块来写，在不同的模块只要在vue的prototype上去添加方法就好了。
 * 如果是Class，不好添加了，只能在一个Class上添加，继承的话调用的也是其他Class，所以采用构造函数的形式。
 */
function Vue (options) {
  console.log('【Vue 构造函数】')
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  console.log('Vue config', Vue.config)
  //调用 Vue.prototype._init 方法，该方法在 initMixin 中定义
  this._init(options)
}

// 入口
initMixin(Vue)

/**
 * 定义：
 *   Vue.prototype.$data
 *   Vue.prototype.$props
 *   Vue.prototype.$set
 *   Vue.prototype.$delete
 *   Vue.prototype.$watch
 */
stateMixin(Vue)

/**
 * 定义 事件相关的 方法：
 *   Vue.prototype.$on
 *   Vue.prototype.$once
 *   Vue.prototype.$off
 *   Vue.prototype.$emit
 */
eventsMixin(Vue)

/**
 * 定义：
 *   Vue.prototype._update
 *   Vue.prototype.$forceUpdate
 *   Vue.prototype.$destroy
 */
lifecycleMixin(Vue)

/**
 * 执行 installRenderHelpers，在 Vue.prototype 对象上安装运行时便利程序
 *
 * 定义：
 *   Vue.prototype.$nextTick
 *   Vue.prototype._render
 */
renderMixin(Vue)

export default Vue

/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
/**
 * $mount 备份
 * 方法在runtime/index.js 中
 */
const mount = Vue.prototype.$mount

// 重写$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {

  console.log('【Vue.prototype.$mount 方法】', el)

  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  /**
   * el template render 优先级 render > template > el
   * @type {ComponentOptions<Vue>}
   */

  const options = this.$options
  // resolve template/el and convert to render function

  /**
   * 配置选项中是否有render函数
   */
  if (!options.render) {

    // 不带render函数处理
    let template = options.template

    if (template) {
      if (typeof template === 'string') {

        // #app
        if (template.charAt(0) === '#') {

          // 得到innerHTML
          template = idToTemplate(template)


          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 得到innerHTML
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // outerHTML
      /**
       *  <div id="#app"> <h1>Vue</h1> </div>
       * innerHTML（里面的内容）:  <h1>Vue</h1>
       * outerHTML（整个的内容）: <div id="#app"> <h1>Vue</h1> </div>
       *
       *
       */
      template = getOuterHTML(el)
    }

    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      /**
       * 模版就绪 开始编译 得到 动态渲染函数和静态渲染函数
       *
       * template: "<div id="app">...</div>"
       */
      const { render, staticRenderFns } = compileToFunctions(template, {
        // 非生产环境下，编译时记录标签属性在模版字符串中开始和结束的位置索引
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,

        // 界定符，默认 {{}}
        delimiters: options.delimiters,
        // 是否保留注释
        comments: options.comments
      }, this)

      // 将两个渲染函数放到 this.$options 上
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  // 执行挂载 执行备份mount方法
  console.log('【执行挂载 mount.call(this, el, hydrating)】')
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue

## Vue 源码学习

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vue.js example</title>
</head>
<body>
<div id="app">
  <h1>{{ msg }}</h1>
  <h2>Hello</h2>
</div>
<script src="../dist/vue.js"></script>
<script>

 const App =  new Vue({
   el: '#app',
   data () {
     return {
       msg: 'Hello Chris, I am your father',
       hit: 'I will hit you if you do not study',
     }
   }
  })
  console.dir(App)


 var template = `<div id="app">
  <h1>{{ msg }}</h1>
  <h2>Hello</h2>
</div>`

 console.log(template.length)

</script>
</body>
</html>

```
# 深入浅出WebAssembly（二）——动态链接	

# 前言

在讲述WebAssembly之中的动态链接之前，我们还需要探究一些基本问题，比如什么是动态链接？动态链接到底是解决什么问题的？通过今天的文章，你将会学习到如何在WebAssembly之中使用动态链接技术。



# 什么是动态链接

动态链接的对立面是静态链接，我们先从静态链接讲起。

## 静态链接

我们使用C语言等编译型语言开发一个程序时，通常会经过这样的几个步骤：预处理 -> 编译 -> 链接 -> 可执行文件。



我们不妨思考一下，为什么需要经过“链接”。为什么不能直接编译后就生成可执行文件。如果没有链接过程的话，想象一下这样的一个场景：

我们的一个程序具有上百万行的代码量，每次我们修改代码都需要将所有的代码完整的编译一次。这样耗费的时间是巨大的。这在调试阶段对于时间来说是巨大的浪费！而有了链接过程，我们可以将整个程序的分为多个文件，修改哪个文件就之需要单独编译那个文件。最后再通过链接阶段将所有编译后的程序链接在一起，提高了我们的开发效率。



## 动态链接

那既然有了静态链接，那为什么又需要动态链接呢？想象一下，我们开发的程序中都包含了某个通用的库，那么我们开发的每个程序都需要完整的将这个库包含到程序代码中，这造成了程序的臃肿。



所以动态链接的优点之一就是可以在多个程序之间共享，这使得相同的库可以被多个程序重复使用，从而减少了代码重复和磁盘空间的浪费。程序在动态链接时不需要包含所有依赖库的代码和数据，这导致生成的可执行文件通常较小。这可以减少下载和部署的时间。



## JavaScript中的“动态链接”

首先需要声明的是在JavaScript，通常不存在动态链接的概念。那么我们再看一下动态链接的特点，动态链接库具有共享性的特点。如果放在前端的场景中，可能是如下的场景：

![image-20231016110146436](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231016110146436.png)



业务代码A和业务代码B分别是属于两个项目，它们都引用了`core.js`这一基础库，它们在开发时通常会将 `core.js`标记为devDependencies，并且会在最终打包的时候将其排除出去，我们只需要在最终开发项目C的时候将core.js作为 dependencies引入即可。这样就保证了 `core.js`在最终的项目代码中只有1份。



所以，对于JavaScript来说，它是天生就支持“动态链接”的。因为JavaScript是一种解释性语言，其代码通常在运行时由 JavaScript 引擎解释执行，而不需要编译和链接的过程。JavaScript的依赖关系通常是通过引入外部脚本文件（如JavaScript文件）来实现的，这些文件在运行时加载并执行。



## 基于表的WASM模块动态链接

通过上面对于JavaScript“动态链接”的解释，我们可以简单的认为使用动态链接技术是为了让一个模块能够调用另外一个模块的函数。

接下来我们通过一个简单的实力来进一步了解WASM模块动态链接的全过程。



我们编写两个WASM模块，一个为 `util.wasm` 其中导出了 `add`, `sub`, `mul`三个函数，然后我们在另外一个WASM模块中调用`util.wasm`中的函数。

*util.wat*

```wat
(module
    (func $add32 (param $a i32) (param $b i32) (result i32)
        local.get $a
        local.get $b
        i32.add
        return    
    )
    (func $sub32 (param $a i32) (param $b i32) (result i32)
        local.get $a
        local.get $b
        i32.sub
        return    
    )

    (func $mul32 (param $a i32) (param $b i32) (result i32)
        local.get $a
        local.get $b
        i32.mul
        return    
    )

    (export "add" (func $add32))
    (export "sub" (func $sub32))
    (export "mul" (func $mul32))
)
```



*table.wat*

```wat
(module
    (import "js" "table" (table $tbl 1 funcref))
    (import "env" "log" (func $log (param i32)))
    (type $f_void_void (func (param i32) (param i32) (result i32))) 
    (func $main (param $1 i32) (param $2 i32)
        local.get $1
        local.get $2
        
        (call_indirect $tbl (type $f_void_void) (i32.const 0))

        call $log
    )
    (export "test" (func $main))
)
```

我们将重点放在 `table.wat`中的 `call_indirect`方法，注意，我们之前调用外部传入的函数使用 `call` 函数。不过 `call`函数只能调用 静态定义的函数。所谓的静态定义的函数就是 wat 文件中定义的函数或者是 通过import外部导入的函数。



而 `call_indirect`是调用的table中的函数。table中的函数是可以**动态改变**的。

我们先来解释一下 `call_indirect`指令

它的作用是调用table中的函数。其语法如下：

```
call_indirect $table_id (type $type_id) TABLE_INDEX)
```



所以说 `(call_indirect $tbl (type $f_void_void) (i32.const 0))` 的意思是调用Table表中的第0个函数，函数的签名为 `$f_void_void (func (param i32) (param i32) (result i32))`



因为我们不知道Table表中的函数的函数体，但是我们需要知道函数的参数类型和返回类型。否则无法通过类型检查。



接下来我们看一下如何在JS中使用，先常规加载第一个 `util.wasm`WASM模块

```typescript
const instance = await fetchAndInstantiate(withBase('/wasm/util.wasm'));
```

我们需要往第二个WASM模块中导入Table对象，当然我们也可以不从外部导入，我们也可以在wat文件中直接声明。



```typescript
const table = new WebAssembly.Table({
        initial: 2,
        element: 'anyfunc',
    });

const i2 = await fetchAndInstantiate(withBase('/wasm/table.wasm'), {
    js: {
        table: table,
    },
    env: {
        log: console.log,
    },
});
```



我们可以通过`Table.set`方法往Table对象中写入函数，注意该函数必须是WASM模块中的函数。否则浏览器会报错

![image-20231016135529502](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231016135529502.png)

```typescript
table.set(0, instance.exports.add)
i2.exports.test(3, 5);
```

此时浏览器控制台中输出 8



我们可以动态的修改Table对象中的函数：

```typescript
table.set(0, instance.exports.mul);
i2.exports.test(3, 5)
```

此时浏览器控制台中输出15。



两个模块的关系可以用下面的关系图表示：

![image-20231016140406761](https://picbed-1255660905.cos.ap-chengdu.myqcloud.com/image-20231016140406761.png)

# 小结

WebAssembly下的动态链接过程依赖WASM模块所独有的几个特性：

1. 包括共享线性内存在内的多种段结构对象都可以自由的导入导出
2. 独特的Table段结构可以用来存放标准中允许的任何不透明值类型

通过使用动态链接技术，能够减小WASM模块对应的二进制文件的大小，而且将公用部分的代码功能提取出来也会在一定程度上减少公共资源被加载到内存中生成副本的数量。


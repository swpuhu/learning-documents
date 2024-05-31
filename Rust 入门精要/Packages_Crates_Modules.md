# Packages Crates and Modules

`crate`是Rust编译器在一次编译时的最小代码单元。即便你通过`rustc`命令编译一个文件，该文件则被认为是一个`crate`



crate拥有两种形式：

1. Binary crate
   1. 该crate你可以编译成可执行程序，例如命令行程序或服务程序，每一个crate都有一个叫`main`函数
2. library crate
   1. 该crate没有 `main`函数，它们通常用为多个项目提供一些实用的函数。





# 约定

1. 每个package中可以有任意数量的binary crate，但是最多只能有一个library crate
2. src/main.rs 是跟项目名字相同的Binary crate的默认根文件。
3. src/lib.rs 是跟项目名字相同的library crate的默认根文件。
4. 要创建多个binary crate可以将文件放置在 `src/bin`目录下，该目录下的每个文件都将被编译成一个 `binary crate`



## Module机制

1. 声明Module：如果你在根文件中使用了 `mod garden`，编译器则会在以下3个地方查找module的代码。
   1. 内联模块代码，在`mod garden`后面紧跟的花括号中。
   2. 在 `src/garden.rs`中
   3. 在 `src/garden/mod.rs`中
2. 声明submodule：除开根文件以外的文件中使用模块声明语法`mod vegetables`，编译器则会在以下3个地方查找submodule
   1. 内联
   2. 在 `src/garden/vegetables.rs`中
   3. 在 `src/garden/vegetables/mod.rs`中
3. 模块中的路径：一旦模块成为crate的一部分之后，你可以在相同的crate中的任意地方引用这个模块中的代码。
4. `use`关键字：用于减少重复的路径名，比如 `crate::graden::vegetables::Asparagus`你可以使用`use crate::graden::vegetables::Asparagus`来简化代码，后续你可以直接使用 `Asparagus`

# 包管理

Rust通过 `Cargo.toml`文件来管理第三方库。类似与 npm的 `package.json`



引用第三方包

```rust
use std::cmp::Ordering
use std::io::Write
use std::io
use rand::Rng
```

一些简写方式

```rust
use std::io::{self, Write}
```

引入所有

```rust
use std::collections::*
```

